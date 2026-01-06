/**
 * 视频流接收器
 * 负责通过 WebSocket 接收视频流、帧解码和渲染、延迟计算、帧同步和播放控制
 */

import { NETWORK_CONFIG, PERFORMANCE_CONFIG } from '../config/streamConfig';

/**
 * 视频帧数据接口
 */
export interface ReceivedFrame {
  data: string; // Base64 编码的帧数据
  timestamp: number; // 时间戳
  sequence: number; // 帧序号
  quality: number; // 图像质量
  width: number; // 帧宽度
  height: number; // 帧高度
}

/**
 * 接收状态接口
 */
export interface ReceiveState {
  isConnected: boolean; // 是否已连接
  isPlaying: boolean; // 是否正在播放
  totalFrames: number; // 总接收帧数
  bytesReceived: number; // 已接收字节数
  avgLatency: number; // 平均延迟（毫秒）
  bufferLength: number; // 缓冲区长度
  frameRate: number; // 当前帧率
  droppedFrames: number; // 丢帧数量
}

/**
 * 接收器配置
 */
export interface VideoReceiverConfig {
  url: string; // WebSocket 服务器 URL
  canvasElement: HTMLCanvasElement; // 渲染 canvas 元素
  reconnectDelay?: number; // 重连延迟
  maxReconnectAttempts?: number; // 最大重连次数
  bufferSize?: number; // 缓冲区大小
  enableSync?: boolean; // 是否启用帧同步
  targetLatency?: number; // 目标延迟（毫秒）
}

/**
 * 视频流接收器类
 */
export class VideoStreamReceiver {
  private ws: WebSocket | null;
  private config: VideoReceiverConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frameBuffer: ReceivedFrame[];
  private state: ReceiveState;
  private renderInterval: number | null;
  private fpsCheckInterval: number | null;
  private lastFrameTime: number;
  private frameCount: number;
  private fpsHistory: number[];
  private latencyHistory: number[];
  private isConnecting: boolean;
  private shouldReconnect: boolean;
  private lastPlayedSequence: number;

