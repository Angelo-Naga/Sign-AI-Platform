/**
 * 语音处理页面
 * 包含语音输入、波形可视化、识别结果显示和语音控制面板
 * 情感化叙事风格 + 企业级Web标准
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  RotateCcw,
  Volume2,
  VolumeX,
  History,
  Trash2,
  Copy,
  Download,
  Settings,
  XCircle,
  CheckCircle2,
  Brain,
  FileAudio,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Clock,
  BarChart3,
  Zap,
  Info,
} from 'lucide-react';

import AudioRecorder from '../components/AudioRecorder';
import WaveformDisplay from '../components/WaveformDisplay';
import ResultCard from '../components/ResultCard';
import SettingsPanel from '../components/SettingsPanel';
import { EmotionCard } from '../components/emotional';

import * as voiceService from '../services/voice';
import type { VoiceProcessingResult, EmotionResult } from '../types';
import { formatDuration } from '../utils/helpers';
import { formatEmotion, getEmotionData } from '../utils/formatters';

/**
 * 历史记录项接口
 */
interface HistoryItem {
  id: string;
  text: string;
  emotion?: EmotionResult;
  timestamp: number;
  duration: number;
}

/**
 * 统计数据接口
 */
interface Stats {
  totalRecordings: number;
  avgConfidence: number;
  avgDuration: number;
  emotionDistribution: Record<string, number>;
}

/**
 * 语音处理页面组件
 */
