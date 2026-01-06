/**
 * 视频处理器
 * 负责视频帧捕获、帧率控制、质量优化、图像预处理和 Base64 编码
 */

import {
  ENCODING_CONFIG,
  PERFORMANCE_CONFIG,
  IMAGE_PROCESSING,
  adaptFrameRate,
  adaptQuality,
} from '../config/streamConfig';

/**
 * 视频帧数据接口
 */
export interface VideoFrame {
  data: string; // Base64 编码的帧数据
  timestamp: number; // 时间戳（毫秒）
  sequence: number; // 帧序号
  quality: number; // 图像质量（0-1）
  width: number; // 帧宽度
  height: number; // 帧高度
}

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  fps: number; // 实际帧率
  avgLatency: number; // 平均延迟（毫秒）
  cpuUsage: number; // CPU 使用率（估算）
  memoryUsage: number; // 内存使用量（MB）
  bufferSize: number; // 缓冲区大小
  droppedFrames: number; // 丢帧数量
}

/**
 * 视频处理器选项
 */
export interface VideoProcessorOptions {
  targetFrameRate?: number; // 目标帧率
  quality?: number; // 图像质量
  maxCropSize?: number; // 最大裁剪尺寸
  enableMirror?: boolean; // 是否镜像
  enableOptimization?: boolean; // 是否启用优化
}

/**
 * 视频处理器类
 */
