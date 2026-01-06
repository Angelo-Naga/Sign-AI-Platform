/**
 * 翻译页面
 * 包含双向翻译界面、输入/输出区域、翻译模式切换和历史记录
 * 情感化叙事风格 + 企业级Web标准
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Languages,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  RefreshCw,
  History,
  Trash2,
  Copy,
  Download,
  Settings,
  XCircle,
  CheckCircle2,
  MessageSquare,
  FileText,
  Mic,
  Volume2,
  Sparkles,
  Globe,
  Zap,
  BookOpen,
  Download as DownloadIcon,
  Info,
  TrendingUp,
  Clock,
} from 'lucide-react';

import SettingsPanel from '../components/SettingsPanel';
import { EmotionCard } from '../components/emotional';

import * as translationService from '../services/translation';
import type { TranslationResult } from '../types';
import { formatLanguage } from '../utils/formatters';

/**
 * 历史记录项接口
 */
interface HistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
  quality?: number;
}

/**
 * 语言选项接口
 */
interface LanguageOption {
  code: string;
  name: string;
  flag?: string;
}

/**
 * 统计数据接口
 */
interface Stats {
  totalTranslations: number;
  avgQuality: number;
  totalCharacters: number;
  popularLanguages: Record<string, number>;
}

/**
 * 支持的语言列表
 */
const LANGUAGES: LanguageOption[] = [
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'en', name: '英语', flag: '🇺🇸' },
  { code: 'ja', name: '日语', flag: '🇯🇵' },
  { code: 'ko', name: '韩语', flag: '🇰🇷' },
  { code: 'fr', name: '法语', flag: '🇫🇷' },
  { code: 'de', name: '德语', flag: '🇩🇪' },
  { code: 'es', name: '西班牙语', flag: '🇪🇸' },
  { code: 'ru', name: '俄语', flag: '🇷🇺' },
  { code: 'sign', name: '手语', flag: '🖐️' },
];

/**
 * 翻译模式
 */
type TranslationMode = 'text' | 'sign' | 'bidirectional';

/**
 * 翻译页面组件
 */
