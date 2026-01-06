/**
 * 声音克隆页面
 * 包含音频上传组件、录音界面、文本输入框、合成结果播放和声音档案管理
 * 情感化叙事风格 + 企业级Web标准
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Mic,
  Upload,
  Play,
  Pause,
  Square,
  RotateCcw,
  Volume2,
  VolumeX,
  Trash2,
  Copy,
  Download,
  Settings,
  XCircle,
  CheckCircle2,
  User,
  Sparkles,
  FileAudio,
  Music,
  PlusCircle,
  Edit2,
  Save,
  Info,
  TrendingUp,
  Clock,
  Award,
  Zap,
  ChevronRight,
  Layers,
  Wand2,
} from 'lucide-react';

import AudioRecorder from '../components/AudioRecorder';
import ResultCard from '../components/ResultCard';
import SettingsPanel from '../components/SettingsPanel';
import { EmotionCard } from '../components/emotional';

import * as cloneService from '../services/clone';
import type { VoiceCloningResult, VoiceProfile } from '../types';
import { formatDuration, formatFileSize } from '../utils/helpers';

/**
 * 声音档案项接口
 */
interface VoiceProfileItem extends VoiceProfile {
  id: string;
  createdAt: number;
  description?: string;
  samples?: number;
  duration?: number;
  quality?: number;
}

/**
 * 合成记录接口
 */
interface SynthesisRecord {
  id: string;
  text: string;
  audioUrl: string;
  profileId: string;
  profileName: string;
  createdAt: number;
  duration: number;
}

/**
 * 统计数据接口
 */
interface Stats {
  totalProfiles: number;
  totalSyntheses: number;
  avgQuality: number;
  totalDuration: number;
}

/**
 * 向导步骤接口
 */
interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

/**
 * 声音克隆页面组件
 */
