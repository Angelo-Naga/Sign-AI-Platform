/**
 * 摄像头视图组件
 * 集成 WebRTC 功能，支持实时视频流、性能监控、设备切换和画面控制
 * 新增：演示模式和完善的诊断系统
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Video,
  Monitor,
  Download,
  Play,
  Pause,
  Activity,
  AlertTriangle,
  UserCheck,
  Shield,
  XCircle,
  AlertCircle,
  Zap,
  Bug,
  Info,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';
import {
  useWebRTC,
  type StreamState,
  type DeviceInfo,
  type DiagnosticInfo,
} from '../hooks/useWebRTC';
import {
  RESOLUTIONS,
  FRAME_RATES,
  type CameraDeviceType,
} from '../config/streamConfig';
import {
  createVideoProcessor,
  type VideoFrame,
  type PerformanceMetrics,
} from '../utils/videoProcessor';
import {
  createVideoStreamSender,
  type SendState,
} from '../services/videoStream';
import { DemoModeCanvas } from './DemoModeCanvas';
import { TroubleshootingGuide } from './TroubleshootingGuide';

/**
 * 摄像头配置接口
 */
export interface CameraConfig {
  /** 视频宽度 */
  width?: number;
  /** 视频高度 */
  height?: number;
  /** 帧率 */
  frameRate?: number;
  /** WebSocket 服务器地址 */
  wsUrl?: string;
  /** 是否启用流发送 */
  enableStreaming?: boolean;
}

/**
 * CameraView 组件属性
 */
interface CameraViewProps {
  /** 摄像头配置 */
  config?: CameraConfig;
  /** 是否启动摄像头 */
  active?: boolean;
  /** 镜像模式 */
  mirrored?: boolean;
  /** 摄像头朝向 */
  facingMode?: CameraDeviceType;
  /** 分辨率选项 */
  resolution?: keyof typeof RESOLUTIONS;
  /** 设备切换回调 */
  onDeviceChange?: (deviceId: string) => void;
  /** 帧捕获回调 */
  onFrameCaptured?: (frame: VideoFrame) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 状态变化回调 */
  onStateChange?: (state: StreamState) => void;
  /** 额外样式类 */
  className?: string;
}

/**
 * 摄像头视图组件
 */