const Translation: React.FC = () => {
  // 状态管理
  const [mode, setMode] = useState<TranslationMode>('text');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('zh');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [showGuide, setShowGuide] = useState(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenTranslationGuide');
    return !hasSeenGuide;
  });

  // Refs
  const autoTranslateTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // 统计数据
  const [stats, setStats] = useState<Stats>({
    totalTranslations: 0,
    avgQuality: 0,
    totalCharacters: 0,
    popularLanguages: {},
  });

  /**
   * 加载历史记录
   */
  const loadHistory = async () => {
    try {
      setHistory([]);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  /**
   * 翻译文本
   */
  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      toast.error('请输入要翻译的内容');
      return;
    }

    setIsTranslating(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 模拟翻译结果
      let translated = '';
      if (mode === 'text' || mode === 'bidirectional') {
        if (sourceLanguage === 'zh' && targetLanguage === 'en') {
          translated = 'This is a simulated translation result';
        } else if (sourceLanguage === 'en' && targetLanguage === 'zh') {
          translated = '这是一个模拟的翻译结果';
        } else if (sourceLanguage === 'zh' && targetLanguage === 'ja') {
          translated = 'これはシミュレーションされた翻訳結果です';
        } else {
          translated = `[模拟翻译] ${sourceText}`;
        }
      } else if (mode === 'sign') {
        translated = `[手语表示] ${sourceText}`;
      }

      setTranslatedText(translated);

      const quality = 0.85 + Math.random() * 0.14;

      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        sourceText,
        translatedText: translated,
        sourceLanguage,
        targetLanguage,
        timestamp: Date.now(),
        quality,
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 50));

      setStats((prev) => {
        const newTotal = prev.totalTranslations + 1;
        const qualitySum = prev.avgQuality * prev.totalTranslations + quality;
        const newAvgQuality = qualitySum / newTotal;
        const newCharacters = prev.totalCharacters + sourceText.length;

        const newPopLanguages = { ...prev.popularLanguages };
        const langKey = `${sourceLanguage}-${targetLanguage}`;
        newPopLanguages[langKey] = (newPopLanguages[langKey] || 0) + 1;

        return {
          totalTranslations: newTotal,
          avgQuality: newAvgQuality,
          totalCharacters: newCharacters,
          popularLanguages: newPopLanguages,
        };
      });

      setIsTranslating(false);
      toast.success('翻译完成', { icon: '✨' });
    } catch (error) {
      console.error('Translation error:', error);
      setIsTranslating(false);
      toast.error('翻译失败，请重试');
    }
  };

  /**
   * 交换源语言和目标语言
   */
  const handleSwapLanguages = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  /**
   * 复制文本
   */
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('已复制到剪贴板', { icon: '📋' });
    } catch (error) {
      toast.error('复制失败');
    }
  };

  /**
   * 语音朗读
   */
  const handleSpeak = (text: string, lang: string) => {
    if (!text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : lang === 'ko' ? 'ko-KR' : `${lang}-${lang.toUpperCase()}`;
    speechSynthesis.speak(utterance);
    toast('开始朗读', { icon: '🔊' });
  };

  /**
   * 下载翻译
   */
  const handleDownload = () => {
    if (!sourceText || !translatedText) return;
    
    const content = `源语言: ${formatLanguage(sourceLanguage)}\n目标语言: ${formatLanguage(targetLanguage)}\n\n原文:\n${sourceText}\n\n译文:\n${translatedText}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translation_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('已下载', { icon: '📥' });
  };

  /**
   * 清空输入
   */
  const handleClear = () => {
    setSourceText('');
    setTranslatedText('');
  };

  /**
   * 重置
   */
  const handleReset = () => {
    handleClear();
    toast('已重置');
  };

  /**
   * 删除历史记录项
   */
  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
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
   * 关闭引导
   */
  const handleCloseGuide = () => {
    setShowGuide(false);
    localStorage.setItem('hasSeenTranslationGuide', 'true');
  };

  /**
   * 处理自动翻译
   */
  useEffect(() => {
    if (autoTranslate && sourceText.trim() && sourceText.length > 2) {
      if (autoTranslateTimerRef.current) {
        clearTimeout(autoTranslateTimerRef.current);
      }
      autoTranslateTimerRef.current = setTimeout(() => {
        handleTranslate();
      }, 1000);
    }

    return () => {
      if (autoTranslateTimerRef.current) {
        clearTimeout(autoTranslateTimerRef.current);
      }
    };
  }, [sourceText, autoTranslate]); // eslint-disable-line react-hooks/exhaustive-deps

  // 组件挂载时加载历史记录
  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-orange-900/20">
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
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-8 text-white text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                >
                  <Languages className="w-10 h-10" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">欢迎使用智能翻译</h2>
                <p className="text-orange-100">支持文本和手语双向翻译</p>
              </div>
              <div className="p-8">
                <div className="space-y-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 dark:text-orange-400 font-bold">1</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      选择源语言和目标语言
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 dark:text-orange-400 font-bold">2</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      输入要翻译的文本内容
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 dark:text-orange-400 font-bold">3</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      点击翻译按钮获取结果
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCloseGuide}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all"
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
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  智能翻译
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
                  🌍
                </motion.span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                支持文本和手语双向翻译，沟通无界限
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
        {stats.totalTranslations > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <EmotionCard
              title="翻译次数"
              variant="info"
              icon={<Globe className="w-5 h-5" />}
            >
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalTranslations}
              </span>
            </EmotionCard>
            <EmotionCard
              title="平均质量"
              variant="success"
              icon={<TrendingUp className="w-5 h-5" />}
            >
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {(stats.avgQuality * 100).toFixed(0)}%
              </span>
            </EmotionCard>
            <EmotionCard
              title="总字数"
              variant="warning"
              icon={<BookOpen className="w-5 h-5" />}
            >
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalCharacters}
              </span>
            </EmotionCard>
            <EmotionCard
              title="语言对"
              variant="info"
              icon={<Sparkles className="w-5 h-5" />}
            >
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {Object.keys(stats.popularLanguages).length}
              </span>
            </EmotionCard>
          </motion.div>
        )}

        {/* 翻译模式选择 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-lg inline-flex space-x-2">
            {[
              { value: 'text' as TranslationMode, label: '文本翻译', icon: FileText },
              { value: 'sign' as TranslationMode, label: '手语翻译', icon: MessageSquare },
              { value: 'bidirectional' as TranslationMode, label: '双向翻译', icon: Globe },
            ].map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`
                  flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all
                  ${mode === m.value
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <m.icon className="w-5 h-5" />
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* 主翻译区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：输入和输出 */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    {/* 源语言选择 */}
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="relative"
                    >
                      <select
                        value={sourceLanguage}
                        onChange={(e) => setSourceLanguage(e.target.value)}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer outline-none appearance-none pr-8"
                      >
                        {LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.flag} {lang.name}
                          </option>
                        ))}
                      </select>
                      <Languages className="w-4 h-4 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </motion.div>

                    {/* 语言交换按钮 */}
                    <motion.button
                      whileHover={{ rotate: 180 }}
                      onClick={handleSwapLanguages}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="交换语言"
                    >
                      <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </motion.button>

                    {/* 目标语言选择 */}
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="relative"
                    >
                      <select
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer outline-none appearance-none pr-8"
                      >
                        {LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.flag} {lang.name}
                          </option>
                        ))}
                      </select>
                      <Globe className="w-4 h-4 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </motion.div>
                  </div>

                  {/* 自动翻译开关 */}
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={autoTranslate}
                        onChange={(e) => setAutoTranslate(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      自动翻译
                    </span>
                  </label>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* 源文本输入 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center">
                      {mode === 'sign' ? (
                        <>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          手语输入
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          源文本
                        </>
                      )}
                    </label>
                    {sourceText && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={handleClear}
                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors flex items-center space-x-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>清空</span>
                      </motion.button>
                    )}
                  </div>
                  <div className="relative">
                    <textarea
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      placeholder={mode === 'sign' ? '输入要翻译为手语的文本...' : '输入要翻译的文本...'}
                      rows={6}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 border-transparent focus:border-orange-500 outline-none transition-colors resize-none text-gray-900 dark:text-white placeholder-gray-400 text-lg"
                    />
                    {sourceText && (
                      <div className="absolute bottom-4 right-4 flex items-center space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          onClick={() => handleSpeak(sourceText, sourceLanguage)}
                          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          title="朗读"
                        >
                          <Volume2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </motion.button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {sourceText.length}/5000
                    </div>
                    {isTranslating && autoTranslate && (
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="text-sm text-orange-600 dark:text-orange-400 flex items-center space-x-1"
                      >
                        <Zap className="w-4 h-4" />
                        <span>正在自动翻译...</span>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* 翻译按钮 */}
                <div className="flex items-center justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleTranslate}
                    disabled={!sourceText.trim() || isTranslating}
                    className="flex items-center space-x-3 px-10 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all disabled:hover:shadow-none"
                  >
                    {isTranslating ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>翻译中...</span>
                      </>
                    ) : (
                      <>
                        <Languages className="w-5 h-5" />
                        <span>开始翻译</span>
                      </>
                    )}
                  </motion.button>
                </div>

                {/* 翻译结果 */}
                {translatedText && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        翻译结果
                      </label>
                      <div className="flex items-center space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          onClick={() => handleCopy(translatedText)}
                          className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors flex items-center space-x-1"
                        >
                          <Copy className="w-4 h-4" />
                          <span>复制</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          onClick={handleDownload}
                          className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors flex items-center space-x-1"
                        >
                          <DownloadIcon className="w-4 h-4" />
                          <span>下载</span>
                        </motion.button>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="p-5 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl border-2 border-orange-100 dark:border-orange-900/30">
                        <p className="text-gray-900 dark:text-white leading-relaxed text-lg">
                          {translatedText}
                        </p>
                      </div>
                      <div className="absolute top-3 right-3">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          onClick={() => handleSpeak(translatedText, targetLanguage)}
                          className="p-2 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                          title="朗读"
                        >
                          <Volume2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </motion.button>
                      </div>
                    </div>
                    {/* 质量评分 */}
                    {history[0]?.quality && (
                      <div className="flex items-center justify-center space-x-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                        <Sparkles className="w-5 h-5 text-orange-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          翻译质量: <span className="font-bold text-orange-600 dark:text-orange-400">
                            {(history[0].quality * 100).toFixed(0)}%
                          </span>
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>

          {/* 右侧：历史记录 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <History className="w-5 h-5 mr-2 text-orange-500" />
                  历史记录
                </h2>
                {history.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={handleClearHistory}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    title="清空历史"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </motion.button>
                )}
              </div>
            </div>

            <div className="p-4 max-h-[600px] overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      暂无翻译记录
                    </p>
                  </div>
                ) : (
                  history.map((item, index) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="group mb-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:shadow-md transition-shadow border-2 border-transparent hover:border-orange-200 dark:hover:border-orange-900/30"
                    >
                      <div className="space-y-3">
                        {/* 源文本 */}
                        <div className="flex items-start space-x-2">
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-400 flex-shrink-0 w-16">
                            {item.sourceLanguage === 'sign' ? '手语' : formatLanguage(item.sourceLanguage)}
                          </span>
                          <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                            {item.sourceText}
                          </p>
                        </div>

                        {/* 箭头 */}
                        <div className="flex items-center justify-center">
                          <motion.div
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            <RotateCcw className="w-4 h-4 text-gray-400" />
                          </motion.div>
                        </div>

                        {/* 翻译结果 */}
                        <div className="flex items-start space-x-2">
                          <span className="text-xs font-bold text-orange-600 dark:text-orange-400 flex-shrink-0 w-16">
                            {item.targetLanguage === 'sign' ? '手语' : formatLanguage(item.targetLanguage)}
                          </span>
                          <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                            {item.translatedText}
                          </p>
                        </div>

                        {/* 操作和元数据 */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center space-x-2">
                            {item.quality && (
                              <div className="flex items-center space-x-1">
                                <Sparkles className="w-3 h-3 text-orange-500" />
                                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                  {(item.quality * 100).toFixed(0)}%
                                </span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>{Math.round((Date.now() - item.timestamp) / 60000)}分钟前</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              onClick={() => handleCopy(item.translatedText)}
                              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              title="复制"
                            >
                              <Copy className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              onClick={() => {
                                setSourceText(item.sourceText);
                                setTranslatedText(item.translatedText);
                                setSourceLanguage(item.sourceLanguage);
                                setTargetLanguage(item.targetLanguage);
                              }}
                              className="p-1.5 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                              title="使用此翻译"
                            >
                              <RotateCcw className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              onClick={() => handleDeleteHistoryItem(item.id)}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* 设置面板 */}
        <AnimatePresence>
          {showSettings && (
            <SettingsPanel
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
              settings={{
                theme: 'light',
                language: 'zh',
                microphoneId: '',
                cameraId: '',
                notifications: true,
                autoSave: false,
                soundEffects: true,
              }}
              onUpdate={() => {}}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Translation;