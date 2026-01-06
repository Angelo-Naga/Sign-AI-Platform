/**
 * 全局类型定义文件
 * 用于定义整个应用程序中使用的通用类型
 */

/**
 * 手语识别结果类型
 */
export interface SignRecognitionResult {
  /** 识别的手语词汇 */
  sign: string;
  /** 置信度分数 (0-1) */
  confidence: number;
  /** 识别时间戳 */
  timestamp: number;
  /** 手部关键点数据 */
  landmarks?: number[];
  /** 骨架连接数据 */
  connections?: number[][];
}

/**
 * 语音处理结果类型
 */
export interface VoiceProcessingResult {
  /** 识别的文本 */
  text: string;
  /** 音频时长（秒） */
  duration: number;
  /** 识别时间戳 */
  timestamp: number;
  /** 情感标签 */
  emotion?: string;
  /** 情感得分 */
  emotionScore?: number;
}

/**
 * 声音克隆结果类型
 */
export interface VoiceCloningResult {
  /** 合成音频URL */
  audioUrl: string;
  /** 输入文本 */
  text: string;
  /** 声音ID */
  voiceId: string;
  /** 生成时间戳 */
  timestamp: number;
  /** 音频时长（秒） */
  duration: number;
}

/**
 * 翻译结果类型
 */
export interface TranslationResult {
  /** 源文本 */
  sourceText: string;
  /** 翻译后的文本 */
  translatedText: string;
  /** 源语言 */
  sourceLang: string;
  /** 目标语言 */
  targetLang: string;
  /** 翻译时间戳 */
  timestamp: number;
}

/**
 * 声音档案类型
 */
export interface VoiceProfile {
  /** 档案唯一ID */
  id: string;
  /** 档案名称 */
  name: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 样本音频URL */
  sampleUrl: string;
  /** 是否默认 */
  isDefault: boolean;
}

/**
 * 摄像头配置类型
 */
export interface CameraConfig {
  /** 摄像头设备ID */
  deviceId: string;
  /** 分辨率宽度 */
  width: number;
  /** 分辨率高度 */
  height: number;
  /** 帧率 */
  frameRate: number;
}

/**
 * 录音配置类型
 */
export interface RecordingConfig {
  /** 音频格式 */
  format: 'wav' | 'mp3' | 'ogg';
  /** 采样率 */
  sampleRate: number;
  /** 声道数 */
  channels: number;
  /** 比特率 */
  bitRate?: number;
}

/**
 * 应用设置类型
 */
export interface AppSettings {
  /** 主题模式 */
  theme: 'light' | 'dark' | 'auto';
  /** 语言设置 */
  language: 'zh' | 'en';
  /** 麦克风设备ID */
  microphoneId: string;
  /** 摄像头设备ID */
  cameraId: string;
  /** 通知设置 */
  notifications: boolean;
  /** 自动保存设置 */
  autoSave: boolean;
  /** 音效设置 */
  soundEffects: boolean;
}

/**
 * 导航菜单项类型
 */
export interface NavMenuItem {
  /** 菜单项ID */
  id: string;
  /** 显示标签 */
  label: string;
  /** 路由路径 */
  path: string;
  /** 图标名称 */
  icon: string;
  /** 是否激活 */
  active?: boolean;
  /** 子菜单项 */
  children?: NavMenuItem[];
}

/**
 * 历史记录类型
 */
export interface HistoryItem<T> {
  /** 记录ID */
  id: string;
  /** 数据内容 */
  data: T;
  /** 创建时间戳 */
  timestamp: number;
  /** 记录类型 */
  type: 'sign' | 'voice' | 'translation' | 'clone';
}

/**
 * 手部关键点类型
 */
export interface HandLandmarks {
  /** 手部21个关键点的坐标 */
  points: Array<{
    x: number;
    y: number;
    z: number;
  }>;
  /** 手部得分 */
  score: number;
  /** 是否左手 */
  handedness: 'left' | 'right';
}

/**
 * 骨架数据类型
 */
export interface PoseData {
  /** 33个身体关键点 */
  landmarks: Array<{
    x: number;
    y: number;
    z: number;
    visibility: number;
  }>;
  /** 骨架得分 */
  score: number;
}

/**
 * 音频波形数据类型
 */
export interface WaveformData {
  /** 波形振幅数组 */
  amplitudes: number[];
  /** 采样率 */
  sampleRate: number;
  /** 持续时间（秒） */
  duration: number;
}

/**
 * 情感分析结果类型
 */
export interface EmotionResult {
  /** 情感类型 */
  emotion: 'happy' | 'sad' | 'angry' | 'neutral' | 'surprised' | 'fearful';
  /** 情感得分 (0-1) */
  score: number;
  /** 所有情感得分 */
  scores: {
    happy: number;
    sad: number;
    angry: number;
    neutral: number;
    surprised: number;
    fearful: number;
  };
}

/**
 * 错误类型
 */
export interface ApiError {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** HTTP状态码 */
  status?: number;
  /** 错误详情 */
  details?: unknown;
}

/**
 * 社交媒体链接类型
 */
export interface SocialLink {
  /** 平台名称 (github, twitter, linkedin, email 等) */
  platform: string;
  /** 链接URL */
  url: string;
  /** 标签文本 */
  label: string;
}

/**
 * 页脚链接类型
 */
export interface FooterLink {
  /** 链接文本 */
  label: string;
  /** 路由路径 */
  path: string;
  /** 是否外部链接 */
  external?: boolean;
}

/**
 * 通知类型
 */
export interface Notification {
  /** 通知ID */
  id: string;
  /** 通知标题 */
  title: string;
  /** 通知内容 */
  message: string;
  /** 通知类型 */
  type: 'info' | 'success' | 'warning' | 'error';
  /** 是否已读 */
  read: boolean;
  /** 创建时间戳 */
  timestamp: number;
  /** 操作链接 (可选) */
  actionLink?: string;
}

/**
 * 用户信息类型
 */
export interface User {
  /** 用户ID */
  id: string;
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email: string;
  /** 昵称 */
  nickname?: string;
  /** 头像URL */
  avatar?: string;
  /** 主题偏好 */
  theme?: 'light' | 'dark' | 'auto';
  /** 创建时间戳 */
  createdAt: number;
}