export const CameraView: React.FC<CameraViewProps> = ({
  config,
  active = true,
  mirrored = true,
  facingMode = 'user',
  resolution = 'MEDIUM',
  onDeviceChange,
  onFrameCaptured,
  onError,
  onStateChange,
  className = '',
}) => {
  // 演示模式状态
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // 初始化提示状态
  const [showInitPrompt, setShowInitPrompt] = useState(true);
  
  // 诊断面板状态
  const [showDiagnosticPanel, setShowDiagnosticPanel] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo | null>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [troubleshootingSection, setTroubleshootingSection] = useState<string | undefined>();
  
  // WebRTC Hook
  const {
    state,
    devices,
    currentDeviceId,
    isInitialized,
    videoRef,
    canvasRef,
    requestPermission,
    startStream,
    stopStream,
    switchCamera,
    switchResolution,
    captureFrame,
    retry,
    runDiagnostics,
  } = useWebRTC({
    onError: (error) => {
      // 发生错误时自动运行诊断
      runDiagnostics().then(setDiagnosticInfo);
      onError?.(error);
    },
    resolution,
    facingMode,
  });

  // 视频处理器
  const processorRef = useRef<ReturnType<typeof createVideoProcessor> | null>(null);
  const captureIntervalRef = useRef<number | null>(null);

  // 视频流发送器
  const senderRef = useRef<ReturnType<typeof createVideoStreamSender> | null>(null);

  // 本地状态
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [sendState, setSendState] = useState<SendState | null>(null);
  const [currentResolution, setCurrentResolution] = useState<keyof typeof RESOLUTIONS>(resolution);

  /**
   * 初始化视频处理器
   */
  useEffect(() => {
    if (!processorRef.current) {
      processorRef.current = createVideoProcessor({
        targetFrameRate: config?.frameRate || FRAME_RATES.HIGH,
        quality: 0.85,
        enableMirror: mirrored,
      });
    }

    return () => {
      if (processorRef.current) {
        processorRef.current.destroy();
        processorRef.current = null;
      }
    };
  }, [mirrored, config?.frameRate]);

  /**
   * 初始化视频流发送器
   */
  useEffect(() => {
    if (config?.wsUrl && config?.enableStreaming && processorRef.current) {
      senderRef.current = createVideoStreamSender(
        {
          url: config.wsUrl,
          enableAdaptiveQuality: true,
        },
        processorRef.current
      );

      senderRef.current.connect().catch((error) => {
        console.error('视频流发送器连接失败:', error);
      });

      const interval = setInterval(() => {
        if (senderRef.current) {
          setSendState(senderRef.current.getState());
        }
      }, 1000);

      return () => {
        clearInterval(interval);
        if (senderRef.current) {
          senderRef.current.disconnect();
          senderRef.current = null;
        }
      };
    }
  }, [config?.wsUrl, config?.enableStreaming]);

  /**
   * 状态变化回调
   */
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  /**
   * 检查摄像头可用性并显示提示
   */
  useEffect(() => {
    const checkCameraAvailability = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setShowInitPrompt(false);
        return;
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        
        // 如果没有检测到摄像头或处于错误状态，显示提示
        if (!hasCamera || state.error) {
          setShowInitPrompt(true);
        } else {
          // 如果有摄像头，延迟关闭提示
          setTimeout(() => {
            if (state.isStreaming || state.hasPermission) {
              setShowInitPrompt(false);
            }
          }, 3000);
        }
      } catch (error) {
        console.error('检查摄像头可用性失败:', error);
        setShowInitPrompt(true);
      }
    };

    checkCameraAvailability();
  }, [state.isStreaming, state.hasPermission, state.error]);

  /**
   * 启动/停止视频流
   */
  useEffect(() => {
    if (active && !state.isStreaming && state.hasPermission) {
      startStream();
    } else if (!active && state.isStreaming) {
      stopStream();
      stopFrameCapture();
    }
  }, [active, state.isStreaming, state.hasPermission, startStream, stopStream]);

  /**
   * 启动帧捕获
   */
  const startFrameCapture = useCallback(() => {
    if (captureIntervalRef.current || !videoRef.current || !processorRef.current) {
      return;
    }

    const intervalMs = 1000 / (config?.frameRate || FRAME_RATES.HIGH);

    captureIntervalRef.current = window.setInterval(() => {
      if (!videoRef.current || !processorRef.current) return;

      const frame = processorRef.current.captureFrame(videoRef.current);

      if (frame) {
        onFrameCaptured?.(frame);
        if (senderRef.current) {
          senderRef.current.addFrame(frame);
        }
      }

      if (processorRef.current) {
        const metrics = processorRef.current.getPerformanceMetrics();
        setPerformanceMetrics(metrics);
      }
    }, intervalMs);
  }, [config?.frameRate, onFrameCaptured]);

  /**
   * 停止帧捕获
   */
  const stopFrameCapture = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  }, []);

  /**
   * 启动帧捕获当流开始时
   */
  useEffect(() => {
    if (state.isStreaming && active) {
      startFrameCapture();
    } else {
      stopFrameCapture();
    }

    return () => {
      stopFrameCapture();
    };
  }, [state.isStreaming, active, startFrameCapture, stopFrameCapture]);

  /**
   * 请求摄像头权限
   */
  const handleRequestPermission = useCallback(async () => {
    const granted = await requestPermission();
    if (granted && active) {
      await startStream();
    }
  }, [requestPermission, active, startStream]);

  /**
   * 切换摄像头设备
   */
  const handleSwitchCamera = useCallback(async (deviceId?: string) => {
    if (deviceId) {
      // 停止当前流
      stopStream();
      // 启动新流
      await startStream({ deviceId });
      setShowDeviceSelector(false);
      onDeviceChange?.(deviceId);
    } else {
      await switchCamera();
    }
  }, [switchCamera, startStream, stopStream, onDeviceChange]);

  /**
   * 切换分辨率
   */
  const handleResolutionChange = useCallback(async (res: keyof typeof RESOLUTIONS) => {
    setCurrentResolution(res);
    await switchResolution(res);
  }, [switchResolution]);

  /**
   * 截图
   */
  const handleCaptureImage = useCallback(() => {
    const image = captureFrame();
    if (image) {
      setCapturedImage(image);
    }
  }, [captureFrame]);

  /**
   * 下载截图
   */
  const handleDownloadImage = useCallback(() => {
    if (!capturedImage) return;

    const link = document.createElement('a');
    link.href = capturedImage;
    link.download = `capture-${Date.now()}.jpg`;
    link.click();
  }, [capturedImage]);

  /**
   * 切换镜像模式
   */
  const handleToggleMirror = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.destroy();
      processorRef.current = createVideoProcessor({
        targetFrameRate: config?.frameRate || FRAME_RATES.HIGH,
        quality: 0.85,
        enableMirror: !mirrored,
      });
    }
  }, [mirrored, config?.frameRate]);

  /**
   * 运行诊断并显示结果
   */
  const handleRunDiagnostics = useCallback(async () => {
    const info = await runDiagnostics();
    setDiagnosticInfo(info);
    setShowDiagnosticPanel(true);
    
    // 根据诊断结果确定故障排除指南的默认展开部分
    if (info.errors.length > 0) {
      if (info.errors.some(e => e.includes('权限') || e.includes('permission'))) {
        setTroubleshootingSection('permission');
      } else if (info.errors.some(e => e.includes('摄像头') || e.includes('device'))) {
        setTroubleshootingSection('device');
      } else if (info.errors.some(e => e.includes('HTTPS') || e.includes('安全'))) {
        setTroubleshootingSection('https');
      }
    }
  }, [runDiagnostics]);

  /**
   * 切换演示模式
   */
  const toggleDemoMode = useCallback(() => {
    setIsDemoMode(prev => {
      const newMode = !prev;
      if (newMode) {
        // 切换到演示模式时停止真实摄像头
        if (state.isStreaming) {
          stopStream();
        }
      } else {
        // 切换回真实模式，如果已初始化则重新启动
        if (isInitialized && active) {
          requestPermission().then(granted => {
            if (granted) startStream();
          });
        }
      }
      return newMode;
    });
  }, [state.isStreaming, isInitialized, active, stopStream, requestPermission, startStream]);

  /**
   * 处理演示模式的识别结果
   */
  const handleDemoRecognized = useCallback((gesture: string, confidence: number) => {
    console.log(`[演示模式] 识别结果: ${gesture}, 置信度: ${(confidence * 100).toFixed(1)}%`);
    // 这里可以触发识别结果的回调
  }, []);

  /**
   * 根据错误类型获取错误提示
   */
  const getErrorContent = () => {
    if (!state.error) return null;

    switch (state.errorType) {
      case 'permission':
        return {
          icon: <Shield className="w-16 h-16 text-yellow-400 mb-4" />,
          title: '需要摄像头权限',
          description: '请在浏览器设置中允许访问摄像头',
          moreInfo: '或使用演示模式体验产品功能',
          showRetry: true,
          showDemo: true,
          showDiagnostic: true,
        };
      case 'device':
        return {
          icon: <CameraOff className="w-16 h-16 text-red-400 mb-4" />,
          title: '未检测到摄像头',
          description: '请检查摄像头是否已正确连接',
          moreInfo: '建议使用演示模式体验完整功能',
          showRetry: true,
          showDemo: true,
          demoButtonText: '进入演示模式',
          diagnostic: true,
        };
      case 'readable':
        return {
          icon: <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />,
          title: '摄像头无法访问',
          description: '摄像头可能已被其他应用程序占用',
          moreInfo: '您可以直接使用演示模式',
          showRetry: true,
          showDemo: true,
          demoButtonText: '使用演示模式',
          showDiagnostic: true,
        };
      default:
        return {
          icon: <XCircle className="w-16 h-16 text-red-400 mb-4" />,
          title: '摄像头启动失败',
          description: `${state.error.substring(0, 80)}...`,
          moreInfo: '无需摄像头也能体验核心功能',
          showRetry: true,
          showDemo: true,
          showDiagnostic: true,
        };
    }
  };

  const errorContent = getErrorContent();

  return (
    <>
      {/* 故障排除指南弹窗 */}
      {showTroubleshooting && (
        <TroubleshootingGuide
          onClose={() => setShowTroubleshooting(false)}
          openSection={troubleshootingSection}
        />
      )}

      <div className={`relative rounded-lg overflow-hidden bg-gray-900 ${className}`}>
        {/* 初始化提示 - 在摄像头未启动时显示 */}
        <AnimatePresence>
          {showInitPrompt && !state.isStreaming && !state.error && !isDemoMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm"
            >
              <div className="text-center px-6 py-8 max-w-md">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mb-6"
                >
                  <Video className="w-20 h-20 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">启动摄像头</h3>
                  <p className="text-gray-400 mb-6">
                    允许访问摄像头以体验完整功能，或使用演示模式无需摄像头也能体验
                  </p>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col gap-3"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRequestPermission}
                    className="flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-bold text-lg shadow-lg hover:shadow-purple-500/30 transition-all duration-200"
                  >
                    <Camera className="w-6 h-6" />
                    <span>启动摄像头</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowInitPrompt(false);
                      setIsDemoMode(true);
                    }}
                    className="flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-bold text-lg shadow-lg hover:shadow-green-500/30 transition-all duration-200"
                  >
                    <Play className="w-6 h-6" />
                    <span>进入演示模式</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowInitPrompt(false)}
                    className="flex items-center justify-center space-x-2 px-8 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-all duration-200"
                  >
                    <X className="w-5 h-5" />
                    <span>稍后</span>
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 演示模式或真实摄像头 */}
        {isDemoMode ? (
          <DemoModeCanvas
            onRecognized={handleDemoRecognized}
            className="w-full h-full"
          />
        ) : (
          <>
            {/* 视频元素 */}
            <video
              ref={videoRef}
              autoPlay={false}
              playsInline
              muted
              className={`
                w-full h-full object-cover
                ${mirrored ? 'scale-x-[-1]' : ''}
                transition-transform duration-300
              `}
            />

            {/* 用于截帧的画布（隐藏） */}
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}

      {/* 加载状态 */}
      <AnimatePresence>
        {state.isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <RefreshCw className="w-12 h-12 text-white mb-4 animate-spin" />
            <p className="text-white text-lg">正在启动摄像头...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 未初始化状态 */}
      <AnimatePresence>
        {!isInitialized && !state.isLoading && !state.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-sm"
          >
            <Camera className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-white text-lg mb-4">准备启动摄像头</p>
            <button
              onClick={handleRequestPermission}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center"
            >
              <Camera className="w-5 h-5 mr-2" />
              启动摄像头
            </button>
            <p className="text-gray-400 text-sm mt-4 text-center px-4">
              需要摄像头权限以进行手语识别
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误状态 */}
      <AnimatePresence>
        {errorContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            {errorContent.icon}
            <h3 className="text-white text-xl font-bold mb-2">{errorContent.title}</h3>
            <p className="text-gray-300 text-center mb-4 max-w-md">{errorContent.description}</p>
            <div className="flex gap-3 flex-wrap justify-center">
              {errorContent.showRetry && (
                <button
                  onClick={retry}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重试
                </button>
              )}
              {errorContent.showDemo && (
                <button
                  onClick={toggleDemoMode}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  试用演示模式
                </button>
              )}
              {errorContent.showDiagnostic && (
                <button
                  onClick={handleRunDiagnostics}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  诊断问题
                </button>
              )}
              {state.errorType === 'device' && devices.length > 0 && (
                <button
                  onClick={() => setShowDeviceSelector(true)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  选择设备
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 摄像头未激活状态 */}
      <AnimatePresence>
        {!active && !state.error && isInitialized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm"
          >
            <Camera className="w-16 h-16 text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">摄像头已关闭</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 顶部控制栏 */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
        {/* 左侧：设备切换和状态 */}
        <div className="flex flex-col space-y-2 pointer-events-auto">
          {/* 设备切换按钮 */}
          {devices.length > 1 && state.isStreaming && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setShowDeviceSelector(!showDeviceSelector)}
              className="bg-black/50 text-white px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20 hover:bg-black/70 transition-colors flex items-center"
              title="选择摄像头"
            >
              <Camera className="w-4 h-4 mr-2" />
              <span className="text-sm">
                {devices.find(d => d.deviceId === currentDeviceId)?.label || '选择摄像头'}
              </span>
            </motion.button>
          )}

          {/* 状态指示器 */}
          {state.isStreaming && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center bg-black/50 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20"
            >
              <Video className="w-4 h-4 text-green-400 mr-2" />
              <span className="text-white text-sm">直播中</span>
              {performanceMetrics && (
                <span className="text-gray-300 text-xs ml-2">
                  {performanceMetrics.fps} FPS
                </span>
              )}
            </motion.div>
          )}
        </div>

        {/* 右侧：性能监控 */}
        {state.isStreaming && (performanceMetrics || sendState) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-end space-y-1 pointer-events-auto"
          >
            {performanceMetrics && (
              <div className="bg-black/50 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                <div className="flex items-center text-xs text-gray-300 mb-1">
                  <Activity className="w-3 h-3 mr-1" />
                  <span>本地性能</span>
                </div>
                <div className="text-white text-sm">
                  {performanceMetrics.fps} FPS | {performanceMetrics.bufferSize} 帧
                </div>
              </div>
            )}
            {sendState && config?.enableStreaming && (
              <div className="bg-black/50 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                <div className="flex items-center text-xs text-gray-300 mb-1">
                  <Activity className="w-3 h-3 mr-1" />
                  <span>网络状态</span>
                </div>
                <div className="text-white text-sm">
                  {sendState.bytesSent / 1024} KB | {sendState.avgLatency}ms
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* 设备选择器 */}
      <AnimatePresence>
        {showDeviceSelector && devices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-4 z-50 bg-gray-900/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-700 p-2 min-w-[200px]"
          >
            <div className="text-white text-sm font-semibold mb-2 px-2">选择摄像头</div>
            {devices.map((device) => (
              <button
                key={device.deviceId}
                onClick={() => handleSwitchCamera(device.deviceId)}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center text-sm ${
                  device.deviceId === currentDeviceId
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Camera className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{device.label}</span>
                {device.deviceId === currentDeviceId && (
                  <UserCheck className="w-4 h-4 ml-auto text-green-400" />
                )}
              </button>
            ))}
            <button
              onClick={() => setShowDeviceSelector(false)}
              className="w-full mt-2 text-center px-3 py-2 rounded-md transition-colors text-gray-400 hover:text-gray-200 hover:bg-gray-800 text-sm"
            >
              取消
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 演示模式/真实模式切换按钮 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
        <motion.button
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={toggleDemoMode}
          className={`
            px-4 py-2 rounded-lg flex items-center space-x-2 transition-all
            ${isDemoMode
              ? 'bg-yellow-500 text-white shadow-lg'
              : 'bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white'
            }
          `}
        >
          <Zap className="w-5 h-5" />
          <span className="font-semibold">{isDemoMode ? '演示模式' : '演示模式'}</span>
        </motion.button>
      </div>

      {/* 诊断面板 */}
      {showDiagnosticPanel && diagnosticInfo && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="absolute top-4 right-4 bottom-4 w-80 bg-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden z-20"
        >
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center">
                <Bug className="w-5 h-5 mr-2 text-purple-400" />
                诊断信息
              </h3>
              <button
                onClick={() => setShowDiagnosticPanel(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100%-60px)]">
            {/* 浏览器信息 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
                <Info className="w-4 h-4 mr-1" />
                环境信息
              </h4>
              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>浏览器:</span>
                  <span className="text-white">{diagnosticInfo.browserName} {diagnosticInfo.browserVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span>操作系统:</span>
                  <span className="text-white">{diagnosticInfo.os}</span>
                </div>
                <div className="flex justify-between">
                  <span>安全环境:</span>
                  <span className={diagnosticInfo.isSecureContext ? 'text-green-400' : 'text-red-400'}>
                    {diagnosticInfo.isSecureContext ? '✓ 安全' : '✗ 不安全'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>协议:</span>
                  <span className="text-white">{diagnosticInfo.protocol}</span>
                </div>
              </div>
            </div>

            {/* API支持 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
                <Check className="w-4 h-4 mr-1" />
                API 支持
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">MediaDevices:</span>
                  {diagnosticInfo.hasMediaDevices ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">getUserMedia:</span>
                  {diagnosticInfo.hasGetUserMedia ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">enumerateDevices:</span>
                  {diagnosticInfo.hasEnumerateDevices ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
            </div>

            {/* 设备列表 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
                <Camera className="w-4 h-4 mr-1" />
                设备信息
              </h4>
              <div className="text-xs text-gray-400">
                <div className="mb-2">
                  检测到 <span className="text-white">{diagnosticInfo.deviceCount}</span> 个摄像头
                </div>
                {diagnosticInfo.devices.length > 0 && (
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {diagnosticInfo.devices.map((device, index) => (
                      <div key={device.deviceId} className="text-gray-300 truncate">
                        {index + 1}. {device.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 权限状态 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-1" />
                权限状态
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">已授权:</span>
                  {diagnosticInfo.hasPermission ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                </div>
                {diagnosticInfo.permissionDenied && (
                  <div className="text-red-400 text-xs mt-1">
                    权限可能被拒绝
                  </div>
                )}
              </div>
            </div>

            {/* 错误信息 */}
            {diagnosticInfo.errors.length > 0 && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center">
                  <XCircle className="w-4 h-4 mr-1" />
                  发现 {diagnosticInfo.errors.length} 个错误
                </h4>
                <div className="space-y-1 text-xs">
                  {diagnosticInfo.errors.map((error, index) => (
                    <div key={index} className="text-red-300">
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 警告信息 */}
            {diagnosticInfo.warnings.length > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  发现 {diagnosticInfo.warnings.length} 个警告
                </h4>
                <div className="space-y-1 text-xs">
                  {diagnosticInfo.warnings.map((warning, index) => (
                    <div key={index} className="text-yellow-300">
                      • {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 建议 */}
            {diagnosticInfo.suggestions.length > 0 && (
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center">
                  <Info className="w-4 h-4 mr-1" />
                  建议
                </h4>
                <div className="space-y-1 text-xs">
                  {diagnosticInfo.suggestions.map((suggestion, index) => (
                    <div key={index} className="text-blue-300">
                      • {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 故障排除按钮 */}
            <button
              onClick={() => {
                setShowTroubleshooting(true);
              }}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center text-sm font-semibold"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              查看故障排除指南
            </button>
          </div>
        </motion.div>
      )}

      {/* 诊断按钮（未启动摄像头时显示） */}
      {!state.isStreaming && !state.error && isInitialized && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleRunDiagnostics}
          className="absolute top-4 right-4 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 z-10"
        >
          <Bug className="w-5 h-5" />
          <span className="text-sm font-semibold">诊断</span>
        </motion.button>
      )}

      {/* 底部控制栏 */}
      {state.isStreaming && !state.error && !isDemoMode && (
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center pointer-events-none z-10">
          {/* 左侧：分辨率选择 */}
          <div className="relative pointer-events-auto">
            <select
              value={currentResolution}
              onChange={(e) => handleResolutionChange(e.target.value as keyof typeof RESOLUTIONS)}
              className="bg-black/50 text-white px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20 text-sm appearance-none pr-8 cursor-pointer hover:bg-black/70 transition-colors"
            >
              {Object.entries(RESOLUTIONS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </div>

          {/* 右侧：控制按钮 */}
          <div className="flex items-center space-x-2 pointer-events-auto">
            {/* 截图按钮 */}
            <button
              onClick={handleCaptureImage}
              className="bg-black/50 text-white p-3 rounded-lg backdrop-blur-sm border border-white/20 hover:bg-black/70 transition-colors"
              title="截图"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* 镜像切换按钮 */}
            <button
              onClick={handleToggleMirror}
              className={`bg-black/50 text-white p-3 rounded-lg backdrop-blur-sm border border-white/20 hover:bg-black/70 transition-colors ${
                mirrored ? 'bg-blue-500/50' : ''
              }`}
              title="镜像模式"
            >
              <Monitor className="w-5 h-5" />
            </button>

            {/* 启动/停止按钮 */}
            <button
              onClick={() => {
                if (state.isStreaming) {
                  stopStream();
                } else {
                  startStream();
                }
              }}
              className={`bg-black/50 text-white p-3 rounded-lg backdrop-blur-sm border border-white/20 hover:bg-black/70 transition-colors ${
                state.isStreaming ? 'bg-red-500/50' : 'bg-green-500/50'
              }`}
              title={state.isStreaming ? '停止' : '启动'}
            >
              {state.isStreaming ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>
          </div>

          {/* 右侧：控制按钮 */}
          <div className="flex items-center space-x-2 pointer-events-auto">
            {/* 诊断按钮 */}
            <button
              onClick={handleRunDiagnostics}
              className="bg-black/50 text-white p-3 rounded-lg backdrop-blur-sm border border-white/20 hover:bg-purple-500/50 transition-colors"
              title="诊断"
            >
              <Bug className="w-5 h-5" />
            </button>

            {/* 截图按钮 */}
            <button
              onClick={handleCaptureImage}
              className="bg-black/50 text-white p-3 rounded-lg backdrop-blur-sm border border-white/20 hover:bg-black/70 transition-colors"
              title="截图"
              >
              <Download className="w-5 h-5" />
            </button>

            {/* 镜像切换按钮 */}
            <button
              onClick={handleToggleMirror}
              className={`bg-black/50 text-white p-3 rounded-lg backdrop-blur-sm border border-white/20 hover:bg-black/70 transition-colors ${
                mirrored ? 'bg-blue-500/50' : ''
              }`}
              title="镜像模式"
            >
              <Monitor className="w-5 h-5" />
            </button>

            {/* 启动/停止按钮 */}
            <button
              onClick={() => {
                if (state.isStreaming) {
                  stopStream();
                } else {
                  startStream();
                }
              }}
              className={`bg-black/50 text-white p-3 rounded-lg backdrop-blur-sm border border-white/20 hover:bg-black/70 transition-colors ${
                state.isStreaming ? 'bg-red-500/50' : 'bg-green-500/50'
              }`}
              title={state.isStreaming ? '停止' : '启动'}
            >
              {state.isStreaming ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* 截图预览 */}
      <AnimatePresence>
        {capturedImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-gray-900 p-4 rounded-lg shadow-2xl">
              <img src={capturedImage} alt="截图" className="max-w-md max-h-md rounded-lg" />
              <div className="flex justify-center mt-4 space-x-2">
                <button
                  onClick={handleDownloadImage}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  下载
                </button>
                <button
                  onClick={() => setCapturedImage(null)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
};

export default CameraView;