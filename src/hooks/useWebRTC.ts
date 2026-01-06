/**
 * WebRTC Hook
 * 管理摄像头访问权限、视频流初始化、媒体约束、流状态和资源清理
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// 调试日志
const DEBUG_WEBCAM = true;
const logDebug = (message: string, data?: any) => {
  if (DEBUG_WEBCAM) {
    console.log(`[WebRTC Hook] ${message}`, data || '');
  }
};
const logError = (message: string, error?: any) => {
  console.error(`[WebRTC Hook] ${message}`, error || '');
};

import {
  getMediaConstraints,
  RESOLUTIONS,
  FRAME_RATES,
  CameraDeviceType,
} from '../config/streamConfig';

/**
 * 视频流状态接口
 */
export interface StreamState {
  isStreaming: boolean; // 是否正在流式传输
  isConnected: boolean; // 是否已连接
  hasPermission: boolean; // 是否有摄像头权限
  isLoading: boolean; // 是否正在加载
  error: string | null; // 错误信息
  errorType: 'permission' | 'device' | 'readable' | 'general' | null; // 错误类型
  frameRate: number; // 当前帧率
  resolution: { width: number; height: number }; // 当前分辨率
}

/**
 * 设备信息接口
 */
export interface DeviceInfo {
  deviceId: string; // 设备 ID
  label: string; // 设备名称
  kind: string; // 设备类型
}

/**
 * 诊断信息接口
 */
export interface DiagnosticInfo {
  // 环境信息
  browserName: string;
  browserVersion: string;
  os: string;
  isSecureContext: boolean;
  protocol: string;
  hostname: string;
  
  // API支持
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasEnumerateDevices: boolean;
  
  // 设备信息
  deviceCount: number;
  devices: DeviceInfo[];
  hasCurrentDevice: boolean;
  
  // 权限状态
  hasPermission: boolean;
  permissionDenied: boolean;
  
  // 视频流状态
  isStreaming: boolean;
  hasVideoTracks: boolean;
  videoWidth: number;
  videoHeight: number;
  
  // 错误信息
  errors: string[];
  warnings: string[];
  
  // 建议
  suggestions: string[];
}

/**
 * WebRTC Hook 属性
 */
export interface UseWebRTCProps {
  onSuccess?: (stream: MediaStream) => void; // 成功回调
  onError?: (error: Error) => void; // 错误回调
  onFrameRateChange?: (fps: number) => void; // 帧率变化回调
  targetFrameRate?: number; // 目标帧率
  resolution?: keyof typeof RESOLUTIONS; // 目标分辨率
  facingMode?: CameraDeviceType; // 摄像头朝向
}

/**
 * 媒体约束选项
 */
export interface MediaConstraintOptions {
  resolution?: typeof RESOLUTIONS[keyof typeof RESOLUTIONS];
  frameRate?: number;
  facingMode?: CameraDeviceType;
  deviceId?: string;
}

/**
 * 检查浏览器是否支持 WebRTC
 */
const checkBrowserSupport = (): boolean => {
  const hasMediaDevices = !!(navigator as any).mediaDevices;
  const hasGetUserMedia = hasMediaDevices && typeof (navigator as any).mediaDevices.getUserMedia === 'function';
  const hasEnumerateDevices = hasMediaDevices && typeof (navigator as any).mediaDevices.enumerateDevices === 'function';
  
  const isSupported = hasMediaDevices && hasGetUserMedia && hasEnumerateDevices;
  
  if (!isSupported) {
    logError('浏览器不支持 WebRTC API');
  }
  
  return isSupported;
};

/**
 * WebRTC Hook
 * @param props Hook 属性
 * @returns 视频流相关的状态和方法
 */
