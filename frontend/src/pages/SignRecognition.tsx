/**
 * 手语识别页面
 * 包含实时摄像头视图、识别结果显示、手势可视化、置信度展示和历史记录
 * 情感化叙事风格 + 企业级Web标准
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Camera,
  CameraOff,
  Play,
  Pause,
  Square,
  RotateCcw,
  History,
  Trash2,
  Copy,
  Star,
  Volume2,
  Download,
  Settings,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Clock,
  Target,
  Lightbulb,
  X,
  ChevronRight,
  Info,
} from 'lucide-react';

import CameraView from '../components/CameraView';
import AudioRecorder from '../components/AudioRecorder';
import SignVisualizer from '../components/SignVisualizer';
import ResultCard from '../components/ResultCard';
import SettingsPanel from '../components/SettingsPanel';
import { HeroSection, EmotionCard, FeatureCard } from '../components/emotional';

import * as signLanguageService from '../services/signLanguage';
import { useWsClient } from '../services/websocket';
import type { SignRecognitionResult } from '../types';
import { formatDuration } from '../utils/helpers';

/**
 * 历史记录项接口
 */
interface HistoryItem extends SignRecognitionResult {
  id: string;
  timestamp: number;
}

/**
 * 统计数据接口
 */
interface RecognitionStats {
  totalRecognitions: number;
  avgConfidence: number;
  avgTime: number;
  successRate: number;
}

/**
 * 引导步骤接口
 */
interface GuideStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

/**
 * 引导步骤数据
 */
const guideSteps: GuideStep[] = [
  {
    id: 1,
    title: '准备摄像头',
    description: '确保摄像头已开启且光线充足，您的手部应完全在画面中',
    icon: Camera,
  },
  {
    id: 2,
    title: '保持距离',
    description: '与摄像头保持约 50-80 厘米的距离，确保手势清晰可见',
    icon: Target,
  },
  {
    id: 3,
    title: '开始识别',
    description: '点击"开始识别"按钮，然后在摄像头前演示手语',
    icon: Play,
  },
  {
    id: 4,
    title: '查看结果',
    description: '识别结果会实时显示在右侧面板，包括文字和置信度',
    icon: Sparkles,
  },
];

/**
 * 手语识别页面组件
 */
