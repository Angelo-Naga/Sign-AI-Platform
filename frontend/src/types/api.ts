/**
 * API响应类型定义
 * 用于定义各种API请求和响应的数据结构
 */

import { 
  SignRecognitionResult, 
  VoiceProcessingResult, 
  VoiceCloningResult, 
  TranslationResult 
} from './index';

/**
 * 通用API响应基类
 */
export interface ApiResponse<T = unknown> {
  /** 响应数据 */
  data: T;
  /** 响应消息 */
  message: string;
  /** 请求成功标识 */
  success: boolean;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 分页响应类型
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  items: T[];
  /** 总数 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
}

/**
 * 手语识别请求
 */
export interface SignRecognizeRequest {
  /** 图像数据（Base64） */
  image: string;
  /** 手势序列ID */
  sequenceId?: string;
}

/**
 * 手语识别响应
 */
export interface SignRecognizeResponse {
  /** 识别结果 */
  result: SignRecognitionResult;
  /** 处理耗时（毫秒） */
  processingTime: number;
  /** 是否连续识别 */
  isContinuous: boolean;
}

/**
 * 语音识别请求
 */
export interface VoiceRecognizeRequest {
  /** 音频文件 */
  audio: File | Blob;
  /** 语言代码 */
  language: string;
  /** 是否返回情感分析 */
  includeEmotion?: boolean;
}

/**
 * 语音识别响应
 */
export interface VoiceRecognizeResponse {
  /** 识别结果 */
  result: VoiceProcessingResult;
  /** 处理耗时（毫秒） */
  processingTime: number;
  /** 置信度 */
  confidence: number;
}

/**
 * 文本转语音请求
 */
export interface TextToSpeechRequest {
  /** 输入文本 */
  text: string;
  /** 声音ID */
  voiceId: string;
  /** 语速 (0.5-2.0) */
  speed?: number;
  /** 音调 (0.5-2.0) */
  pitch?: number;
  /** 情感强度 (0-1) */
  emotionIntensity?: number;
}

/**
 * 文本转语音响应
 */
export interface TextToSpeechResponse {
  /** 音频URL */
  audioUrl: string;
  /** 合成时长（秒） */
  duration: number;
  /** 处理耗时（毫秒） */
  processingTime: number;
}

/**
 * 声音克隆训练请求
 */
export interface VoiceCloneTrainRequest {
  /** 训练音频文件 */
  audio: File | File[];
  /** 声音名称 */
  voiceName: string;
}

/**
 * 声音克隆训练响应
 */
export interface VoiceCloneTrainResponse {
  /** 声音ID */
  voiceId: string;
  /** 训练状态 */
  status: 'training' | 'completed' | 'failed';
  /** 预计完成时间（秒） */
  estimatedTime?: number;
}

/**
 * 翻译请求
 */
export interface TranslateRequest {
  /** 源文本 */
  text: string;
  /** 源语言 */
  sourceLang: string;
  /** 目标语言 */
  targetLang: string;
  /** 翻译类型 */
  type: 'text' | 'sign_to_text' | 'text_to_sign';
}

/**
 * 翻译响应
 */
export interface TranslateResponse {
  /** 翻译结果 */
  result: TranslationResult;
  /** 处理耗时（毫秒） */
  processingTime: number;
  /** 置信度 */
  confidence: number;
}

/**
 * 批量翻译请求
 */
export interface BatchTranslateRequest {
  /** 文本数组 */
  texts: string[];
  /** 源语言 */
  sourceLang: string;
  /** 目标语言 */
  targetLang: string;
}

/**
 * 批量翻译响应
 */
export interface BatchTranslateResponse {
  /** 翻译结果数组 */
  results: TranslationResult[];
  /** 处理耗时（毫秒） */
  processingTime: number;
}

/**
 * 设备列表响应
 */
export interface DevicesResponse {
  /** 摄像头设备列表 */
  cameras: Array<{
    deviceId: string;
    label: string;
  }>;
  /** 麦克风设备列表 */
  microphones: Array<{
    deviceId: string;
    label: string;
  }>;
}

/**
 * 上传文件响应
 */
export interface UploadResponse {
  /** 文件URL */
  url: string;
  /** 文件名 */
  filename: string;
  /** 文件大小（字节） */
  size: number;
  /** 文件类型 */
  mimeType: string;
  /** 上传时间戳 */
  uploadedAt: number;
}

/**
 * 健康检查响应
 */
export interface HealthCheckResponse {
  /** 服务状态 */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** 版本号 */
  version: string;
  /** 各模块状态 */
  modules: {
    signRecognition: boolean;
    voiceProcessing: boolean;
    voiceCloning: boolean;
    translation: boolean;
  };
  /** 响应时间（毫秒） */
  responseTime: number;
}

/**
 * WebSocket连接请求
 */
export interface WSConnectRequest {
  /** 连接类型 */
  type: 'sign_recognition' | 'voice_processing' | 'translation';
  /** 会话ID */
  sessionId: string;
  /** 用户认证令牌 */
  token?: string;
}

/**
 * WebSocket消息类型
 */
export type WSMessageType = 
  | 'connect'
  | 'disconnect'
  | 'data'
  | 'error'
  | 'status'
  | 'complete';

/**
 * WebSocket消息
 */
export interface WSMessage<T = unknown> {
  /** 消息类型 */
  type: WSMessageType;
  /** 消息数据 */
  data: T;
  /** 时间戳 */
  timestamp: number;
  /** 消息ID */
  messageId: string;
}