  /**
   * 构造函数
   * @param config 接收器配置
   */
  constructor(config: VideoReceiverConfig) {
    this.config = {
      reconnectDelay: NETWORK_CONFIG.reconnectDelay,
      maxReconnectAttempts: NETWORK_CONFIG.maxReconnectAttempts,
      bufferSize: PERFORMANCE_CONFIG.maxBufferSize,
      enableSync: true,
      targetLatency: 100,
      ...config,
    };

    this.canvas = this.config.canvasElement;
    const context = this.canvas.getContext('2d');

    if (!context) {
      throw new Error('无法获取 Canvas 2D 上下文');
    }

    this.ctx = context;
    this.ws = null;
    this.frameBuffer = [];
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fpsHistory = [];
    this.latencyHistory = [];
    this.isConnecting = false;
    this.shouldReconnect = true;
    this.lastPlayedSequence = -1;
    this.renderInterval = null;
    this.fpsCheckInterval = null;

    this.state = {
      isConnected: false,
      isPlaying: false,
      totalFrames: 0,
      bytesReceived: 0,
      avgLatency: 0,
      bufferLength: 0,
      frameRate: 0,
      droppedFrames: 0,
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
          console.log('视频流接收器已连接');
          resolve();
        };

        this.ws.onclose = (event: CloseEvent) => {
          this.isConnecting = false;
          this.state.isConnected = false;
          this.stopRendering();
          console.log(`视频流接收器已断开: ${event.code} - ${event.reason}`);

          // 自动重连
          if (this.shouldReconnect) {
            this.reconnect();
          }
        };

        this.ws.onerror = (error: Event) => {
          this.isConnecting = false;
          console.error('WebSocket 错误:', error);
          reject(error);
        };

        this.ws.onmessage = (event: MessageEvent) => {
          this.handleMessage(event);
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
    this.stopRendering();
    this.clearBuffer();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.state.isConnected = false;
    this.state.isPlaying = false;

    console.log('视频流接收器已断开');
  }

  /**
   * 重连
   */
  private reconnect(): void {
    const delay = this.config.reconnectDelay;

    console.log(`${delay}ms 后尝试重连`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('重连失败:', error);
        if (this.shouldReconnect) {
          this.reconnect();
        }
      });
    }, delay);
  }

  /**
   * 处理接收到的消息
   * @param event 消息事件
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'video_frame':
          this.handleVideoFrame(message);
          break;

        default:
          console.log('未知消息类型:', message.type);
      }
    } catch (error) {
      console.error('处理消息失败:', error);
    }
  }

  /**
   * 处理视频帧
   * @param frameData 帧数据
   */
  private handleVideoFrame(frameData: ReceivedFrame): void {
    const frame: ReceivedFrame = {
      data: frameData.data,
      timestamp: frameData.timestamp,
      sequence: frameData.sequence,
      quality: frameData.quality,
      width: frameData.width,
      height: frameData.height,
    };

    // 更新统计信息
    this.state.totalFrames++;
    this.state.bytesReceived += frame.data.length;

    // 计算延迟
    const latency = Date.now() - frame.timestamp;
    this.updateLatency(latency);

    // 检查丢帧（帧序号不连续）
    if (this.lastPlayedSequence >= 0 && frame.sequence !== this.lastPlayedSequence + 1) {
      this.state.droppedFrames += frame.sequence - this.lastPlayedSequence - 1;
    }

    // 添加到缓冲区
    this.addToBuffer(frame);

    // 如果缓冲区已满，根据策略丢弃旧帧
    if (this.config.bufferSize && this.frameBuffer.length > this.config.bufferSize) {
      this.frameBuffer.shift();
    }
  }

  /**
   * 添加帧到缓冲区
   * @param frame 视频帧
   */
  private addToBuffer(frame: ReceivedFrame): void {
    this.frameBuffer.push(frame);
    this.state.bufferLength = this.frameBuffer.length;
  }

  /**
   * 清空缓冲区
   */
  private clearBuffer(): void {
    this.frameBuffer = [];
    this.state.bufferLength = 0;
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
   * 开始渲染
   */
  public startRendering(): void {
    if (this.state.isPlaying) {
      return;
    }

    this.state.isPlaying = true;
    this.frameCount = 0;
    this.lastFrameTime = Date.now();

    // 启动 FPS 检查
    this.startFpsCheck();

    // 开始渲染循环
    this.renderLoop();
  }

  /**
   * 停止渲染
   */
  public stopRendering(): void {
    this.state.isPlaying = false;
    this.stopFpsCheck();
  }

  /**
   * 渲染循环
   */
  private renderLoop(): void {
    if (!this.state.isPlaying) {
      return;
    }

    // 从缓冲区获取下一帧
    const frame = this.getNextFrame();

    if (frame) {
      // 渲染帧
      this.renderFrame(frame);
      this.lastPlayedSequence = frame.sequence;
      this.frameCount++;
    }

    // 继续循环
    requestAnimationFrame(() => this.renderLoop());
  }

  /**
   * 获取下一帧
   * @returns 下一帧或 null
   */
  private getNextFrame(): ReceivedFrame | null {
    if (this.frameBuffer.length === 0) {
      return null;
    }

    // 如果启用帧同步，找到延迟最接近目标的帧
    if (this.config.enableSync) {
      const targetLatency = this.config.targetLatency || 100;
      const now = Date.now();

      // 查找延迟最接近目标的帧
      let bestFrameIndex = -1;
      let minDiff = Infinity;

      for (let i = 0; i < this.frameBuffer.length; i++) {
        const frame = this.frameBuffer[i];
        const latency = now - frame.timestamp;
        const diff = Math.abs(latency - targetLatency);

        if (diff < minDiff) {
          minDiff = diff;
          bestFrameIndex = i;
        }
      }

      if (bestFrameIndex >= 0) {
        // 移除已选择的帧及之前的所有帧
        const frame = this.frameBuffer[bestFrameIndex];
        this.frameBuffer = this.frameBuffer.slice(bestFrameIndex + 1);
        return frame;
      }
    }

    // 默认返回最早的帧
    return this.frameBuffer.shift() || null;
  }

  /**
   * 渲染帧
   * @param frame 视频帧
   */
  private renderFrame(frame: ReceivedFrame): void {
    // 创建图像对象
    const img = new Image();
    img.onload = () => {
      // 调整 canvas 尺寸
      if (this.canvas.width !== frame.width || this.canvas.height !== frame.height) {
        this.canvas.width = frame.width;
        this.canvas.height = frame.height;
      }

      // 绘制图像
      this.ctx.drawImage(img, 0, 0, frame.width, frame.height);
    };
    img.onerror = (error) => {
      console.error('加载帧失败:', error);
    };
    img.src = frame.data;
  }

  /**
   * 启动 FPS 检查
   */
  private startFpsCheck(): void {
    if (this.fpsCheckInterval !== null) {
      return;
    }

    this.fpsCheckInterval = window.setInterval(() => {
      this.checkFps();
    }, 1000);
  }

  /**
   * 停止 FPS 检查
   */
  private stopFpsCheck(): void {
    if (this.fpsCheckInterval !== null) {
      clearInterval(this.fpsCheckInterval);
      this.fpsCheckInterval = null;
    }
  }

  /**
   * 检查 FPS
   */
  private checkFps(): void {
    const now = Date.now();
    const elapsed = (now - this.lastFrameTime) / 1000;
    const fps = this.frameCount / elapsed;

    if (fps > 0) {
      this.state.frameRate = Math.round(fps);
    }

    // 更新历史记录
    this.fpsHistory.push(this.state.frameRate);
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }

    // 重置计数器
    this.frameCount = 0;
    this.lastFrameTime = now;
  }

  /**
   * 获取平均 FPS
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
   * 获取接收状态
   * @returns 接收状态
   */
  public getState(): ReceiveState {
    return { ...this.state };
  }

  /**
   * 获取缓冲区长度
   * @returns 缓冲区长度
   */
  public getBufferLength(): number {
    return this.frameBuffer.length;
  }

  /**
   * 更新配置
   * @param config 新的配置
   */
  public updateConfig(config: Partial<VideoReceiverConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 截图
   * @returns Base64 图片
   */
  public captureFrame(): string | null {
    if (this.canvas.width === 0 || this.canvas.height === 0) {
      return null;
    }

    return this.canvas.toDataURL('image/jpeg', 0.85);
  }
}

/**
 * 创建视频流接收器的工厂函数
 * @param config 接收器配置
 * @returns 视频流接收器实例
 */
export const createVideoStreamReceiver = (
  config: VideoReceiverConfig
): VideoStreamReceiver => {
  return new VideoStreamReceiver(config);
};

export default VideoStreamReceiver;