/**
 * 视频流配置
 * 定义媒体约束、编码参数、网络参数和性能参数
 */

/**
 * 分辨率配置选项
 */
export const RESOLUTIONS = {
  LOW: { width: 640, height: 480, label: '低 (640x480)' },
  MEDIUM: { width: 1280, height: 720, label: '中 (1280x720)' },
  HIGH: { width: 1920, height: 1080, label: '高 (1920x1080)' },
  ULTRA: { width: 2560, height: 1440, label: '超高清 (2560x1440)' },
} as const;

/**
 * 帧率配置选项
 */
export const FRAME_RATES = {
  LOW: 15,
  MEDIUM: 24,
  HIGH: 30,
  ULTRA: 60,
} as const;

/**
 * 媒体约束配置
 */
export const MEDIA_CONSTRAINTS = {
  // 优先摄像头 - 后置摄像头（移动端）/ 用户摄像头（桌面）
  facingMode: 'user',

  // 音频配置
  audio: {
    echoCancellation: true, // 回声消除
    noiseSuppression: true, // 噪声抑制
    autoGainControl: true, // 自动增益控制
    sampleRate: 44100, // 采样率
  },

  // 视频宽度（根据选择的分辨率）
  width: {
    ideal: 1280,
    min: 640,
    max: 1920,
  },

  // 视频高度（根据选择的分辨率）
  height: {
    ideal: 720,
    min: 480,
    max: 1080,
  },

  // 帧率
  frameRate: {
    ideal: 30,
    min: 15,
    max: 60,
  },

  // 其他视频参数
  aspectRatio: {
    ideal: 16 / 9,
  },
};

/**
 * 编码参数配置
 */
export const ENCODING_CONFIG = {
  // 图像质量（0-1，1为最高质量）
  quality: 0.85,

  // JPEG 编码质量
  jpegQuality: 0.85,

  // 目标帧大小（字节）
  targetFrameSize: 100 * 1024, // 100KB

  // 是否裁剪图片以减少大小
  enableCrop: true,

  // 裁剪后的最大尺寸
  maxCropSize: 1024,
} as const;

/**
 * 网络参数配置
 */
export const NETWORK_CONFIG = {
  // WebSocket 重连延迟（毫秒）
  reconnectDelay: 3000,

  // 最大重连尝试次数
  maxReconnectAttempts: 5,

  // 连接超时时间（毫秒）
  connectionTimeout: 10000,

  // 心跳间隔（毫秒）
  heartbeatInterval: 30000,

  // 发送超时时间（毫秒）
  sendTimeout: 5000,

  // 网络质量检查间隔（毫秒）
  qualityCheckInterval: 5000,

  // 发送队列最大大小
  maxQueueSize: 50,

  // 自适应质量调整阈值
  adaptation: {
    slowThreshold: 500, // 延迟超过 500ms 降低质量
    fastThreshold: 100, // 延迟低于 100ms 提高质量
    bufferSize: 10, // 用于计算平均延迟的样本数量
  },
} as const;

/**
 * 性能参数配置
 */
export const PERFORMANCE_CONFIG = {
  // 目标发送帧率（FPS）
  targetFrameRate: 15,

  // 批量帧缓冲大小
  batchSize: 5,

  // 帧缓冲区最大大小
  maxBufferSize: 30,

  // 帧丢弃策略
  dropStrategy: 'newest', // 'oldest' | 'newest' | 'random'

  // 帧捕获延迟补偿（毫秒）
  captureDelay: 50,

  // 渲染延迟补偿（毫秒）
  renderDelay: 50,

  // 性能监控间隔（毫秒）
  monitorInterval: 1000,

  // FPS 历史记录大小
  fpsHistorySize: 60,

  // 最大 CPU 使用率百分比（超过则降级）
  maxCpuUsage: 80,

  // 内存警告阈值（MB）
  memoryWarningThreshold: 500,

  // Canvas 渲染模式
  canvasMode: '2d', // '2d' | 'webgl' | 'webgl2'
} as const;