const VoiceCloning: React.FC = () => {
  // 状态管理
  const [activeTab, setActiveTab] = useState<'wizard' | 'profile' | 'synthesize'>('profile');
  const [isRecording, setIsRecording] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null);
  const [synthesisText, setSynthesisText] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [synthesisResult, setSynthesisResult] = useState<SynthesisRecord | null>(null);
  
  // 声音档案列表
  const [profiles, setProfiles] = useState<VoiceProfileItem[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Partial<VoiceProfileItem>>({
    name: '',
    description: '',
  });
  
  // 合成历史
  const [synthesisHistory, setSynthesisHistory] = useState<SynthesisRecord[]>([]);
  
  // 播放控制
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 设置面板
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenVoiceCloningGuide');
    return !hasSeenGuide;
  });

  // 统计数据
  const [stats, setStats] = useState<Stats>({
    totalProfiles: 0,
    totalSyntheses: 0,
    avgQuality: 0,
    totalDuration: 0,
  });

  /**
   * 向导步骤定义
   */
  const wizardSteps: WizardStep[] = [
    {
      id: 'record',
      title: '录音或上传',
      description: '录音或上传音频文件作为声音样本',
      icon: <Mic className="w-5 h-5" />,
    },
    {
      id: 'configure',
      title: '档案设置',
      description: '配置档案名称和描述信息',
      icon: <Sparkles className="w-5 h-5" />,
    },
    {
      id: 'train',
      title: '训练模型',
      description: '系统训练声音克隆模型',
      icon: <Wand2 className="w-5 h-5" />,
    },
  ];

  // 当前向导步骤
  const [currentWizardStep, setCurrentWizardStep] = useState(0);

  /**
   * 加载声音档案
   */
  const loadProfiles = async () => {
    try {
      const mockProfiles: VoiceProfileItem[] = [
        {
          id: '1',
          name: '演示声音1',
          sampleUrl: '',
          isDefault: true,
          description: '用于测试的声音档案',
          samples: 10,
          duration: 120,
          createdAt: Date.now() - 86400000,
          quality: 0.95,
        },
      ];
      setProfiles(mockProfiles);
      setStats((prev) => ({
        ...prev,
        totalProfiles: mockProfiles.length,
        avgQuality: mockProfiles.reduce((sum, p) => sum + (p.quality || 0), 0) / mockProfiles.length,
      }));
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  /**
   * 加载合成历史
   */
  const loadHistory = async () => {
    try {
      setSynthesisHistory([]);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  /**
   * 开始录音
   */
  const handleStartRecording = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      toast.success('开始录音', { icon: '🎤' });
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('麦克风访问失败');
    }
  };

  /**
   * 停止录音
   */
  const handleStopRecording = () => {
    setIsRecording(false);
    toast('录音已停止');
  };

  /**
   * 处理录音完成
   */
  const handleRecordingComplete = (audioBlob: Blob) => {
    setRecordedAudio(audioBlob);
    setCurrentWizardStep(1);
    toast.success('录音完成', { icon: '✅' });
  };

  /**
   * 处理文件上传
   */
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];
      if (!validTypes.includes(file.type)) {
        toast.error('请上传音频文件（WAV, MP3, OGG）');
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        toast.error('文件大小不能超过50MB');
        return;
      }

      setUploadedAudio(file);
      setCurrentWizardStep(1);
      toast.success('文件上传成功', { icon: '📁' });
    }
  };

  /**
   * 开始训练
   */
  const handleStartTraining = async () => {
    if (!currentProfile.name) {
      toast.error('请输入档案名称');
      return;
    }

    if (!recordedAudio && !uploadedAudio) {
      toast.error('请先录音或上传音频');
      return;
    }

    setIsTraining(true);
    setCurrentWizardStep(2);

    try {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const newProfile: VoiceProfileItem = {
        id: Date.now().toString(),
        name: currentProfile.name,
        sampleUrl: '',
        isDefault: false,
        description: currentProfile.description || '',
        samples: recordedAudio ? 1 : 0,
        duration: 0,
        createdAt: Date.now(),
        quality: 0.9,
      };

      setProfiles(prev => [newProfile, ...prev]);
      setIsTraining(false);
      setCurrentProfile({ name: '', description: '' });
      setRecordedAudio(null);
      setUploadedAudio(null);
      setCurrentWizardStep(0);
      setStats((prev) => ({
        ...prev,
        totalProfiles: prev.totalProfiles + 1,
      }));
      toast.success('声音档案训练完成', { icon: '🎉' });
      setActiveTab('profile');
    } catch (error) {
      console.error('Training error:', error);
      setIsTraining(false);
      toast.error('训练失败，请重试');
    }
  };

  /**
   * 开始合成
   */
  const handleSynthesize = async () => {
    if (!synthesisText.trim()) {
      toast.error('请输入要合成的文本');
      return;
    }

    if (!selectedProfile) {
      toast.error('请选择声音档案');
      return;
    }

    setIsSynthesizing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const profile = profiles.find(p => p.id === selectedProfile);
      const newRecord: SynthesisRecord = {
        id: Date.now().toString(),
        text: synthesisText,
        audioUrl: '',
        profileId: selectedProfile,
        profileName: profile?.name || '未知',
        createdAt: Date.now(),
        duration: 5,
      };

      setSynthesisResult(newRecord);
      setSynthesisHistory(prev => [newRecord, ...prev]);
      setIsSynthesizing(false);
      setStats((prev) => ({
        ...prev,
        totalSyntheses: prev.totalSyntheses + 1,
        totalDuration: prev.totalDuration + newRecord.duration,
      }));
      toast.success('合成完成', { icon: '✨' });
    } catch (error) {
      console.error('Synthesis error:', error);
      setIsSynthesizing(false);
      toast.error('合成失败，请重试');
    }
  };

  /**
   * 停止播放
   */
  const handleStopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  /**
   * 删除档案
   */
  const handleDeleteProfile = async (id: string) => {
    try {
      setProfiles(prev => {
        const newProfiles = prev.filter(p => p.id !== id);
        setStats((prevStats) => ({
          ...prevStats,
          totalProfiles: newProfiles.length,
          avgQuality: newProfiles.length > 0 
            ? newProfiles.reduce((sum, p) => sum + (p.quality || 0), 0) / newProfiles.length
            : 0,
        }));
        return newProfiles;
      });
      toast.success('档案已删除');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('删除失败');
    }
  };

  /**
   * 下载音频
   */
  const handleDownload = (record: SynthesisRecord) => {
    const blob = new Blob([record.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice_synthesis_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('已下载', { icon: '📥' });
  };

  /**
   * 重置
   */
  const handleReset = () => {
    setRecordedAudio(null);
    setUploadedAudio(null);
    setSynthesisText('');
    setSelectedProfile('');
    setSynthesisResult(null);
    setIsRecording(false);
    setIsTraining(false);
    setIsSynthesizing(false);
    setIsPlaying(false);
    setCurrentWizardStep(0);
    setCurrentProfile({ name: '', description: '' });
    if (audioRef.current) {
      audioRef.current.pause();
    }
    toast('已重置');
  };

  /**
   * 关闭引导
   */
  const handleCloseGuide = () => {
    setShowGuide(false);
    localStorage.setItem('hasSeenVoiceCloningGuide', 'true');
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadProfiles();
    loadHistory();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-green-900/20">
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
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-8 text-white text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                >
                  <Sparkles className="w-10 h-10" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">欢迎使用声音克隆</h2>
                <p className="text-green-100">创造属于你的专属声音</p>
              </div>
              <div className="p-8">
                <div className="space-y-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 dark:text-green-400 font-bold">1</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      通过录音或上传创建声音档案
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 dark:text-green-400 font-bold">2</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      系统自动训练声音克隆模型
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 dark:text-green-400 font-bold">3</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      使用专属声音进行语音合成
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCloseGuide}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all"
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
                <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  声音克隆
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
                  ✨
                </motion.span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                创造属于你的专属声音，用独特的音色进行语音合成
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
        {stats.totalProfiles > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <EmotionCard
              title="声音档案"
              variant="info"
              icon={<User className="w-5 h-5" />}
            >
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalProfiles}
              </span>
            </EmotionCard>
            <EmotionCard
              title="合成次数"
              variant="success"
              icon={<Music className="w-5 h-5" />}
            >
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalSyntheses}
              </span>
            </EmotionCard>
            <EmotionCard
              title="平均质量"
              variant="warning"
              icon={<Award className="w-5 h-5" />}
            >
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {(stats.avgQuality * 100).toFixed(0)}%
              </span>
            </EmotionCard>
            <EmotionCard
              title="总时长"
              variant="info"
              icon={<Clock className="w-5 h-5" />}
            >
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatDuration(Math.round(stats.totalDuration))}
              </span>
            </EmotionCard>
          </motion.div>
        )}

        {/* 标签页导航 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-lg inline-flex space-x-2">
            {[
              { value: 'profile', label: '声音档案', icon: Layers },
              { value: 'wizard', label: '创建档案', icon: Sparkles },
              { value: 'synthesize', label: '语音合成', icon: Music },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value as any)}
                className={`
                  flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all
                  ${activeTab === tab.value
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* 内容区域 */}
        <AnimatePresence mode="wait">
          {/* 声音档案 */}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 新建档案卡片 */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setActiveTab('wizard')}
                  className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl hover:border-green-500 dark:hover:border-green-500 transition-all group"
                >
                  <div className="flex flex-col items-center justify-center h-48">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <PlusCircle className="w-16 h-16 text-gray-400 group-hover:text-green-500 mb-4 transition-colors" />
                    </motion.div>
                    <span className="text-gray-600 dark:text-gray-400 font-medium text-lg">
                      创建新声音档案
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      录音或上传音频样本
                    </span>
                  </div>
                </motion.button>

                {/* 现有档案列表 */}
                {profiles.map((profile) => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden group hover:shadow-2xl transition-all"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <motion.div
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                            className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-400 rounded-xl flex items-center justify-center"
                          >
                            <User className="w-7 h-7 text-white" />
                          </motion.div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                              {profile.name}
                            </h3>
                            {profile.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {profile.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteProfile(profile.id)}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <span className="text-gray-600 dark:text-gray-400 flex items-center">
                            <FileAudio className="w-4 h-4 mr-2" />
                            样本数量
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {profile.samples}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <span className="text-gray-600 dark:text-gray-400 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            质量评分
                          </span>
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {((profile.quality || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <span className="text-gray-600 dark:text-gray-400 flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            创建时间
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatDuration(Math.round((Date.now() - profile.createdAt) / 1000 / 60))}前
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 pb-6">
                      <button
                        onClick={() => {
                          setSelectedProfile(profile.id);
                          setActiveTab('synthesize');
                        }}
                        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                      >
                        <span>使用此声音</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 创建向导 */}
          {activeTab === 'wizard' && (
            <motion.div
              key="wizard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-4xl mx-auto"
            >
              {/* 步骤指示器 */}
              <div className="mb-8">
                <div className="relative">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 -translate-y-1/2" />
                  <motion.div
                    className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-500 -translate-y-1/2"
                    animate={{ width: `${((currentWizardStep + 1) / wizardSteps.length) * 100}%` }}
                  />
                  <div className="flex justify-between relative">
                    {wizardSteps.map((step, index) => {
                      const isCompleted = index < currentWizardStep;
                      const isActive = index === currentWizardStep;
                      return (
                        <div key={step.id} className="flex flex-col items-center space-y-2">
                          <motion.div
                            className={`
                              w-12 h-12 rounded-full flex items-center justify-center
                              ${isActive
                                ? 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg'
                                : isCompleted
                                  ? 'bg-green-500'
                                  : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600'
                              }
                            `}
                            animate={{ scale: isActive ? 1.1 : 1 }}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-6 h-6 text-white" />
                            ) : (
                              <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                {step.icon}
                              </div>
                            )}
                          </motion.div>
                          <span className={`text-sm font-medium ${isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {step.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 步骤 1: 录音或上传 */}
              {currentWizardStep === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8"
                >
                  {/* 录音选项 */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={handleStartRecording}
                    className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 cursor-pointer hover:shadow-2xl transition-all"
                  >
                    <div className="flex flex-col items-center text-center">
                      <motion.div
                        animate={
                          isRecording
                            ? { scale: [1, 1.2, 1], boxShadow: ['0 0 0 rgba(34, 197, 94, 0)', '0 0 20px rgba(34, 197, 94, 0.5)', '0 0 0 rgba(34, 197, 94, 0)'] }
                            : {}
                        }
                        transition={{ duration: 1, repeat: isRecording ? Infinity : 0 }}
                        className={`w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center mb-6 ${isRecording ? 'ring-4 ring-green-300' : ''}`}
                      >
                        {isRecording ? (
                          <Square className="w-10 h-10 text-white" />
                        ) : (
                          <Mic className="w-10 h-10 text-white" />
                        )}
                      </motion.div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        开始录音
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        录制您独特的声音样本
                      </p>
                      {isRecording && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center space-x-2"
                        >
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-sm font-medium">录音中...</span>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>

                  {/* 上传选项 */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 cursor-pointer hover:shadow-2xl transition-all"
                  >
                    <input
                      type="file"
                      id="audio-upload"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label htmlFor="audio-upload" className="cursor-pointer block h-full flex flex-col items-center text-center">
                      <motion.div
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.6 }}
                        className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center mb-6"
                      >
                        <Upload className="w-10 h-10 text-white" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        上传音频
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        支持 WAV, MP3, OGG 格式
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        最大 50MB
                      </p>
                    </label>
                  </motion.div>
                </motion.div>
              )}

              {/* 步骤 2: 档案设置 */}
              {currentWizardStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 mt-8"
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                    <Sparkles className="w-6 h-6 mr-3 text-green-500" />
                    档案设置
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        档案名称 *
                      </label>
                      <input
                        type="text"
                        value={currentProfile.name}
                        onChange={(e) => setCurrentProfile({
                          ...currentProfile,
                          name: e.target.value
                        })}
                        placeholder="例如：我的声音"
                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 border-transparent focus:border-green-500 outline-none transition-colors text-lg text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        描述
                      </label>
                      <textarea
                        value={currentProfile.description}
                        onChange={(e) => setCurrentProfile({
                          ...currentProfile,
                          description: e.target.value
                        })}
                        placeholder="描述这个声音档案的特点..."
                        rows={4}
                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 border-transparent focus:border-green-500 outline-none transition-colors resize-none text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* 音频预览 */}
                    {(recordedAudio || uploadedAudio) && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                            <div>
                              <p className="text-sm font-bold text-green-600 dark:text-green-400">
                                音频已准备就绪
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                大小: {formatFileSize((recordedAudio || uploadedAudio!)?.size || 0)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => { setRecordedAudio(null); setUploadedAudio(null); }}
                            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    <div className="flex space-x-4">
                      <button
                        onClick={() => setCurrentWizardStep(0)}
                        className="flex-1 py-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        上一步
                      </button>
                      <button
                        onClick={handleStartTraining}
                        disabled={isTraining || !currentProfile.name || !recordedAudio}
                        className="flex-1 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                      >
                        {isTraining ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                            />
                            <span>训练中...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-5 h-5" />
                            <span>开始训练</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 步骤 3: 训练中 */}
              {currentWizardStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-12 text-center mt-8"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-24 h-24 mx-auto mb-8 border-4 border-green-500 border-t-transparent rounded-full"
                  />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    正在训练声音模型
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    系统正在分析您的声音特征，这通常需要几秒钟...
                  </p>
                  <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                    {['分析波形', '提取特征', '生成模型'].map((step, i) => (
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: i < 3 ? 1 : 0, scale: 1 }}
                        transition={{ delay: i * 0.5 }}
                        className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl"
                      >
                        <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-2" />
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{step}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* 语音合成 */}
          {activeTab === 'synthesize' && (
            <motion.div
              key="synthesize"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* 合成设置 */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                      <Music className="w-5 h-5 mr-2 text-green-500" />
                      语音合成
                    </h2>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* 档案选择 */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        选择声音档案 *
                      </label>
                      <select
                        value={selectedProfile}
                        onChange={(e) => setSelectedProfile(e.target.value)}
                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 border-transparent focus:border-green-500 outline-none transition-colors text-gray-900 dark:text-white"
                      >
                        <option value="">-- 请选择 --</option>
                        {profiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name} {profile.isDefault ? '(默认)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 文本输入 */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        输入要合成的文本 *
                      </label>
                      <textarea
                        value={synthesisText}
                        onChange={(e) => setSynthesisText(e.target.value)}
                        placeholder="请输入要合成的文本内容..."
                        rows={8}
                        maxLength={1000}
                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 border-transparent focus:border-green-500 outline-none transition-colors resize-none text-gray-900 dark:text-white"
                      />
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {synthesisText.length}/1000
                      </div>
                    </div>

                    {/* 合成按钮 */}
                    <button
                      onClick={handleSynthesize}
                      disabled={isSynthesizing || !synthesisText || !selectedProfile}
                      className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                    >
                      {isSynthesizing ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          />
                          <span>合成中...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          <span>开始合成</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 合成结果 */}
                {synthesisResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden"
                  >
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                        <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
                        合成结果
                      </h2>
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
                        <p className="text-gray-900 dark:text-white leading-relaxed text-lg">
                          {synthesisResult.text}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">时长</span>
                          <span className="font-medium text-gray-900 dark:text-white ml-auto">
                            {formatDuration(synthesisResult.duration)}
                          </span>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">声音</span>
                          <span className="font-medium text-gray-900 dark:text-white ml-auto">
                            {synthesisResult.profileName}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => { setIsPlaying(!isPlaying); toast(isPlaying ? '已暂停' : '开始播放'); }}
                          className="flex items-center justify-center space-x-2 p-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-5 h-5" />
                              <span>暂停</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-5 h-5" />
                              <span>播放</span>
                            </>
                          )}
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleDownload(synthesisResult)}
                          className="flex items-center justify-center space-x-2 p-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
                        >
                          <Download className="w-5 h-5" />
                          <span>下载</span>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* 合成历史 */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Sparkles className="w-5 h-5 mr-2" />
                    合成历史
                  </h2>
                </div>

                <div className="p-4 max-h-[600px] overflow-y-auto">
                  {synthesisHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                      <Music className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        暂无合成记录
                      </p>
                    </div>
                  ) : (
                    synthesisHistory.map((record, index) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="mb-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:shadow-md transition-shadow cursor-pointer group"
                        onClick={() => {
                          setSynthesisResult(record);
                          setSynthesisText(record.text);
                        }}
                      >
                        <p className="text-sm text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {record.text}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span className="flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {record.profileName}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDuration(record.duration)}
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

export default VoiceCloning;