export const useWebRTC = (props: UseWebRTCProps = {}) => {
  const {
    onSuccess,
    onError,
    onFrameRateChange,
    targetFrameRate = FRAME_RATES.HIGH,
    resolution: targetResolution = 'MEDIUM',
    facingMode: targetFacingMode = 'user',
  } = props;

  // 视频流引用
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 帧率监控
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  const fpsCheckIntervalRef = useRef<number | null>(null);

  // 状态管理
  const [state, setState] = useState<StreamState>({
    isStreaming: false,
    isConnected: false,
    hasPermission: false,
    isLoading: false,
    error: null,
    errorType: null,
    frameRate: targetFrameRate,
    resolution: RESOLUTIONS[targetResolution],
  });

  // 设备列表
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * 更新状态的辅助函数
   */
  const updateState = useCallback((updates: Partial<StreamState>) => {
    setState((prev: StreamState) => ({ ...prev, ...updates }));
  }, []);

  /**
   * 计算帧率
   */
  const calculateFrameRate = useCallback(() => {
    const now = Date.now();
    const elapsed = (now - lastFrameTimeRef.current) / 1000; // 转换为秒
    const fps = frameCountRef.current / elapsed;

    // 更新帧率状态
    if (fps > 0 && fps !== state.frameRate) {
      updateState({ frameRate: Math.round(fps) });
      onFrameRateChange?.(Math.round(fps));
    }

    // 重置计数器
    frameCountRef.current = 0;
    lastFrameTimeRef.current = now;
  }, [state.frameRate, updateState, onFrameRateChange]);

  /**
   * 开始帧率监控
   */
  const startFrameRateMonitor = useCallback(() => {
    frameCountRef.current = 0;
    lastFrameTimeRef.current = Date.now();

    fpsCheckIntervalRef.current = setInterval(() => {
      calculateFrameRate();
    }, 1000); // 每秒计算一次帧率
  }, [calculateFrameRate]);

  /**
   * 停止帧率监控
   */
  const stopFrameRateMonitor = useCallback(() => {
    if (fpsCheckIntervalRef.current) {
      clearInterval(fpsCheckIntervalRef.current);
      fpsCheckIntervalRef.current = null;
    }
  }, []);

  /**
   * 获取可用设备列表（增强版）
   */
  const getDevices = useCallback(async (): Promise<DeviceInfo[]> => {
    try {
      logDebug('========== 开始设备枚举 ==========');
      
      // 检查浏览器支持
      const isBrowserSupported = checkBrowserSupport();
      logDebug('浏览器支持检查:', { isBrowserSupported });
      
      if (!isBrowserSupported) {
        updateState({ 
          error: '浏览器不支持摄像头访问，请使用现代浏览器', 
          errorType: 'general' 
        });
        return [];
      }

      // 检查安全上下文
      const isSecureContext = window.isSecureContext || 
                             window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
      logDebug('安全上下文检查:', { 
        isSecureContext, 
        protocol: window.location.protocol,
        hostname: window.location.hostname 
      });
      
      if (!isSecureContext) {
        logError('非安全上下文警告：某些浏览器可能限制摄像头访问');
      }

      logDebug('开始调用 enumerateDevices...');
      
      // 获取所有媒体设备
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      logDebug('所有媒体设备数量:', mediaDevices.length);
      
      // 详细记录所有设备
      mediaDevices.forEach((device, index) => {
        logDebug(`设备 ${index + 1}:`, {
          kind: device.kind,
          label: device.label || '<无标签（需要权限）>',
          deviceId: device.deviceId === '' ? '<空>' : device.deviceId.slice(0, 8) + '...',
          groupId: device.groupId
        });
      });

      // 筛选视频输入设备
      const cameraDevices = mediaDevices
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `摄像头 ${index + 1} (需要权限以显示名称)`,
          kind: device.kind,
        }));

      logDebug('筛选后的摄像头设备:', {
        total: cameraDevices.length,
        devices: cameraDevices
      });
      
      setDevices(cameraDevices);
      
      if (cameraDevices.length === 0) {
        logError('未检测到任何摄像头设备');
        updateState({ 
          error: '未检测到摄像头设备，请确保摄像头已连接并允许访问', 
          errorType: 'device' 
        });
      } else {
        logDebug('设备列表获取成功');
      }

      logDebug('========== 设备枚举完成 ==========');
      return cameraDevices;
    } catch (error) {
      const err = error as Error;
      logError('获取设备列表失败', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      
      updateState({ 
        error: `获取设备列表失败: ${err.message}`, 
        errorType: 'general' 
      });
      onError?.(err);
      return [];
    }
  }, [updateState, onError]);

  /**
   * 请求摄像头权限（增强版）
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    logDebug('========== 开始请求摄像头权限 ==========');
    updateState({ isLoading: true, error: null, errorType: null });

    // 检查浏览器支持
    const isBrowserSupported = checkBrowserSupport();
    logDebug('浏览器支持检查:', isBrowserSupported);
    
    if (!isBrowserSupported) {
      updateState({ 
        isLoading: false,
        error: '浏览器不支持摄像头访问，请使用现代浏览器 (Chrome, Firefox, Edge, Safari)', 
        errorType: 'general' 
      });
      onError?.(new Error('浏览器不支持 WebRTC'));
      return false;
    }

    // 检查 navigator.mediaDevices
    logDebug('navigator.mediaDevices 检查:', {
      exists: !!navigator.mediaDevices,
      hasGetUserMedia: !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function')
    });

    try {
      // 检查是否在 HTTPS 环境或 localhost
      const isSecureContext = window.isSecureContext || 
                             window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
      
      logDebug('安全上下文检查:', { 
        isSecureContext,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        windowLocation: window.location.href
      });
      
      if (!isSecureContext) {
        logError('错误：非安全上下文，浏览器禁止摄像头访问');
        updateState({ 
          isLoading: false,
          error: '摄像头访问需要 HTTPS 或 localhost 环境\n当前环境: ' + window.location.hostname, 
          errorType: 'general' 
        });
        onError?.(new Error('非安全上下文'));
        return false;
      }

      logDebug('准备调用 getUserMedia 获取临时流...');
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: true,
      };
      logDebug('getUserMedia 参数:', JSON.stringify(constraints, null, 2));

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      logDebug('成功获取临时媒体流', {
        streamExists: !!stream,
        tracksCount: stream.getTracks().length,
        videoTracksCount: stream.getVideoTracks().length,
        trackTypes: stream.getTracks().map(t => t.kind)
      });

      // 检查视频轨道
      if (stream.getVideoTracks().length === 0) {
        logError('错误：获取的流中没有视频轨道');
        stream.getTracks().forEach(track => track.stop());
        updateState({
          isLoading: false,
          error: '获取的视频流中没有视频轨道',
          errorType: 'device'
        });
        return false;
      }

      // 保存设备 ID
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      logDebug('视频轨道详细信息:', {
        deviceId: settings.deviceId,
        width: settings.width,
        height: settings.height,
        frameRate: settings.frameRate,
        facingMode: settings.facingMode
      });
      
      if (settings.deviceId) {
        setCurrentDeviceId(settings.deviceId);
        logDebug('成功设置当前设备ID:', settings.deviceId.slice(0, 8) + '...');
      }

      // 停止临时流
      logDebug('停止临时流以释放资源...');
      stream.getTracks().forEach((track, index) => {
        logDebug(`停止轨道 ${index + 1}:`, {
          kind: track.kind,
          label: track.label
        });
        track.stop();
      });
      logDebug('临时流已停止');

      updateState({
        isLoading: false,
        hasPermission: true,
        error: null,
        errorType: null,
      });

      logDebug('摄像头权限请求成功！现在获取详细的设备列表...');

      // 重新获取带标签的设备列表
      const devicesList = await getDevices();
      logDebug(`获取到 ${devicesList.length} 个摄像头设备`);
      setIsInitialized(true);

      logDebug('========== 权限请求完成 ==========');
      return true;
    } catch (error) {
      const err = error as Error;
      logError('摄像头权限请求失败', {
        name: err.name,
        message: err.message,
        constraint: (err as any).constraint,
        stack: err.stack
      });

      let errorMessage = '';
      let errorType: StreamState['errorType'] = 'general';

      if (err.name === 'NotAllowedError') {
        errorMessage = '用户拒绝了摄像头访问权限\n\n解决方法：\n1. 点击浏览器地址栏的锁图标\n2. 找到"摄像头"权限，设置为"允许"\n3. 刷新页面重试';
        errorType = 'permission';
      } else if (err.name === 'NotFoundError') {
        errorMessage = '未找到摄像头设备\n\n解决方法：\n1. 检查摄像头是否已正确连接\n2. 确认设备管理器中摄像头已被识别\n3. 尝试重新插拔摄像头';
        errorType = 'device';
      } else if (err.name === 'NotReadableError') {
        errorMessage = '摄像头无法读取\n\n可能原因：\n1. 摄像头已被其他应用占用\n2. 摄像头驱动程序问题\n3. 权限冲突\n\n解决方法：\n1. 关闭其他使用摄像头的应用\n2. 重启浏览器\n3. 重启计算机';
        errorType = 'readable';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = '摄像头不支持请求的配置\n\n原因: ' + (err.message || '未知');
        errorType = 'general';
      } else if (err.name === 'TypeError') {
        errorMessage = '摄像头请求参数无效: ' + err.message;
        errorType = 'general';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = '浏览器不支持摄像头访问\n\n请使用现代浏览器 (Chrome, Firefox, Edge, Safari)';
        errorType = 'general';
      } else {
        errorMessage = `请求摄像头权限失败: ${err.message}\n错误类型: ${err.name}`;
        errorType = 'general';
      }

      updateState({
        isLoading: false,
        hasPermission: false,
        error: errorMessage,
        errorType: errorType,
      });

      logDebug('错误状态已更新:', { 
        errorMessage: errorMessage.substring(0, 50) + '...', 
        errorType 
      });
      onError?.(err);
      logDebug('========== 权限请求失败 ==========');
      return false;
    }
  }, [updateState, onError, getDevices]);

  /**
   * 尝试启动视频流（带回退策略）
   */
  const tryStartStream = async (
    constraints: MediaStreamConstraints,
    attempt: number,
    maxAttempts: number
  ): Promise<{ stream: MediaStream | null; error: string | null }> => {
    try {
      logDebug(`尝试第 ${attempt}/${maxAttempts} 次获取媒体流...`);
      logDebug('getUserMedia 约束:', JSON.stringify(constraints, null, 2));

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      logDebug(`✓ 第 ${attempt} 次尝试成功`, {
        tracksCount: stream.getTracks().length,
        videoTracksCount: stream.getVideoTracks().length
      });
      
      return { stream, error: null };
    } catch (error) {
      const err = error as Error;
      logError(`✗ 第 ${attempt} 次尝试失败`, {
        name: err.name,
        message: err.message,
        constraint: (err as any).constraint
      });
      
      return { stream: null, error: err.message };
    }
  };

  /**
   * 初始化视频流（增强版，带回退策略）
   */
  const startStream = useCallback(async (options?: MediaConstraintOptions): Promise<MediaStream | null> => {
    try {
      logDebug('========== 开始启动视频流 ==========');
      logDebug('传入参数:', options);
      updateState({ isLoading: true, error: null, errorType: null });

      // 检查初始化状态
      if (!isInitialized) {
        logDebug('未初始化，先请求摄像头权限');
        const hasPermission = await requestPermission();
        if (!hasPermission) {
          logError('权限请求失败，无法启动视频流');
          return null;
        }
      }

      // 检查 video 元素引用
      logDebug('检查 video 元素引用:', {
        videoRefExists: !!videoRef.current,
        videoRefValue: videoRef.current ? videoRef.current.tagName : 'null'
      });

      // 准备参数
      const requestedResolution = options?.resolution || RESOLUTIONS[targetResolution];
      const requestedFrameRate = options?.frameRate || targetFrameRate;
      const requestedFacingMode = options?.facingMode || targetFacingMode;
      const requestedDeviceId = options?.deviceId;

      logDebug('启动参数:', {
        resolution: requestedResolution,
        frameRate: requestedFrameRate,
        facingMode: requestedFacingMode,
        deviceId: requestedDeviceId ? requestedDeviceId.slice(0, 8) + '...' : '未指定'
      });

      // 回退策略：从高分辨率到低分辨率，从指定设备到默认设备
      const resolutionFallback = [
        requestedResolution,
        { width: 640, height: 480 },  // VGA
        { width: 320, height: 240 },  // QVGA
      ];
      
      const deviceFallback = requestedDeviceId
        ? [requestedDeviceId, ...devices.filter(d => d.deviceId !== requestedDeviceId).map(d => d.deviceId)]
        : [...devices.map(d => d.deviceId)];
      
      const frameRateFallback = [
        requestedFrameRate,
        30,  // 标准帧率
        15,  // 低帧率
      ];

      let lastError: string | null = null;
      let stream: MediaStream | null = null;

      // 尝试组合策略
      for (let r = 0; r < resolutionFallback.length && !stream; r++) {
        const resolution = resolutionFallback[r];
        
        for (let d = 0; d < deviceFallback.length && !stream; d++) {
          const deviceId = deviceFallback[d];
          
          for (let f = 0; f < frameRateFallback.length && !stream; f++) {
            const frameRate = frameRateFallback[f];
            
            // 构建约束
            let constraints: MediaStreamConstraints;
            
            if (deviceId && deviceId !== '') {
              // 使用特定设备 ID
              constraints = {
                audio: false,
                video: {
                  deviceId: { exact: deviceId },
                  width: {
                    ideal: resolution.width,
                    min: 320,
                    max: 1920,
                  },
                  height: {
                    ideal: resolution.height,
                    min: 240,
                    max: 1080,
                  },
                  frameRate: {
                    ideal: frameRate,
                    min: 10,
                    max: 60,
                  },
                },
              };
            } else {
              // 使用朝向方式
              constraints = {
                audio: false,
                video: {
                  facingMode: requestedFacingMode,
                  width: {
                    ideal: resolution.width,
                    min: 320,
                    max: 1920,
                  },
                  height: {
                    ideal: resolution.height,
                    min: 240,
                    max: 1080,
                  },
                  frameRate: {
                    ideal: frameRate,
                    min: 10,
                    max: 60,
                  },
                },
              };
            }

            logDebug(`尝试组合 ${r + 1}-${d + 1}-${f + 1}:`, {
              resolution: `${resolution.width}x${resolution.height}`,
              deviceId: deviceId ? deviceId.slice(0, 8) + '...' : 'none',
              frameRate
            });

            const result = await tryStartStream(constraints, r * 9 + d * 3 + f + 1, 9);
            
            if (result.stream) {
              stream = result.stream;
              logDebug('✓ 成功获取视频流!');
            } else {
              lastError = result.error;
            }
          }
        }
      }

      if (!stream) {
        const errorMessage = lastError || '无法获取视频流，所有尝试均失败';
        logError('视频流启动失败', errorMessage);
        updateState({
          isLoading: false,
          isStreaming: false,
          isConnected: false,
          error: errorMessage,
          errorType: 'readable',
        });
        onError?.(new Error(errorMessage));
        return null;
      }

      // 保存流
      streamRef.current = stream;

      // 获取实际视频轨道配置
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      const actualResolution = {
        width: settings.width || 640,
        height: settings.height || 480,
      };
      
      logDebug('实际视频配置:', {
        width: actualResolution.width,
        height: actualResolution.height,
        frameRate: settings.frameRate,
        deviceId: settings.deviceId ? settings.deviceId.slice(0, 8) + '...' : 'unknown'
      });

      // 保存当前设备 ID
      if (settings.deviceId) {
        setCurrentDeviceId(settings.deviceId);
      }

      // 配置 video 元素
      if (videoRef.current) {
        logDebug('配置 video 元素...');
        const video = videoRef.current;
        
        // 记录当前状态
        logDebug('video 元素当前状态:', {
          readyState: video.readyState,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          srcObjectExists: !!video.srcObject,
          autoplay: video.autoplay,
          playsInline: video.playsInline,
          muted: video.muted
        });
        
        // 设置 srcObject
        video.srcObject = stream;
        logDebug('已设置 video.srcObject');
        
        // 配置属性
        video.muted = true;
        video.playsInline = true;
        video.autoplay = false;
        video.crossOrigin = 'anonymous';
        
        logDebug('video 属性配置完成');
          
        try {
          logDebug('等待视频元素加载...');
          await new Promise<void>((resolve, reject) => {
            if (!videoRef.current) {
              reject(new Error('Video element not found'));
              return;
            }
            
            let resolved = false;
            let timeoutId: number;
            
            const cleanup = () => {
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
              // 清除事件监听器
              if (videoRef.current) {
                videoRef.current.onloadedmetadata = null;
                videoRef.current.onerror = null;
              }
            };
            
            videoRef.current.onloadedmetadata = () => {
              if (resolved) return;
              resolved = true;
              cleanup();
               
              // 检查视频状态
              const video = videoRef.current!;
              logDebug('视频元数据已加载', {
                readyState: video.readyState,
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                duration: video.duration
              });
               
              resolve();
            };
            
            videoRef.current.onerror = (e) => {
              if (resolved) return;
              resolved = true;
              cleanup();
               
              const video = videoRef.current!;
              const errorDetail = {
                error: video.error,
                errorCode: video.error?.code,
                errorMessage: video.error?.message,
                srcObjectExists: !!video.srcObject,
                readyState: video.readyState
              };
              logError('视频元素错误', errorDetail);
              reject(new Error(`Video error: ${video.error?.message || 'Unknown error'}`));
            };
            
            // 超时处理 - 检查视频是否实际准备好
            timeoutId = window.setTimeout(() => {
              if (resolved) return;
              resolved = true;
              cleanup();
               
              const video = videoRef.current!;
              logError('视频加载超时', {
                readyState: video.readyState,
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                srcObjectExists: !!video.srcObject,
                paused: video.paused,
                currentTime: video.currentTime
              });
               
              // 如果视频已经有有效的尺寸和流，说明基本准备好了
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                logDebug('视频已有有效尺寸，继续');
                resolve();
              } else {
                reject(new Error('Video load timeout: 无法获取视频流'));
              }
            }, 15000); // 增加超时时间到15秒
          });
          
          logDebug('播放视频...检查播放状态');
          const video = videoRef.current;
          
          if (video.paused) {
            try {
              await video.play();
              logDebug('视频播放成功', {
                paused: video.paused,
                currentTime: video.currentTime
              });
            } catch (playError) {
              const err = playError as Error;
              logError('视频播放失败', {
                name: err.name,
                message: err.message,
                videoState: {
                  paused: video.paused,
                  readyState: video.readyState,
                  videoWidth: video.videoWidth,
                  videoHeight: video.videoHeight
                }
              });
               
              // 如果是自动播放限制错误，提供更友好的提示
              if (err.name === 'NotAllowedError') {
                throw new Error('浏览器阻止了自动播放，请点击页面允许播放');
              } else {
                throw new Error(`视频播放失败: ${err.message}`);
              }
            }
          } else {
            logDebug('视频已在播放中');
          }
        } catch (playError) {
          logError('视频播放失败', playError);
          
          const error = playError as Error;
          let errorMessage = `视频播放失败: ${error.message}`;
          let errorType: StreamState['errorType'] = 'general';
          
          // 根据错误类型提供更具体的错误信息
          if (error.message.includes('timeout')) {
            errorMessage = '视频加载超时：摄像头可能故障或被占用，请检查设备连接';
            errorType = 'readable';
          } else if (error.message.includes('NotAllowedError') || error.message.includes('自动播放')) {
            errorMessage = '浏览器阻止了视频播放，请刷新页面并点击允许';
            errorType = 'permission';
          }
          
          updateState({
            error: errorMessage,
            errorType: errorType
          });
          throw playError;
        }
      } else {
        logDebug('⚠ 没有找到 video 元素，无法绑定视频流');
        logDebug('提示：请确保在调用 startStream 之前正确传入了 videoRef');
      }

      // 监听帧
      if (videoRef.current) {
        const handlePlay = () => {
          logDebug('开始监听视频帧');
          const drawFrame = () => {
            if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
              return;
            }
            frameCountRef.current++;
            requestAnimationFrame(drawFrame);
          };
          drawFrame();
        };
        
        videoRef.current.addEventListener('play', handlePlay, { once: true });
      }

      // 开始帧率监控
      logDebug('启动帧率监控...');
      startFrameRateMonitor();

      // 更新状态为成功
      updateState({
        isLoading: false,
        isStreaming: true,
        isConnected: true,
        hasPermission: true,
        error: null,
        errorType: null,
        resolution: actualResolution,
      });

      logDebug('✓ 视频流启动成功');
      logDebug('========== 视频流启动完成 ==========');
      onSuccess?.(stream);
      return stream;
    } catch (error) {
    const err = error as Error;
    logError('✗ 视频流启动失败', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });

    let errorMessage = '';
    let errorType: StreamState['errorType'] = 'general';

    // 区分不同的错误类型
    if (err.name === 'NotAllowedError') {
      errorMessage = '用户拒绝了摄像头访问权限\n\n解决方法：\n1. 检查浏览器地址栏的权限设置\n2. 允许摄像头访问权限\n3. 刷新页面重试';
      errorType = 'permission';
    } else if (err.name === 'NotFoundError') {
      errorMessage = '未找到摄像头设备\n\n解决方法：\n1. 检查摄像头是否已连接\n2. 确认摄像头未被其他程序占用\n3. 尝试重新插拔摄像头';
      errorType = 'device';
    } else if (err.name === 'NotReadableError') {
      errorMessage = '摄像头无法读取\n\n可能原因：\n1. 摄像头已被其他应用占用\n2. 摄像头硬件故障\n3. 驱动程序问题\n\n解决方法：\n1. 关闭其他使用摄像头的应用\n2. 重新启动浏览器\n3. 重启计算机';
      errorType = 'readable';
    } else if (err.name === 'OverconstrainedError') {
      errorMessage = '摄像头不支持请求的视频配置\n\n尝试降低分辨率或帧率\n当前配置可能超出了摄像头能力的限制';
      errorType = 'general';
    } else if (err.name === 'NotSupportedError') {
      errorMessage = '浏览器不支持此功能\n\n请使用现代浏览器：Chrome、Firefox、Edge 或 Safari';
      errorType = 'general';
    } else if (err.message.includes('timeout') || err.message.includes('超时')) {
      errorMessage = '视频加载超时：无法获取视频流\n\n可能原因：\n1. 摄像头响应过慢\n2. 网络问题\n3. 摄像头驱动问题\n\n解决方法：\n1. 检查摄像头连接\n2. 尝试更换摄像头\n3. 重启浏览器和计算机';
      errorType = 'readable';
    } else if (err.message.includes('Video error')) {
      errorMessage = '视频元素错误\n\n请检查：\n1. 摄像头是否正常工作\n2. 浏览器是否支持\n3. 是否有其他程序占用了摄像头';
      errorType = 'readable';
    } else {
      errorMessage = `启动视频流失败\n错误类型: ${err.name}\n错误信息: ${err.message}\n\n请检查浏览器控制台获取更多详细信息`;
      errorType = 'general';
    }

    updateState({
      isLoading: false,
      isStreaming: false,
      isConnected: false,
      error: errorMessage,
      errorType: errorType,
    });

    logDebug('错误状态已更新:', {
      errorType,
      errorMessage: errorMessage.substring(0, 80) + '...'
    });
    onError?.(err);
    logDebug('========== 视频流启动失败 ==========');
    return null;
    }
  }, [
    isInitialized,
    updateState,
    requestPermission,
    targetResolution,
    targetFrameRate,
    targetFacingMode,
    devices,
    startFrameRateMonitor,
    onSuccess,
    onError,
  ]);

  /**
   * 停止视频流
   */
  const stopStream = useCallback(() => {
    logDebug('停止视频流');
    
    // 停止帧率监控
    stopFrameRateMonitor();

    // 停止所有轨道
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => {
        logDebug('停止轨道:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }

    // 清除 video 元素的 srcObject
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      logDebug('清除 video srcObject');
    }

    updateState({
      isStreaming: false,
      isConnected: false,
      frameRate: 0,
    });

    logDebug('视频流已停止');
  }, [updateState, stopFrameRateMonitor]);

  /**
   * 切换摄像头
   */
  const switchCamera = useCallback(async () => {
    if (devices.length < 2) {
      logDebug('没有可切换的摄像头');
      updateState({ error: '没有可切换的摄像头', errorType: 'device' });
      return null;
    }

    const currentIndex = devices.findIndex((device: DeviceInfo) => device.deviceId === currentDeviceId);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];

    logDebug('切换摄像头', { from: currentDeviceId, to: nextDevice.deviceId });

    // 停止当前流
    stopStream();

    // 启动新流
    return await startStream({ deviceId: nextDevice.deviceId });
  }, [devices, currentDeviceId, stopStream, startStream, updateState]);

  /**
   * 切换分辨率
   */
  const switchResolution = useCallback(async (resolutionKey: keyof typeof RESOLUTIONS) => {
    if (!state.isStreaming && devices.length > 0) {
      logDebug('直接启动新分辨率的流');
      return await startStream({ resolution: RESOLUTIONS[resolutionKey] });
    }

    if (!state.isStreaming) {
      updateState({ error: '请先请求摄像头权限', errorType: 'permission' });
      return null;
    }

    const newResolution = RESOLUTIONS[resolutionKey];
    logDebug('切换分辨率:', resolutionKey);

    // 停止当前流
    stopStream();

    // 启动新分辨率的流
    return await startStream({ resolution: newResolution });
  }, [state.isStreaming, devices.length, stopStream, startStream, updateState]);

  /**
   * 截图
   */
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !streamRef.current) {
      logDebug('无法截图: video 或 stream 为空');
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      logDebug('无法获取 canvas 上下文');
      return null;
    }

    // 设置 canvas 尺寸
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    logDebug('截图尺寸:', { width: canvas.width, height: canvas.height });

    // 绘制视频帧
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 返回 Base64 图片
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  /**
   * 获取视频流
   */
  const getStream = useCallback((): MediaStream | null => {
    return streamRef.current;
  }, []);

  /**
   * 获取浏览器信息
   */
  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      browserName = 'Chrome';
      browserVersion = ua.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browserName = 'Safari';
      browserVersion = ua.match(/Version\/(\d+\.\d+\.\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Firefox')) {
      browserName = 'Firefox';
      browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Edg')) {
      browserName = 'Edge';
      browserVersion = ua.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/)?.[1] || 'Unknown';
    }
    
    // 简单的操作系统检测
    let os = 'Unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS')) os = 'iOS';
    
    return { browserName, browserVersion, os };
  };

  /**
   * 运行诊断
   */
  const runDiagnostics = useCallback(async (): Promise<DiagnosticInfo> => {
    logDebug('========== 开始诊断 ==========');
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // 环境信息
    const { browserName, browserVersion, os } = getBrowserInfo();
    const isSecureContext = window.isSecureContext ||
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';
    
    // API支持检查
    const hasMediaDevices = !!(navigator as any).mediaDevices;
    const hasGetUserMedia = hasMediaDevices && typeof (navigator as any).mediaDevices.getUserMedia === 'function';
    const hasEnumerateDevices = hasMediaDevices && typeof (navigator as any).mediaDevices.enumerateDevices === 'function';
    
    if (!hasMediaDevices) {
      errors.push('浏览器不支持 MediaDevices API');
      suggestions.push(`请使用现代浏览器（推荐 Chrome 90+、Firefox 88+、Edge 90+）`);
    }
    
    if (!hasGetUserMedia) {
      errors.push('浏览器不支持 getUserMedia API');
    }
    
    if (!hasEnumerateDevices) {
      warnings.push('浏览器不支持 enumerateDevices API，可能无法获取设备列表');
    }
    
    // 安全上下文检查
    if (!isSecureContext) {
      errors.push('当前环境不安全，仅在 HTTPS 或 localhost 下才能访问摄像头');
      warnings.push(`当前协议: ${window.location.protocol}, 主机: ${window.location.hostname}`);
      suggestions.push('请使用 HTTPS 协议或在本地 (localhost) 运行');
    }
    
    // 获取设备列表
    let deviceCount = 0;
    let currentDevices: DeviceInfo[] = [];
    try {
      if (hasEnumerateDevices) {
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        currentDevices = mediaDevices
          .filter(d => d.kind === 'videoinput')
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `摄像头 ${index + 1} (需要权限)`,
            kind: device.kind,
          }));
        deviceCount = currentDevices.length;
        
        if (deviceCount === 0) {
          errors.push('未检测到任何摄像头设备');
          suggestions.push('请检查：1. 摄像头是否已连接 2. 摄像头是否在其他应用中被占用 3. 驱动程序是否正常');
        } else {
          logDebug(`检测到 ${deviceCount} 个摄像头设备`);
        }
      }
    } catch (error) {
      errors.push('无法获取设备列表: ' + (error as Error).message);
    }
    
    // 检查权限状态
    let hasPermission = state.hasPermission;
    let permissionDenied = false;
    
    // 尝试获取权限状态（有些浏览器支持）
    try {
      if (hasEnumerateDevices) {
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        permissionDenied = mediaDevices.some(d => d.kind === 'videoinput' && d.label === '');
      }
    } catch (error) {
      // 忽略权限检查错误
    }
    
    if (permissionDenied) {
      warnings.push('摄像头权限可能被拒绝，设备名称未显示');
      suggestions.push('请点击浏览器地址栏的锁图标，允许摄像头访问权限');
    }
    
    // 视频流状态
    let isStreaming = state.isStreaming;
    let hasVideoTracks = streamRef.current ? streamRef.current.getVideoTracks().length > 0 : false;
    let videoWidth = state.resolution.width;
    let videoHeight = state.resolution.height;
    
    if (isStreaming && !hasVideoTracks) {
      errors.push('视频流已启动但没有视频轨道');
    }
    
    // 浏览器兼容性建议
    if (browserName === 'Safari' && parseFloat(browserVersion) < 14) {
      warnings.push(`您使用的 Safari 版本较低 (${browserVersion})，建议升级到 14.0 或更高版本`);
      suggestions.push('升级 Safari 以获得更好的摄像头支持');
    }
    
    if (browserName === 'Chrome' && parseFloat(browserVersion) < 90) {
      warnings.push(`您使用的 Chrome 版本较低 (${browserVersion})，建议升级到 90 或更高版本`);
    }
    
    // 生成最终建议
    if (errors.length === 0 && !isStreaming) {
      suggestions.push('点击"启动摄像头"按钮开始使用');
    }
    
    if (errors.length > 0) {
      suggestions.push('查看下方"故障排除指南"获取更多帮助');
    }
    
    const diagnosticResult: DiagnosticInfo = {
      browserName,
      browserVersion,
      os,
      isSecureContext,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      hasMediaDevices,
      hasGetUserMedia,
      hasEnumerateDevices,
      deviceCount,
      devices: currentDevices,
      hasCurrentDevice: !!currentDeviceId,
      hasPermission,
      permissionDenied,
      isStreaming,
      hasVideoTracks,
      videoWidth,
      videoHeight,
      errors,
      warnings,
      suggestions,
    };
    
    logDebug('诊断完成:', {
      errors: errors.length,
      warnings: warnings.length,
      suggestions: suggestions.length
    });
    
    return diagnosticResult;
  }, [state.hasPermission, state.isStreaming, state.resolution, currentDeviceId, streamRef]);

  /**
   * 重试错误
   */
  const retry = useCallback(async () => {
    logDebug('重试...');
    updateState({ error: null, errorType: null });
    
    if (state.errorType === 'permission') {
      return await requestPermission();
    } else if (state.errorType === 'device') {
      await getDevices();
      return await startStream();
    } else {
      return await startStream();
    }
  }, [state.errorType, requestPermission, getDevices, startStream, updateState]);

  /**
   * 组件卸载时清理资源
   */
  useEffect(() => {
    return () => {
      logDebug('组件卸载，清理资源');
      stopStream();
    };
  }, [stopStream]);

  // 首次加载时初始化
  useEffect(() => {
    if (!isInitialized && !state.hasPermission && !state.error) {
      logDebug('首次加载，检查浏览器支持并获取设备列表');
      getDevices();
    }
  }, [isInitialized, state.hasPermission, state.error, getDevices]);

  return {
    // 状态
    state,
    devices,
    currentDeviceId,
    isInitialized,

    // 引用
    streamRef,
    videoRef,
    canvasRef,

    // 方法
    requestPermission,
    startStream,
    stopStream,
    switchCamera,
    switchResolution,
    captureFrame,
    getDevices,
    getStream,
    retry,
    runDiagnostics,
  };
};

export default useWebRTC;