/**
 * 图像预处理配置
 */
export const IMAGE_PROCESSING = {
  // 是否启用镜像（水平翻转）
  enableMirror: false,

  // 是否启用边缘检测预处理
  enableEdgeDetection: false,

  // 是否启用亮度调整
  enableBrightnessAdjust: true,

  // 目标亮度值（0-255）
  targetBrightness: 128,

  // 是否启用对比度调整
  enableContrastAdjust: true,

  // 目标对比度值（0-255）
  targetContrast: 128,

  // 是否启用锐化
  enableSharpen: false,

  // 缩放算法
  scalingAlgorithm: 'bilinear', // 'nearest' | 'bilinear' | 'bicubic'
} as const;

/**
 * 默认 WebRTC 配置
 */
export const WEBRTC_CONFIG = {
  // ICE 服务器配置（用于 NAT 穿透）
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],

  // ICE 传输策略
  iceTransportPolicy: 'all' as const,

  // 候选人策略
  bundlePolicy: 'balanced' as const,

  // RTCP 复用策略
  rtcpMuxPolicy: 'require' as const,

  // SDP 语义
  sdpSemantics: 'unified-plan' as const,

  // 是否启用 DSCP
  enableDscp: true,

  // 是否启用 IPv6
  enableIPv6: true,
} as const;

/**
 * 摄像头设备类型
 */
export type CameraDeviceType = 'user' | 'environment' | 'left' | 'right';

/**
 * 获取指定分辨率的媒体约束
 * @param resolution 分辨率配置
 * @param frameRate 帧率
 * @param facingMode 摄像头朝向
 * @returns 媒体约束对象
 */
export const getMediaConstraints = (
  resolution: typeof RESOLUTIONS[keyof typeof RESOLUTIONS] = RESOLUTIONS.MEDIUM,
  frameRate: number = FRAME_RATES.HIGH,
  facingMode: CameraDeviceType = 'user'
): MediaStreamConstraints => {
  return {
    audio: MEDIA_CONSTRAINTS.audio,
    video: {
      width: {
        ideal: resolution.width,
        min: resolution.width / 2,
        max: resolution.width * 2,
      },
      height: {
        ideal: resolution.height,
        min: resolution.height / 2,
        max: resolution.height * 2,
      },
      frameRate: {
        ideal: frameRate,
        min: frameRate / 2,
        max: frameRate * 2,
      },
      facingMode,
      aspectRatio: MEDIA_CONSTRAINTS.aspectRatio,
    },
  };
};

/**
 * 根据网络质量自适应调整帧率
 * @param currentFrameRate 当前帧率
 * @param latency 延迟（毫秒）
 * @returns 调整后的帧率
 */
export const adaptFrameRate = (currentFrameRate: number, latency: number): number => {
  const { slowThreshold, fastThreshold } = NETWORK_CONFIG.adaptation;

  if (latency > slowThreshold) {
    // 延迟高，降低帧率
    return Math.max(FRAME_RATES.LOW, Math.floor(currentFrameRate * 0.7));
  } else if (latency < fastThreshold) {
    // 延迟低，提高帧率
    return Math.min(FRAME_RATES.HIGH, Math.floor(currentFrameRate * 1.2));
  }

  // 延迟在正常范围内，保持当前帧率
  return currentFrameRate;
};

/**
 * 根据网络质量自适应调整图像质量
 * @param currentQuality 当前质量
 * @param latency 延迟（毫秒）
 * @returns 调整后的质量
 */
export const adaptQuality = (currentQuality: number, latency: number): number => {
  const { slowThreshold, fastThreshold } = NETWORK_CONFIG.adaptation;

  if (latency > slowThreshold) {
    // 延迟高，降低质量
    return Math.max(0.5, currentQuality * 0.85);
  } else if (latency < fastThreshold) {
    // 延迟低，提高质量
    return Math.min(1.0, Math.min(currentQuality * 1.1, ENCODING_CONFIG.quality));
  }

  // 延迟在正常范围内，保持当前质量
  return currentQuality;
};