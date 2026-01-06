/**
 * 视频流发送器
 * 负责通过 WebSocket 发送视频流，包括帧缓冲管理、发送频率控制、网络自适应和重连机制
 */

// 使用浏览器原生的 WebSocket
import { VideoFrame, VideoProcessor } from '../utils/videoProcessor';
import { NETWORK_CONFIG, PERFORMANCE_CONFIG } from '../config/streamConfig';

/**
 * 视频流发送器配置
 */
export interface VideoStreamConfig {
  url: string; // WebSocket 服务器 URL
  reconnectDelay?: number; // 重连延迟
  maxReconnectAttempts?: number; // 最大重连次数
  enableAdaptiveQuality?: boolean; // 是否启用自适应质量
  targetLatency?: number; // 目标延迟（毫秒）
}

/**
 * 发送状态接口
 */
export interface SendState {
  isConnected: boolean; // 是否已连接
  isSending: boolean; // 是否正在发送
  totalFrames: number; // 总发送帧数
  bytesSent: number; // 已发送字节数
  avgLatency: number; // 平均延迟
  quality: number; // 当前质量
  frameRate: number; // 当前帧率
  reconnectAttempts: number; // 重连尝试次数
}

/**
 * 视频流发送器类
 */
export class VideoStreamSender {
  private ws: WebSocket | null;
  private config: VideoStreamConfig;
  private videoProcessor: VideoProcessor | null;
  private sendQueue: VideoFrame[];
  private state: SendState;
  private sendInterval: number | null;
  private heartbeatInterval: number | null;
  private qualityCheckInterval: number | null;
  private latencyHistory: number[];
  private isConnecting: boolean;
  private shouldReconnect: boolean;

  /**
   * 构造函数
   * @param config 发送器配置
   * @param videoProcessor 视频处理器
   */
  constructor(config: VideoStreamConfig, videoProcessor?: VideoProcessor) {
    this.config = {
      reconnectDelay: NETWORK_CONFIG.reconnectDelay,
      maxReconnectAttempts: NETWORK_CONFIG.maxReconnectAttempts,
      enableAdaptiveQuality: true,
      targetLatency: 100,
      ...config,
    };

    this.videoProcessor = videoProcessor || null;
    this.ws = null;
    this.sendQueue = [];
    this.latencyHistory = [];
    this.isConnecting = false;
    this.shouldReconnect = true;
    this.sendInterval = null;
    this.heartbeatInterval = null;
    this.qualityCheckInterval = null;

    this.state = {
      isConnected: false,
      isSending: false,
      totalFrames: 0,
      bytesSent: 0,
      avgLatency: 0,
      quality: 1.0,
      frameRate: PERFORMANCE_CONFIG.targetFrameRate,
      reconnectAttempts: 0,
    };
  }

  /**
   * 连接到 WebSocket 服务器
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('正在连接中'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.state.isConnected = true;
          this.state.reconnectAttempts = 0;
          this.latencyHistory = [];

          // 启动心跳
          this.startHeartbeat();

          // 启动发送队列
          this.startSending();

          // 启动质量检查
          if (this.config.enableAdaptiveQuality) {
            this.startQualityCheck();
          }

          console.log('视频流发送器已连接');
          resolve();
        };

        this.ws.onclose = (event: CloseEvent) => {
          this.isConnecting = false;
          this.state.isConnected = false;
          this.stopHeartbeat();
          this.stopQualityCheck();

          console.log(`视频流发送器已断开: ${event.code} - ${event.reason}`);

          // 自动重连
          if (this.shouldReconnect && this.state.reconnectAttempts < (this.config.maxReconnectAttempts || 0)) {
            this.state.reconnectAttempts++;
            const delay = this.config.reconnectDelay;

            console.log(`${delay}ms 后尝试重连 (${this.state.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

            setTimeout(() => {
              this.connect().catch((error) => {
                console.error('重连失败:', error);
              });
            }, delay);
          }
        };

        this.ws.onerror = (error: Event) => {
          this.isConnecting = false;
          console.error('WebSocket 错误:', error);
          reject(error);
        };

        this.ws.onmessage = async (event: MessageEvent) => {
          await this.handleMessage(event);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    this.shouldReconnect = false;
    this.stopSending();
    this.stopHeartbeat();
    this.stopQualityCheck();
    this.sendQueue = [];

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.state.isConnected = false;
    this.state.isSending = false;

    console.log('视频流发送器已断开');
  }

  /**
   * 添加视频帧到发送队列
   * @param frame 视频帧
   */
  public addFrame(frame: VideoFrame): void {
    if (!this.state.isConnected) {
      return;
    }

    // 检查队列大小
    if (this.sendQueue.length >= NETWORK_CONFIG.maxQueueSize) {
      // 队列已满，根据策略丢弃帧
      if (PERFORMANCE_CONFIG.dropStrategy === 'newest') {
        this.sendQueue.shift();
      } else {
        return; // 丢弃新帧
      }
    }

    this.sendQueue.push(frame);
  }

  /**
   * 批量添加视频帧
   * @param frames 视频帧数组
   */
  public addFrames(frames: VideoFrame[]): void {
    frames.forEach((frame) => this.addFrame(frame));
  }

  /**
   * 启动发送队列处理
   */
  private startSending(): void {
    if (this.sendInterval !== null) {
      return;
    }

    this.state.isSending = true;
    const interval = 1000 / this.state.frameRate;

    this.sendInterval = window.setInterval(() => {
      this.processSendQueue();
    }, interval);
  }