const VoiceProcessing: React.FC = () => {
  // 状态管理
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [currentEmotion, setCurrentEmotion] = useState<EmotionResult | null>(null);
  const [audioData, setAudioData] = useState<number[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [playbackAudio, setPlaybackAudio] = useState<HTMLElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenVoiceGuide');
    return !hasSeenGuide;
  });

  // 统计数据
  const [stats, setStats] = useState<Stats>({
    totalRecordings: 0,
    avgConfidence: 0,
    avgDuration: 0,
    emotionDistribution: {},
  });

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval>>();
  const [duration, setDuration] = useState(0);

  /**
   * 加载历史记录
   */
  const loadHistory = async () => {
    try {
      // 模拟历史记录加载
      setHistory([]);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  /**
   * 更新统计数据
   */
  const updateStats = useCallback((emotion?: EmotionResult, duration: number = 0) => {
    setStats((prev) => {
      const newTotal = prev.totalRecordings + 1;
      const confidenceSum = prev.avgConfidence * prev.totalRecordings + (emotion?.score || 0.85);
      const newAvgConfidence = confidenceSum / newTotal;
      const durationSum = prev.avgDuration * prev.totalRecordings + duration;
      const newAvgDuration = durationSum / newTotal;

      // 更新情绪分布
      const newDistribution = { ...prev.emotionDistribution };
      if (emotion?.emotion) {
        newDistribution[emotion.emotion] = (newDistribution[emotion.emotion] || 0) + 1;
      }

      return {
        totalRecordings: newTotal,
        avgConfidence: newAvgConfidence,
        avgDuration: newAvgDuration,
        emotionDistribution: newDistribution,
      };
    });
  }, []);

  /**
   * 开始录音
   */
  const handleStartRecording = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      setDuration(0);
      setAudioData([]);
      setAudioError(null);

      // 开始计时
      durationTimerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      toast.success('开始录音', { icon: '🎤' });
    } catch (error) {
      console.error('Failed to start recording:', error);
      setAudioError('无法访问麦克风，请检查权限设置');
      toast.error('麦克风访问失败');
    }
  };

  /**
   * 停止录音
   */
  const handleStopRecording = async () => {
    if (!isRecording) return;

    setIsRecording(false);
    setIsProcessing(true);

    // 停止计时器
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }

    // 模拟音频数据处理
    setAudioData(
      Array.from({ length: 100 }, () => Math.random() * 100 - 50)
    );

    // 模拟识别处理
    setTimeout(async () => {
      try {
        // 模拟语音识别
        const mockText = '今天天气真不错，适合出去散步';
        setCurrentText(mockText);

        // 模拟情感分析
        const mockEmotion: EmotionResult = {
          emotion: 'happy',
          score: 0.85,
          scores: {
            happy: 0.8,
            sad: 0.1,
            angry: 0.05,
            neutral: 0.02,
            surprised: 0.03,
            fearful: 0.0,
          },
        };
        setCurrentEmotion(mockEmotion);
        updateStats(mockEmotion, duration);

        // 添加到历史记录
        const historyItem: HistoryItem = {
          id: Date.now().toString(),
          text: mockText,
          emotion: mockEmotion,
          timestamp: Date.now(),
          duration,
        };
        setHistory((prev) => [historyItem, ...prev]);

        setIsProcessing(false);
        toast.success('识别完成', { icon: '✨' });
      } catch (error) {
        console.error('Processing error:', error);
        setIsProcessing(false);
        toast.error('识别失败，请重试');
      }
    }, 1500);
  };

  /**
   * 语音合成（TTS）
   */
  const handleSpeak = () => {
    if (!currentText || isPlaying) return;

    const utterance = new SpeechSynthesisUtterance(currentText);
    utterance.lang = 'zh-CN';
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    speechSynthesis.speak(utterance);
  };

  /**
   * 停止播放
   */
  const handleStopPlayback = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
  };

  /**
   * 复制文本
   */
  const handleCopy = async () => {
    if (!currentText) return;
    
    try {
      await navigator.clipboard.writeText(currentText);
      toast.success('已复制到剪贴板', { icon: '📋' });
    } catch (error) {
      toast.error('复制失败');
    }
  };

  /**
   * 重置
   */
  const handleReset = () => {
    setCurrentText('');
    setCurrentEmotion(null);
    setAudioData([]);
    setDuration(0);
    setAudioError(null);
    setIsRecording(false);
    setIsProcessing(false);
    setIsPlaying(false);
    speechSynthesis.cancel();
    toast('已重置');
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
   * 下载音频
   */
  const handleDownload = () => {
    if (!currentText) return;
    
    // 创建文本文件
    const blob = new Blob([currentText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice_text_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('已下载', { icon: '📥' });
  };

  /**
   * 关闭引导
   */
  const handleCloseGuide = () => {
    setShowGuide(false);
    localStorage.setItem('hasSeenVoiceGuide', 'true');
  };

  // 组件挂载时加载历史记录
  useEffect(() => {
    loadHistory();

    return () => {
      // 清理定时器
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-blue-900/20">
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
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-8 text-white text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                >
                  <Mic className="w-10 h-10" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">欢迎使用语音处理</h2>
                <p className="text-blue-100">智能语音识别与情感分析</p>
              </div>
              <div className="p-8">
                <div className="space-y-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      点击"开始录音"按钮开始录制您的语音
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">2</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      系统会自动识别语音内容并分析情感
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">3</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      查看分析结果，支持语音合成和文本导出
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCloseGuide}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all"
                >
                  开始使用
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
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  语音处理
                </h1>
                <motion.span
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, -10, 0, 10, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  🎤
                </motion.span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                智能语音识别、情感分析和语音合成
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
        {stats.totalRecordings > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <EmotionCard
              title="录音次数"
              variant="info"
              icon={<Mic className="w-5 h-5" />}
            >
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalRecordings}
              </span>
            </EmotionCard>
            <EmotionCard
              title="平均置信度"
              variant="success"
              icon={<BarChart3 className="w-5 h-5" />}
            >
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {(stats.avgConfidence * 100).toFixed(0)}%
              </span>
            </EmotionCard>
            <EmotionCard
              title="平均时长"
              variant="warning"
              icon={<Clock className="w-5 h-5" />}
            >
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatDuration(Math.round(stats.avgDuration))}
              </span>
            </EmotionCard>
            <EmotionCard
              title="情绪分布"
              variant="info"
              icon={<Sparkles className="w-5 h-5" />}
            >
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {Object.keys(stats.emotionDistribution).length}
              </span>
            </EmotionCard>
          </motion.div>
        )}

        {/* 主内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：录音和波形 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 波形显示区域 */}
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
                      {isRecording ? '正在录音...' : '音频波形'}
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
                {audioError ? (
                  <div className="flex items-center justify-center h-64 bg-red-50 dark:bg-red-900/20 rounded-2xl">
                    <div className="text-center">
                      <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                      <p className="text-red-600 dark:text-red-400 font-medium mb-2">
                        麦克风访问失败
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{audioError}</p>
                    </div>
                  </div>
                ) : audioData.length > 0 ? (
                  <WaveformDisplay data={audioData} />
                ) : (
                  <div className="flex items-center justify-center h-64 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl">
                    <div className="text-center">
                      <Mic className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        点击下方按钮开始录音
                      </p>
                    </div>
                  </div>
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
                      className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
                    >
                      <Mic className="w-6 h-6" />
                      <span>开始录音</span>
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStopRecording}
                      className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
                    >
                      <Square className="w-6 h-6" />
                      <span>停止录音</span>
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* 情感分析结果 */}
            {currentEmotion && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Brain className="w-5 h-5 mr-2 text-purple-500" />
                    情感分析
                  </h2>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-center mb-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-center"
                    >
                      <div className="text-5xl mb-2">
                        {getEmotionData(currentEmotion.emotion).icon}
                      </div>
                      <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {getEmotionData(currentEmotion.emotion).label}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        置信度: {(currentEmotion.score * 100).toFixed(1)}%
                      </p>
                    </motion.div>
                  </div>

                  {/* 情感详情 */}
                  {currentEmotion.scores && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(currentEmotion.scores).map(([emotion, value]) => {
                        const formatted = getEmotionData(emotion);
                        return (
                          <div key={emotion} className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <div className="text-2xl mb-1">{formatted.icon}</div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {formatted.label}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {(value * 100).toFixed(0)}%
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* 右侧：识别结果和历史 */}
          <div className="space-y-6">
            {/* 当前识别结果 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  识别结果
                </h2>
              </div>

              <div className="p-6">
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center h-48">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
                    />
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 text-gray-600 dark:text-gray-400"
                    >
                      正在处理...
                    </motion.p>
                  </div>
                ) : currentText ? (
                  <div className="space-y-4">
                    {/* 识别文本 */}
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl">
                      <div className="flex items-start space-x-3">
                        <MessageCircle className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                        <p className="text-gray-900 dark:text-white leading-relaxed">
                          {currentText}
                        </p>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSpeak}
                        disabled={!currentText}
                        className="flex items-center justify-center space-x-2 p-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-4 h-4" />
                            <span>暂停</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4" />
                            <span>播放</span>
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCopy}
                        disabled={!currentText}
                        className="flex items-center justify-center space-x-2 p-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        <span>复制</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleDownload}
                        disabled={!currentText}
                        className="flex items-center justify-center space-x-2 p-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>下载</span>
                      </motion.button>

                      {isPlaying && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleStopPlayback}
                          className="flex items-center justify-center space-x-2 p-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                        >
                          <VolumeX className="w-4 h-4" />
                          <span>停止</span>
                        </motion.button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <FileAudio className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      录音后，识别结果将显示在这里
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
                    <History className="w-5 h-5 mr-2 text-blue-500" />
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
                        className="group mb-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 dark:text-white mb-2 line-clamp-2">
                              {item.text}
                            </p>
                            <div className="flex items-center space-x-2">
                              {item.emotion && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                  {formatEmotion(item.emotion.emotion).icon}
                                </span>
                              )}
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDuration(item.duration)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteHistoryItem(item.id)}
                            className="ml-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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

export default VoiceProcessing;