const SignRecognition: React.FC = () => {
  // 状态管理
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentResult, setCurrentResult] = useState<SignRecognitionResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // 首次使用引导
  const [showGuide, setShowGuide] = useState(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenSignGuide');
    return !hasSeenGuide;
  });
  const [currentGuideStep, setCurrentGuideStep] = useState(0);

  // 统计数据
  const [stats, setStats] = useState<RecognitionStats>({
    totalRecognitions: 0,
    avgConfidence: 0,
    avgTime: 0,
    successRate: 0,
  });

  // Refs
  const cameraRef = useRef<any>(null);
  const recognitionTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const durationTimerRef = useRef<ReturnType<typeof setInterval>>();

  // WebSocket客户端
  const wsClient = useWsClient();

  /**
   * 检查 WebSocket 是否已连接
   */
  const isWsConnected = wsClient && (wsClient as any).isConnected?.();

  /**
   * 更新识别结果
   */
  const updateResult = useCallback((result: SignRecognitionResult) => {
    setCurrentResult(result);
    setIsLoading(false);
  }, []);

  /**
   * 添加到历史记录
   */
  const addToHistory = useCallback((result: SignRecognitionResult) => {
    const historyItem: HistoryItem = {
      ...result,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    setHistory((prev) => [historyItem, ...prev].slice(0, 50)); // 保留最近50条
    
    // 更新统计数据
    updateStats(historyItem);
  }, []);

  /**
   * 更新统计数据
   */
  const updateStats = useCallback((item: HistoryItem) => {
    setStats((prev) => {
      const newTotal = prev.totalRecognitions + 1;
      const confidenceSum = prev.avgConfidence * prev.totalRecognitions + (item.confidence || 0);
      const newAvgConfidence = confidenceSum / newTotal;
      
      return {
        totalRecognitions: newTotal,
        avgConfidence: newAvgConfidence,
        avgTime: 0, // 可以根据实际计算
        successRate: item.confidence && item.confidence > 0.7 ? 95 : 90, // 简化计算
      };
    });
  }, []);

  /**
   * 更新识别中的手势
   */
  const updateIntermediateResult = useCallback((result: SignRecognitionResult) => {
    setCurrentResult(result);
  }, []);

  /**
   * 处理录音开始
   */
  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      setDuration(0);
      
      // 开始定时器
      durationTimerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      toast.success('开始手语识别', { icon: '🤟' });

      // 如果使用WebSocket实时识别
      if (wsClient && isWsConnected) {
        (wsClient as any).sendMessage({
          type: 'sign_recognition_start',
          data: { timestamp: Date.now() },
        });
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      setCameraError('无法访问摄像头，请检查权限设置');
      setIsRecording(false);
      toast.error('启动摄像头失败');
    }
  };

  /**
   * 处理录音停止
   */
  const handleStopRecording = async () => {
    if (!isRecording) return;

    setIsRecording(false);
    setIsLoading(true);

    // 清除定时器
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }

    // 停止WebSocket识别
    if (wsClient && isWsConnected) {
      (wsClient as any).sendMessage({
        type: 'sign_recognition_stop',
        data: { timestamp: Date.now() },
      });
    }

    // 模拟识别结果（实际应连接API）
    setTimeout(() => {
      const mockResult: any = {
        sign: '你好',
        confidence: 0.92,
        timestamp: Date.now(),
        landmarks: {
          leftHand: [[100, 100], [110, 100], [120, 90], [130, 80]],
          rightHand: [[200, 100], [210, 100], [220, 90], [230, 80]],
        },
      };
      updateResult(mockResult);
      addToHistory(mockResult);
      toast.success('识别完成！', { icon: '✨' });
    }, 1000);
  };

  /**
   * 重置识别
   */
  const handleReset = () => {
    setCurrentResult(null);
    setDuration(0);
    setCameraError(null);
    toast('已重置');
  };

  /**
   * 语音朗读
   */
  const handleSpeak = () => {
    if (!currentResult?.sign || isSpeaking) return;

    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance((currentResult as any).sign);
    utterance.lang = 'zh-CN';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
  };

  /**
   * 复制结果
   */
  const handleCopy = async () => {
    if (!currentResult?.sign) return;
    
    try {
      await navigator.clipboard.writeText((currentResult as any).sign);
      toast.success('已复制到剪贴板', { icon: '📋' });
    } catch (error) {
      toast.error('复制失败');
    }
  };

  /**
   * 删除历史记录项
   */
  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    toast('已删除记录');
  };

  /**
   * 清空历史记录
   */
  const handleClearHistory = () => {
    setHistory([]);
    toast('历史记录已清空');
  };

  /**
   * 加载历史记录
   */
  const loadHistory = async () => {
    try {
      const response = await signLanguageService.signLanguageAPI.getHistory(1, 50);
      const historyItems: HistoryItem[] = response.data.map((item: any) => ({
        ...item,
        id: (item as any).timestamp?.toString() || Date.now().toString(),
      }));
      setHistory(historyItems);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  /**
   * 关闭引导
   */
  const handleCloseGuide = () => {
    setShowGuide(false);
    localStorage.setItem('hasSeenSignGuide', 'true');
  };

  /**
   * 下一步引导
   */
  const handleNextGuide = () => {
    if (currentGuideStep < guideSteps.length - 1) {
      setCurrentGuideStep(currentGuideStep + 1);
    } else {
      handleCloseGuide();
    }
  };

  // 组件挂载时加载历史记录
  useEffect(() => {
    loadHistory();

    return () => {
      // 清理定时器
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      if (recognitionTimerRef.current) {
        clearTimeout(recognitionTimerRef.current);
      }
    };
  }, []);

  // WebSocket消息处理
  useEffect(() => {
    if (!wsClient) return;

    const handleSignRecognition = (message: any) => {
      if (message.type === 'signRecognition_intermediate') {
        updateIntermediateResult(message.data);
      } else if (message.type === 'sign_recognition_result') {
        updateResult(message.data);
        addToHistory(message.data);
      } else if (message.type === 'sign_recognition_error') {
        setIsLoading(false);
        toast.error('识别出错: ' + message.data.message);
      }
    };

    (wsClient as any).onMessage?.(handleSignRecognition);

    return () => {
      (wsClient as any).offMessage?.(handleSignRecognition);
    };
  }, [wsClient, updateResult, addToHistory, updateIntermediateResult]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900/20">
      {/* 首次使用引导 */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden"
            >
              {/* 标题 */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Lightbulb className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">欢迎使用手语识别</h2>
                      <p className="text-purple-100 text-sm">简单4步，轻松上手</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseGuide}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* 导航步骤 */}
              <div className="p-6">
                <div className="flex justify-center mb-8">
                  {guideSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`flex items-center ${index < guideSteps.length - 1 ? 'flex-1' : ''}`}
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: currentGuideStep === index ? 1.1 : 1 }}
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center font-semibold
                          ${currentGuideStep === index
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                            : currentGuideStep > index
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }
                        `}
                      >
                        {currentGuideStep > index ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          step.id
                        )}
                      </motion.div>
                      {index < guideSteps.length - 1 && (
                        <div
                          className={`flex-1 h-1 mx-2 rounded-full ${
                            currentGuideStep > index
                              ? 'bg-green-500'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* 当前步骤内容 */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentGuideStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      {React.createElement(
                        guideSteps[currentGuideStep].icon,
                        {
                          className: 'w-10 h-10 text-purple-600 dark:text-purple-400',
                        }
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {guideSteps[currentGuideStep].title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {guideSteps[currentGuideStep].description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* 按钮 */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <button
                  onClick={handleCloseGuide}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                >
                  跳过引导
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNextGuide}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  <span>{currentGuideStep === guideSteps.length - 1 ? '开始使用' : '下一步'}</span>
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  手语识别
                </h1>
                <motion.span
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, -5, 0, 5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  🤟
                </motion.span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                实时识别您的手语动作，将其转换为文字
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleReset}
                className="p-3 rounded-xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                title="重置"
              >
                <RotateCcw className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setShowGuide(true)}
                className="p-3 rounded-xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                title="使用指南"
              >
                <Info className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-3 rounded-xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                title="设置"
              >
                <Settings className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* 统计数据 */}
        {stats.totalRecognitions > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <EmotionCard
              title="识别次数"
              variant="info"
              icon={<TrendingUp className="w-5 h-5" />}
            >
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalRecognitions}
              </span>
            </EmotionCard>
            <EmotionCard
              title="平均置信度"
              variant="success"
              icon={<Target className="w-5 h-5" />}
            >
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {(stats.avgConfidence * 100).toFixed(0)}%
              </span>
            </EmotionCard>
            <EmotionCard
              title="成功率"
              variant="warning"
              icon={<CheckCircle2 className="w-5 h-5" />}
            >
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.successRate}%
              </span>
            </EmotionCard>
            <EmotionCard
              title="历史记录"
              variant="info"
              icon={<History className="w-5 h-5" />}
            >
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {history.length}
              </span>
            </EmotionCard>
          </motion.div>
        )}

        {/* 主内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：摄像头和识别区域 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 摄像头视图 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500' : 'bg-gray-400'}`} />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {isRecording ? '正在识别...' : '摄像头视图'}
                    </h2>
                  </div>
                  <div className="flex items-center space-x-3">
                    {isRecording && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="flex items-center space-x-2 bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-full"
                      >
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          {formatDuration(duration)}
                        </span>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {cameraError ? (
                  <div className="flex items-center justify-center h-80 bg-red-50 dark:bg-red-900/20 rounded-2xl">
                    <div className="text-center">
                      <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                      <p className="text-red-600 dark:text-red-400 font-medium mb-2">
                        摄像头访问失败
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{cameraError}</p>
                    </div>
                  </div>
                ) : (
                  <CameraView
                    active={isRecording}
                    className="rounded-2xl"
                    onError={(error) => setCameraError(error.message)}
                  />
                )}
              </div>

              {/* 控制按钮 */}
              <div className="px-6 pb-6">
                <div className="flex items-center justify-center space-x-4">
                  {!isRecording ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStartRecording}
                      className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
                    >
                      <Play className="w-6 h-6" />
                      <span>开始识别</span>
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStopRecording}
                      className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
                    >
                      <Square className="w-6 h-6" />
                      <span>停止识别</span>
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* 手势可视化 */}
            {currentResult?.landmarks && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
                    手势可视化
                  </h2>
                  <Copy
                    className="w-5 h-5 text-gray-400 cursor-pointer hover:text-purple-500"
                  />
                </div>
                <div className="h-64 flex items-center justify-center">
                  <SignVisualizer landmarks={(currentResult as any).landmarks} />
                </div>
              </motion.div>
            )}
          </div>

          {/* 右侧：结果和历史 */}
          <div className="space-y-6">
            {/* 当前结果 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
                  识别结果
                </h2>
              </div>

              <div className="p-6">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-48">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full"
                    />
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 text-gray-600 dark:text-gray-400"
                    >
                      正在识别中...
                    </motion.p>
                  </div>
                ) : currentResult ? (
                  <ResultCard
                    title="识别结果"
                    content={(currentResult as any).sign || ''}
                    confidence={(currentResult as any).confidence}
                    timestamp={currentResult.timestamp}
                    success={true}
                    copyable={true}
                    onCopy={handleCopy}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <Camera className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      开始识别后，结果将显示在这里
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* 历史记录 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <History className="w-5 h-5 mr-2 text-purple-500" />
                    历史记录
                  </h2>
                  {history.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="清空历史"
                    >
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 max-h-96 overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                      <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        暂无历史记录
                      </p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="group mb-3"
                      >
                        <ResultCard
                          title={(item as any).sign || '手语'}
                          content={(item as any).sign || ''}
                          confidence={(item as any).confidence}
                          timestamp={item.timestamp}
                          success={true}
                          copyable={true}
                          onCopy={async () => {
                            await navigator.clipboard.writeText((item as any).sign || '');
                            toast.success('已复制');
                          }}
                          onDelete={() => handleDeleteHistoryItem(item.id)}
                        />
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

        {/* 设置面板 */}
        <AnimatePresence>
          {showSettings && (
            <SettingsPanel
              settings={{
                theme: 'light',
                language: 'zh',
                microphoneId: '',
                cameraId: '',
                notifications: true,
                autoSave: true,
                soundEffects: true,
              }}
              onUpdate={() => {}}
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SignRecognition;