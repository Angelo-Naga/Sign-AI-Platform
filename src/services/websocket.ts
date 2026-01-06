/**
 * WebSocket连接管理
 * 提供统一的WebSocket通信接口
 */

import { useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  WSConfig,
  WSEventHandlers,
  WSConnectionState,
  WSStatistics,
  SignWSMessage,
  VoiceWSMessage,
  TranslationWSMessage 
} from '../types/websocket';

/**
 * WebSocket客户端类
 */
export class WSClient<T = unknown> {
  /** Socket实例 */
  private socket: Socket | null = null;
  
  /** 连接配置 */
  private config: WSConfig;
  
  /** 连接状态 */
  private state: WSConnectionState = 'disconnected';
  
  /** 事件处理器 */
  private handlers: WSEventHandlers = {};
  
  /** 统计信息 */
  private statistics: WSStatistics = {
    connectedAt: 0,
    messagesSent: 0,
    messagesReceived: 0,
    avgLatency: 0,
    maxLatency: 0,
    minLatency: Infinity,
    reconnectCount: 0,
    disconnectCount: 0,
  };
  
  /** 心跳定时器 */
  private heartbeatTimer: number | null = null;
  
  /** 重连定时器 */
  private reconnectTimer: number | null = null;
  
  /** 重连尝试次数 */
  private reconnectAttempts = 0;
  
  /** 发送消息队列 */
  private messageQueue: T[] = [];

  constructor(config: WSConfig) {
    this.config = {
      autoReconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  /**
   * 连接WebSocket
   */
  connect(): void {
    if (this.state === 'connected' || this.state === 'connecting') {
      console.warn('WebSocket已经连接或正在连接中');
      return;
    }

    this.state = 'connecting';
    console.log('正在连接WebSocket:', this.config.url);

    try {
      this.socket = io(this.config.url, {
        timeout: 10000,
        reconnection: false, // 禁用自动重连，使用自定义重连逻辑
        transports: ['websocket', 'polling'],
        query: {
          type: this.config.type,
          sessionId: this.config.sessionId,
          token: this.config.token || '',
        },
      });

      // 连接建立事件
      this.socket.on('connect', () => {
        this.state = 'connected';
        this.statistics.connectedAt = Date.now();
        this.reconnectAttempts = 0;
        
        console.log('WebSocket连接成功');
        this.handlers.onOpen?.(new Event('open'));
        
        // 发送队列中的消息
        this.flushMessageQueue();
        
        // 启动心跳
        this.startHeartbeat();
      });

      // 连接关闭事件
      this.socket.on('disconnect', (reason: string) => {
        this.state = 'disconnected';
        this.statistics.disconnectCount++;
        
        console.log('WebSocket连接关闭:', reason);
        this.handlers.onClose?.({ code: 1000, reason } as CloseEvent);
        
        // 停止心跳
        this.stopHeartbeat();
        
        // 自动重连
        if (this.config.autoReconnect && reason !== 'io client disconnect') {
          this.scheduleReconnect();
        }
      });

      // 连接错误事件
      this.socket.on('connect_error', (error: Error) => {
        this.state = 'error';
        console.error('WebSocket连接错误:', error);
        this.handlers.onError?.(new Event('error'));
        
        // 自动重连
        if (this.config.autoReconnect) {
          this.scheduleReconnect();
        }
      });

      // 接收消息事件
      this.socket.on('message', (data: T) => {
        this.statistics.messagesReceived++;
        this.handlers.onMessage?.(new MessageEvent('message', { data }));
      });

      // 接收事件
      this.socket.on('data', (data: T) => {
        this.statistics.messagesReceived++;
        this.handlers.onMessage?.(new MessageEvent('message', { data }));
      });

    } catch (error) {
      this.state = 'error';
      console.error('WebSocket连接失败:', error);
      this.handlers.onError?.(new Event('error'));
    }
  }

  /**
   * 断开WebSocket连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.state = 'disconnected';
    this.handlers.onDisconnect?.();
  }

  /**
   * 发送消息
   */
  send(data: T): void {
    if (!this.socket || this.state !== 'connected') {
      // 连接未建立，加入队列
      this.messageQueue.push(data);
      return;
    }
    
    try {
      this.socket.emit('message', data);
      this.statistics.messagesSent++;
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  }

  /**
   * 获取连接状态
   */
  getState(): WSConnectionState {
    return this.state;
  }

  /**
   * 获取统计信息
   */
  getStatistics(): WSStatistics {
    return { ...this.statistics };
  }

  /**
   * 设置事件处理器
   */
  on(handlers: Partial<WSEventHandlers>): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * 计划重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 5)) {
      console.error('已达到最大重连次数');
      return;
    }
    
    this.state = 'reconnecting';
    this.reconnectAttempts++;
    
    console.log(`计划第${this.reconnectAttempts}次重连...`);
    this.handlers.onReconnect?.(this.reconnectAttempts);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval || 3000);
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket && this.state === 'connected') {
        this.socket.emit('ping', { timestamp: Date.now() });
      }
    }, this.config.heartbeatInterval || 30000);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 清空消息队列
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }
}

/**
 * 创建手语识别WebSocket客户端
 */
export function createSignWSClient(config: WSConfig): WSClient<SignWSMessage> {
  return new WSClient<SignWSMessage>({
    ...config,
    type: 'sign_recognition',
  });
}

/**
 * 创建语音处理WebSocket客户端
 */
export function createVoiceWSClient(config: WSConfig): WSClient<VoiceWSMessage> {
  return new WSClient<VoiceWSMessage>({
    ...config,
    type: 'voice_processing',
  });
}

/**
 * 创建翻译WebSocket客户端
 */
export function createTranslationWSClient(config: WSConfig): WSClient<TranslationWSMessage> {
  return new WSClient<TranslationWSMessage>({
    ...config,
    type: 'translation',
  });
}

/**
 * 生成会话ID
 */
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * WebSocket Hook
 * 提供 WebSocket 客户端管理的 Hook
 */
export function useWsClient(config?: WSConfig): WSClient<unknown> {
  const wsClientRef = useRef<WSClient<unknown> | null>(null);

  // 组件挂载时初始化客户端
  useEffect(() => {
    if (!wsClientRef.current && config) {
      wsClientRef.current = new WSClient(config);
    }

    return () => {
      // 组件卸载时断开连接
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }
    };
  }, [config]);

  return wsClientRef.current!;
}