/**
 * 设置面板组件
 * 用于配置应用程序的各项设置
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Monitor, Volume2, Palette, Bell, Save, RotateCcw } from 'lucide-react';
import type { AppSettings, CameraConfig } from '../types';

interface SettingsPanelProps {
  /** 当前设置 */
  settings: AppSettings;
  /** 设置更新回调 */
  onUpdate: (settings: Partial<AppSettings>) => void;
  /** 是否显示 */
  isOpen?: boolean;
  /** 关闭回调 */
  onClose?: () => void;
}

/**
 * 设置面板组件
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdate,
  isOpen = true,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'camera' | 'audio' | 'theme'>('general');
  const [tempSettings, setTempSettings] = useState(settings);

  const handleSave = () => {
    onUpdate(tempSettings);
    onClose?.();
  };

  const handleReset = () => {
    setTempSettings(settings);
  };

  const tabs = [
    { id: 'general' as const, label: '通用', icon: Settings },
    { id: 'camera' as const, label: '摄像头', icon: Monitor },
    { id: 'audio' as const, label: '音频', icon: Volume2 },
    { id: 'theme' as const, label: '外观', icon: Palette },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* 设置面板 */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">设置</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* 标签页 */}
            <div className="flex space-x-1 p-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap
                      ${activeTab === tab.id
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'general' && (
                <GeneralSettings settings={tempSettings} onUpdate={setTempSettings} />
              )}
              {activeTab === 'camera' && (
                <CameraSettings settings={tempSettings} onUpdate={setTempSettings} />
              )}
              {activeTab === 'audio' && (
                <AudioSettings settings={tempSettings} onUpdate={setTempSettings} />
              )}
              {activeTab === 'theme' && (
                <ThemeSettings settings={tempSettings} onUpdate={setTempSettings} />
              )}
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleReset}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重置</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-shadow"
              >
                <Save className="w-4 h-4" />
                <span>保存设置</span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/**
 * 通用设置
 */
const GeneralSettings: React.FC<{
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
}> = ({ settings, onUpdate }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 语言设置 */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">语言设置</h3>
        <select
          value={settings.language}
          onChange={(e) => onUpdate({ ...settings, language: e.target.value as 'zh' | 'en' })}
          className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
        >
          <option value="zh">简体中文 🇨🇳</option>
          <option value="en">English 🇺🇸</option>
        </select>
      </div>

      {/* 通知设置 */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Bell className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">通知</h3>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) => onUpdate({ ...settings, notifications: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          启用后，您将收到重要操作的通知提醒
        </p>
      </div>

      {/* 自动保存 */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">自动保存</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              自动保存您的识别结果和翻译记录
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoSave}
              onChange={(e) => onUpdate({ ...settings, autoSave: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>

      {/* 音效 */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">音效</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              操作时播放提示音效
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.soundEffects}
              onChange={(e) => onUpdate({ ...settings, soundEffects: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * 摄像头设置
 */
const CameraSettings: React.FC<{
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
}> = ({ settings, onUpdate }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">摄像头设备</h3>
        <select
          value={settings.cameraId}
          onChange={(e) => onUpdate({ ...settings, cameraId: e.target.value })}
          className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
        >
          <option value="">选择摄像头...</option>
          <option value="default">默认摄像头</option>
        </select>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">测试摄像头</h3>
        <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
          <Monitor className="w-16 h-16 text-gray-600" />
        </div>
      </div>
    </motion.div>
  );
};

/**
 * 音频设置
 */
const AudioSettings: React.FC<{
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
}> = ({ settings, onUpdate }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">麦克风设备</h3>
        <select
          value={settings.microphoneId}
          onChange={(e) => onUpdate({ ...settings, microphoneId: e.target.value })}
          className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
        >
          <option value="">选择麦克风...</option>
          <option value="default">默认麦克风</option>
        </select>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">测试麦克风</h3>
        <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-lg h-32 flex items-center justify-center">
          <Volume2 className="w-12 h-12 text-purple-500" />
        </div>
      </div>
    </motion.div>
  );
};

/**
 * 主题设置
 */
const ThemeSettings: React.FC<{
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
}> = ({ settings, onUpdate }) => {
  const themes = [
    { id: 'light' as const, name: '浅色模式', icon: '☀️', desc: '明亮清新的界面' },
    { id: 'dark' as const, name: '深色模式', icon: '🌙', desc: '护眼的深色主题' },
    { id: 'auto' as const, name: '跟随系统', icon: '🔄', desc: '自动切换主题' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {themes.map((theme) => (
        <motion.button
          key={theme.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onUpdate({ ...settings, theme: theme.id })}
          className={`
            w-full p-4 rounded-xl border-2 transition-all
            ${settings.theme === theme.id
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
            }
          `}
        >
          <div className="flex items-center space-x-4">
            <span className="text-3xl">{theme.icon}</span>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white">{theme.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{theme.desc}</p>
            </div>
            {settings.theme === theme.id && (
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
};

export default SettingsPanel;