export class VideoProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private targetFrameRate: number;
  private currentQuality: number;
  private sequence: number;
  private frameBuffer: VideoFrame[];
  private lastCaptureTime: number;
  private frameInterval: number;
  private droppedFrames: number;
  private fpsHistory: number[];
  private isProcessing: boolean;

  /**
   * 构造函数
   * @param options 处理器选项
   */
  constructor(options: VideoProcessorOptions = {}) {
    this.targetFrameRate = options.targetFrameRate || PERFORMANCE_CONFIG.targetFrameRate;
    this.currentQuality = options.quality || ENCODING_CONFIG.quality;
    this.sequence = 0;
    this.frameBuffer = [];
    this.lastCaptureTime = 0;
    this.frameInterval = 1000 / this.targetFrameRate;
    this.droppedFrames = 0;
    this.fpsHistory = [];
    this.isProcessing = false;

    // 创建离屏 canvas
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d', {
      willReadFrequently: true, // 优化频繁读取操作
    });

    if (!context) {
      throw new Error('无法创建 Canvas 2D 上下文');
    }

    this.ctx = context;
  }

  /**
   * 捕获视频帧
   * @param videoElement 视频元素
   * @returns 捕获的帧数据
   */
  public captureFrame(videoElement: HTMLVideoElement): VideoFrame | null {
    if (!videoElement || videoElement.paused || videoElement.ended) {
      return null;
    }

    const now = Date.now();

    // 帧率控制
    if (now - this.lastCaptureTime < this.frameInterval) {
      this.droppedFrames++;
      return null;
    }

    this.lastCaptureTime = now;

    try {
      // 设置 canvas 尺寸
      const videoWidth = videoElement.videoWidth;
      const videoHeight = videoElement.videoHeight;

      if (!videoWidth || !videoHeight) {
        return null;
      }

      // 裁剪和缩放
      const { width, height } = this.calculateCropSize(videoWidth, videoHeight);
      this.canvas.width = width;
      this.canvas.height = height;

      // 图像预处理
      this.preprocessFrame(videoElement, width, height);

      // 捕获帧数据
      const imageData = this.ctx.getImageData(0, 0, width, height);

      // 转换为 Base64
      const base64 = this.encodeToBase64(imageData, width, height);

      // 创建帧对象
      const frame: VideoFrame = {
        data: base64,
        timestamp: now,
        sequence: this.sequence++,
        quality: this.currentQuality,
        width,
        height,
      };

      // 添加到缓冲区
      this.frameBuffer.push(frame);

      // 更新 FPS 历史
      this.updateFpsHistory();

      return frame;

    } catch (error) {
      console.error('捕获视频帧失败:', error);
      return null;
    }
  }

  /**
   * 批量捕获帧
   * @param videoElement 视频元素
   * @param batchSize 批量大小
   * @returns 捕获的帧数组
   */
  public captureBatchFrames(
    videoElement: HTMLVideoElement,
    batchSize: number = PERFORMANCE_CONFIG.batchSize
  ): VideoFrame[] {
    const frames: VideoFrame[] = [];
    let captured = 0;

    while (captured < batchSize) {
      const frame = this.captureFrame(videoElement);
      if (frame) {
        frames.push(frame);
        captured++;
      } else {
        break;
      }
    }

    return frames;
  }

  /**
   * 从缓冲区获取帧
   * @returns 缓冲区中的帧
   */
  public getFramesFromBuffer(): VideoFrame[] {
    const frames = [...this.frameBuffer];
    this.frameBuffer = [];
    return frames;
  }

  /**
   * 清空缓冲区
   */
  public clearBuffer(): void {
    this.frameBuffer = [];
  }

  /**
   * 计算裁剪尺寸
   * @param originalWidth 原始宽度
   * @param originalHeight 原始高度
   * @returns 裁剪后的尺寸
   */
  private calculateCropSize(originalWidth: number, originalHeight: number): { width: number; height: number } {
    if (!ENCODING_CONFIG.enableCrop) {
      return { width: originalWidth, height: originalHeight };
    }

    const maxSize = ENCODING_CONFIG.maxCropSize;
    const aspectRatio = originalWidth / originalHeight;

    let width = originalWidth;
    let height = originalHeight;

    // 如果尺寸超过最大值，按比例缩放
    if (width > maxSize || height > maxSize) {
      if (width > height) {
        width = maxSize;
        height = Math.round(maxSize / aspectRatio);
      } else {
        height = maxSize;
        width = Math.round(maxSize * aspectRatio);
      }
    }

    return { width, height };
  }

  /**
   * 图像预处理
   * @param videoElement 视频元素
   * @param width 目标宽度
   * @param height 目标高度
   */
  private preprocessFrame(videoElement: HTMLVideoElement, width: number, height: number): void {
    // 镜像翻转
    if (IMAGE_PROCESSING.enableMirror) {
      this.ctx.save();
      this.ctx.scale(-1, 1);
      this.ctx.translate(-width, 0);
    }

    // 绘制视频帧
    this.ctx.drawImage(videoElement, 0, 0, width, height);

    // 恢复状态（如果使用了镜像）
    if (IMAGE_PROCESSING.enableMirror) {
      this.ctx.restore();
    }

    // 获取图像数据
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // 亮度和对比度调整
    if (IMAGE_PROCESSING.enableBrightnessAdjust || IMAGE_PROCESSING.enableContrastAdjust) {
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 亮度调整
        if (IMAGE_PROCESSING.enableBrightnessAdjust) {
          const brightness = IMAGE_PROCESSING.targetBrightness - 128;
          r += brightness;
          g += brightness;
          b += brightness;
        }

        // 对比度调整
        if (IMAGE_PROCESSING.enableContrastAdjust) {
          const contrast = (IMAGE_PROCESSING.targetContrast - 128) / 128 + 1;
          r = (r - 128) * contrast + 128;
          g = (g - 128) * contrast + 128;
          b = (b - 128) * contrast + 128;
        }

        // 钳制值到有效范围
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
    }

    // 应用处理后的图像数据
    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 编码为 Base64
   * @param imageData 图像数据
   * @param width 宽度
   * @param height 高度
   * @returns Base64 字符串
   */
  private encodeToBase64(imageData: ImageData, width: number, height: number): string {
    // 将 ImageData 转换为 canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      throw new Error('无法创建临时 Canvas 上下文');
    }

    tempCtx.putImageData(imageData, 0, 0);

    // 转换为 JPEG Base64
    return tempCanvas.toDataURL('image/jpeg', this.currentQuality);
  }

  /**
   * 更新帧率历史
   */
  private updateFpsHistory(): void {
    const now = Date.now();
    const elapsed = now - this.lastCaptureTime;
    const fps = 1000 / this.frameInterval;

    this.fpsHistory.push(fps);

    if (this.fpsHistory.length > PERFORMANCE_CONFIG.fpsHistorySize) {
      this.fpsHistory.shift();
    }
  }

  /**
   * 计算平均 FPS
   * @returns 平均帧率
   */
  public getAverageFps(): number {
    if (this.fpsHistory.length === 0) {
      return 0;
    }

    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.fpsHistory.length);
  }

  /**
   * 获取性能指标
   * @returns 性能指标
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    const memoryUsage = this.estimateMemoryUsage();
    const cpuUsage = this.estimateCpuUsage();

    return {
      fps: this.getAverageFps(),
      avgLatency: this.frameInterval,
      cpuUsage,
      memoryUsage,
      bufferSize: this.frameBuffer.length,
      droppedFrames: this.droppedFrames,
    };
  }

  /**
   * 估算内存使用量（MB）
   * @returns 内存使用量
   */
  private estimateMemoryUsage(): number {
    // 估算每帧大小（假设 85% 质量的 JPEG）
    const avgFrameSize = this.canvas.width * this.canvas.height * 3 * 0.15;
    const totalSize = avgFrameSize * this.frameBuffer.length;

    return Math.round(totalSize / (1024 * 1024));
  }

  /**
   * 估算 CPU 使用率（启发式方法）
   * @returns CPU 使用率
   */
  private estimateCpuUsage(): number {
    // 基于丢帧率估算 CPU 负载
    const totalCaptures = this.sequence + this.droppedFrames;
    if (totalCaptures === 0) {
      return 0;
    }

    const dropRate = this.droppedFrames / totalCaptures;
    return Math.min(100, Math.round(dropRate * 200));
  }

  /**
   * 设置目标帧率
   * @param frameRate 目标帧率
   */
  public setTargetFrameRate(frameRate: number): void {
    this.targetFrameRate = Math.max(FRAME_RATE_MIN, Math.min(FRAME_RATE_MAX, frameRate));
    this.frameInterval = 1000 / this.targetFrameRate;
  }

  /**
   * 设置图像质量
   * @param quality 图像质量（0-1）
   */
  public setQuality(quality: number): void {
    this.currentQuality = Math.max(0.1, Math.min(1.0, quality));
  }

  /**
   * 根据网络延迟自适应调整
   * @param latency 延迟（毫秒）
   */
  public adaptToNetwork(latency: number): void {
    // 调整帧率
    const newFrameRate = adaptFrameRate(this.targetFrameRate, latency);
    this.setTargetFrameRate(newFrameRate);

    // 调整质量
    const newQuality = adaptQuality(this.currentQuality, latency);
    this.setQuality(newQuality);
  }

  /**
   * 获取缓冲区大小
   * @returns 缓冲区大小
   */
  public getBufferSize(): number {
    return this.frameBuffer.length;
  }

  /**
   * 获取丢帧数
   * @returns 丢帧数量
   */
  public getDroppedFrames(): number {
    return this.droppedFrames;
  }

  /**
   * 重置丢帧计数
   */
  public resetDroppedFrames(): void {
    this.droppedFrames = 0;
  }

  /**
   * 销毁处理器
   */
  public destroy(): void {
    this.clearBuffer();
    this.fpsHistory = [];
    this.sequence = 0;
  }
}

/**
 * 帧率常量
 */
const FRAME_RATE_MIN = 5; // 最小帧率
const FRAME_RATE_MAX = 60; // 最大帧率

/**
 * 创建视频处理器的工厂函数
 * @param options 处理器选项
 * @returns 视频处理器实例
 */
export const createVideoProcessor = (options?: VideoProcessorOptions): VideoProcessor => {
  return new VideoProcessor(options);
};

export default VideoProcessor;