/**
 * WebSocket消息类型定义
 * 用于定义WebSocket通信中的消息格式和类型
 */

import { SignRecognitionResult, VoiceProcessingResult, TranslationResult } from './index';

/**
 * WebSocket连接状态
 */
export type WSConnectionState = 
  | 'disconnected'  // 未连接
  | 'connecting'     // 连接中
  | 'connected'      // 已连接
  | 'reconnecting'   // 重连中
  | 'error';         // 错误

/**
 * WebSocket事件类型
 */
export type WSEventType =
  | 'open'            // 连接打开
  | 'close'           // 连接关闭
  | 'error'           // 连接错误
  | 'message'         // 收到消息
  | 'reconnect'       // 重连
  | 'disconnect';     // 断开连接

/**
 * 手语识别WebSocket消息
 */
export interface SignWSMessage {
  /** 消息类型 */
  type: 'frame' | 'result' | 'error' | 'status';
  /** 识别结果 */
  result?: SignRecognitionResult;
  /** 图像数据（Base64） */
  image?: string;
  /** 错误信息 */
  error?: string;
  /** 帧ID */
  frameId?: number;
  /** FPS */
  fps?: number;
  /** 连接状态 */
  status?: {
    connected: boolean;
    latency: number;
    quality: number;
  };
}

/**
 * 语音处理WebSocket消息
 */
export interface VoiceWSMessage {
  /** 消息类型 */
  type: 'audio' | 'result' | 'error' | 'status';
  /** 识别结果 */
  result?: VoiceProcessingResult;
  /** 音频数据（Base64） */
  audio?: string;
  /** 错误信息 */
  error?: string;
  /** 音频块ID */
  chunkId?: number;
  /** 波形数据 */
  waveform?: number[];
  /** 音量级别 */
  volume?: number;
  /** 连接状态 */
  status?: {
    connected: boolean;
    recording: boolean;
    latency: number;
  };
}

/**
 * 翻译WebSocket消息
 */
export interface TranslationWSMessage {
  /** 消息类型 */
  type: 'text' | 'result' | 'error' | 'progress';
  /** 翻译结果 */
  result?: TranslationResult;
  /** 输入文本 */
  text?: string;
  /** 错误信息 */
  error?: string;
  /** 处理进度 */
  progress?: number;
  /** 连接状态 */
  status?: {
    connected: boolean;
    processing: boolean;
    queueSize: number;
  };
}

/**
 * WebSocket配置
 */
export interface WSConfig {
  /** WebSocket服务器URL */
  url: string;
  /** 连接类型 */
  type: 'sign_recognition' | 'voice_processing' | 'translation';
  /** 会话ID */
  sessionId: string;
  /** 认证令牌 */
  token?: string;
  /** 是否自动重连 */
  autoReconnect?: boolean;
  /** 重连间隔（毫秒） */
  reconnectInterval?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 心跳间隔（毫秒） */
  heartbeatInterval?: number;
}

/**
 * WebSocket事件处理器
 */
export interface WSEventHandlers {
  /** 连接打开事件 */
  onOpen?: (event: Event) => void;
  /** 连接关闭事件 */
  onClose?: (event: CloseEvent) => void;
  /** 连接错误事件 */
  onError?: (event: Event) => void;
  /** 收到消息事件 */
  onMessage?: (event: MessageEvent) => void;
  /** 重连事件 */
  onReconnect?: (attempt: number) => void;
  /** 断开连接事件 */
  onDisconnect?: () => void;
}

/**
 * WebSocket统计信息
 */
export interface WSStatistics {
  /** 连接时间戳 */
  connectedAt: number;
  /** 发送消息数 */
  messagesSent: number;
  /** 接收消息数 */
  messagesReceived: number;
  /** 平均延迟（毫秒） */
  avgLatency: number;
  /** 最大延迟（毫秒） */
  maxLatency: number;
  /** 最小延迟（毫秒） */
  minLatency: number;
  /** 重连次数 */
  reconnectCount: number;
  /** 断开次数 */
  disconnectCount: number;
}

/**
 * 手语识别参数
 */
export interface SignRecognitionParams {
  /** 视频帧率 */
  frameRate: number;
  /** 图像质量 */
  quality: number;
  /** 是否返回关键点 */
  returnLandmarks: boolean;
  /** 是否实时预览 */
  enablePreview: boolean;
}

/**
 * 语音处理参数
 */
export interface VoiceProcessingParams {
  /** 采样率 */
  sampleRate: number;
  /** 音频格式 */
  format: 'wav' | 'mp3';
  /** 是否返回波形 */
  returnWaveform: boolean;
  /** 超时时间（秒） */
  timeout: number;
}

/**
 * 翻译参数
 */
export interface TranslationParams {
  /** 源语言 */
  sourceLang: string;
  /** 目标语言 */
  targetLang: string;
  /** 是否流式返回 */
  streaming: boolean;
  /** 超时时间（秒） */
  timeout: number;
}