  /**
   * 停止发送队列处理
   */
  private stopSending(): void {
    if (this.sendInterval !== null) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
    }
    this.state.isSending = false;
  }

  /**
   * 处理发送队列
   */
  private processSendQueue(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.sendQueue.length === 0) {
      return;
    }

    // 从队列中取出一帧
    const frame = this.sendQueue.shift();
    if (!frame) {
      return;
    }

    try {
      const startTime = Date.now();

      // 发送帧数据
      this.sendFrame(frame);

      const endTime = Date.now();
      const latency = endTime - frame.timestamp;

      // 更新延迟历史
      this.updateLatency(latency);

      // 更新统计信息
      this.state.totalFrames++;
      this.state.bytesSent += frame.data.length;

    } catch (error) {
      console.error('发送帧失败:', error);
    }
  }

  /**
   * 发送单个视频帧
   * @param frame 视频帧
   */
  private sendFrame(frame: VideoFrame): void {
    if (!this.ws) {
      return;
    }

    // 构造消息 payload
    const payload = {
      type: 'video_frame',
      data: frame.data,
      timestamp: frame.timestamp,
      sequence: frame.sequence,
      quality: frame.quality,
      width: frame.width,
      height: frame.height,
    };

    // 发送消息
    this.ws.send(JSON.stringify(payload));
  }

  /**
   * 更新延迟历史
   * @param latency 延迟（毫秒）
   */
  private updateLatency(latency: number): void {
    this.latencyHistory.push(latency);

    // 保持历史记录在指定大小内
    const bufferSize = NETWORK_CONFIG.adaptation.bufferSize;
    if (this.latencyHistory.length > bufferSize) {
      this.latencyHistory.shift();
    }

    // 计算平均延迟
    this.state.avgLatency = this.calculateAverageLatency();
  }

  /**
   * 计算平均延迟
   * @returns 平均延迟（毫秒）
   */
  private calculateAverageLatency(): number {
    if (this.latencyHistory.length === 0) {
      return 0;
    }

    const sum = this.latencyHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencyHistory.length);
  }

  /**
   * 处理接收到的消息
   * @param event 消息事件
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'ack':
          // 接收到确认，延迟更准确
          if (message.timestamp) {
            const latency = Date.now() - message.timestamp;
            this.updateLatency(latency);
          }
          break;

        case 'network_quality':
          // 接收服务器返回的网络质量信息
          if (this.config.enableAdaptiveQuality) {
            this.adaptToNetwork(message.latency || this.state.avgLatency);
          }
          break;

        default:
          console.log('未知消息类型:', message.type);
      }
    } catch (error) {
      console.error('处理消息失败:', error);
    }
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      return;
    }

    this.heartbeatInterval = window.setInterval(() => {
      this.sendHeartbeat();
    }, NETWORK_CONFIG.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * 发送心跳
   */
  private sendHeartbeat(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const payload = {
      type: 'heartbeat',
      timestamp: Date.now(),
    };

    try {
      this.ws.send(JSON.stringify(payload));
    } catch (error) {
      console.error('发送心跳失败:', error);
    }
  }

  /**
   * 启动质量检查
   */
  private startQualityCheck(): void {
    if (this.qualityCheckInterval !== null) {
      return;
    }

    this.qualityCheckInterval = window.setInterval(() => {
      this.checkAndAdaptQuality();
    }, NETWORK_CONFIG.qualityCheckInterval);
  }

  /**
   * 停止质量检查
   */
  private stopQualityCheck(): void {
    if (this.qualityCheckInterval !== null) {
      clearInterval(this.qualityCheckInterval);
      this.qualityCheckInterval = null;
    }
  }

  /**
   * 检查并自适应调整质量
   */
  private checkAndAdaptQuality(): void {
    if (!this.videoProcessor) {
      return;
    }

    const latency = this.state.avgLatency;

    // 根据延迟调整视频处理器
    this.videoProcessor.adaptToNetwork(latency);

    // 更新发送状态
    const performanceMetrics = this.videoProcessor.getPerformanceMetrics();
    this.state.quality = performanceMetrics.fps / this.state.frameRate;
    this.state.frameRate = performanceMetrics.fps;

    // 重新设置发送间隔
    if (this.state.isSending) {
      this.stopSending();
      this.startSending();
    }
  }

  /**
   * 根据网络条件自适应调整
   * @param latency 延迟（毫秒）
   */
  private adaptToNetwork(latency: number): void {
    if (!this.videoProcessor) {
      return;
    }

    // 调整视频处理器
    this.videoProcessor.adaptToNetwork(latency);

    console.log(`自适应调整: 延迟=${latency}ms, 帧率=${this.state.frameRate}fps`);
  }

  /**
   * 获取发送状态
   * @returns 发送状态
   */
  public getState(): SendState {
    return { ...this.state };
  }

  /**
   * 获取队列大小
   * @returns 队列大小
   */
  public getQueueSize(): number {
    return this.sendQueue.length;
  }

  /**
   * 设置视频处理器
   * @param processor 视频处理器
   */
  public setVideoProcessor(processor: VideoProcessor): void {
    this.videoProcessor = processor;
  }

  /**
   * 更新配置
   * @param config 新的配置
   */
  public updateConfig(config: Partial<VideoStreamConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * 创建视频流发送器的工厂函数
 * @param config 发送器配置
 * @param videoProcessor 视频处理器
 * @returns 视频流发送器实例
 */
export const createVideoStreamSender = (
  config: VideoStreamConfig,
  videoProcessor?: VideoProcessor
): VideoStreamSender => {
  return new VideoStreamSender(config, videoProcessor);
};

export default VideoStreamSender;