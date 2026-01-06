/**
 * 主应用组件
 * 包含路由配置和全局状态管理
 * 企业级Web标准 + 情感化设计
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { create } from 'zustand';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import Footer from './components/Footer';
import SettingsPanel from './components/SettingsPanel';
import Home from './pages/Home';
import SignRecognition from './pages/SignRecognition';
import VoiceProcessing from './pages/VoiceProcessing';
import VoiceCloning from './pages/VoiceCloning';
import Translation from './pages/Translation';
import type { AppSettings, NavMenuItem, Notification } from './types';

/**
 * 全局状态管理
 */
interface AppState {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  theme: 'light' | 'dark' | 'auto';
  toggleTheme: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const useAppStore = create<AppState>((set) => ({
  settings: {
    theme: 'auto',
    language: 'zh',
    microphoneId: '',
    cameraId: '',
    notifications: true,
    autoSave: true,
    soundEffects: true,
  },
  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),
  theme: 'auto',
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'dark' ? 'light' : state.theme === 'light' ? 'dark' : 'dark',
    })),
  loading: false,
  setLoading: (loading) => set({ loading }),
  notifications: [],
  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    set((state) => ({
      notifications: [newNotification, ...state.notifications],
    }));
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));

/**
 * 页面转换动画
 */
const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="flex-1 min-h-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * 全局加载指示器
 */
const GlobalLoader: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="text-center"
      >
        <div className="relative w-16 h-16 mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute inset-0 rounded-full border-4 border-purple-200 dark:border-purple-800"
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 dark:border-t-purple-400"
          />
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600 dark:text-gray-400 font-medium"
        >
          加载中...
        </motion.p>
      </motion.div>
    </div>
  );
};

/**
 * 全局通知系统
 */
const NotificationSystem: React.FC = () => {
  const { notifications, removeNotification } = useAppStore();

  const getIconByType = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'warning':
        return '⚠';
      case 'error':
        return '✕';
      default:
        return 'ℹ';
    }
  };

  const getColorByType = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 dark:bg-green-600';
      case 'warning':
        return 'bg-orange-500 dark:bg-orange-600';
      case 'error':
        return 'bg-red-500 dark:bg-red-600';
      default:
        return 'bg-blue-500 dark:bg-blue-600';
    }
  };

  return (
    <div className="fixed top-24 right-4 z-50 flex flex-col space-y-3 max-w-sm w-full">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
            }}
            className="relative"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* 顶部色条 */}
              <div className={`h-1 w-full ${getColorByType(notification.type)}`} />

              <div className="p-4">
                <div className="flex items-start space-x-3">
                  {/* 图标 */}
                  <div className={`flex-shrink-0 w-8 h-8 ${getColorByType(notification.type)} rounded-lg flex items-center justify-center text-white font-bold`}>
                    {getIconByType(notification.type)}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                      {notification.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {notification.message}
                    </p>
                  </div>

                  {/* 关闭按钮 */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removeNotification(notification.id)}
                    className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="关闭通知"
                  >
                    <svg
                      className="w-4 h-4 text-gray-500 dark:text-gray-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6 6L18 18" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.button>
                </div>

                {/* 操作链接 */}
                {notification.actionLink && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700"
                  >
                    <a
                      href={notification.actionLink}
                      className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                    >
                      查看详情 →
                    </a>
                  </motion.div>
                )}
              </div>

              {/* 自动关闭进度条 */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
                onAnimationComplete={() => removeNotification(notification.id)}
                className={`h-0.5 ${getColorByType(notification.type)} opacity-50`}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

/**
 * 主应用组件
 */
const App: React.FC = () => {
  const { 
    theme, 
    toggleTheme, 
    settings, 
    updateSettings,
    loading,
    notifications 
  } = useAppStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appliedTheme, setAppliedTheme] = useState<'light' | 'dark'>('light');

  /**
   * 应用主题
   */
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      let newTheme: 'light' | 'dark' = 'light';

      if (settings.theme === 'auto') {
        newTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      } else {
        newTheme = settings.theme;
      }

      setAppliedTheme(newTheme);
      root.classList.remove('light', 'dark');
      root.classList.add(newTheme);
    };

    applyTheme();

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (settings.theme === 'auto') {
        applyTheme();
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [settings.theme]);

  /**
   * 导航菜单项
   */
  const menuItems: NavMenuItem[] = [
    {
      id: 'home',
      label: '首页',
      path: '/',
      icon: 'Home',
    },
    {
      id: 'sign',
      label: '手语识别',
      path: '/sign-recognition',
      icon: 'Hand',
    },
    {
      id: 'voice',
      label: '语音处理',
      path: '/voice-processing',
      icon: 'Mic',
    },
    {
      id: 'clone',
      label: '声音克隆',
      path: '/voice-cloning',
      icon: 'UserPlus',
    },
    {
      id: 'translation',
      label: '翻译',
      path: '/translation',
      icon: 'Languages',
    },
  ];

  /**
   * 处理主题切换
   */
  const handleThemeToggle = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  return (
    <div className={`min-h-screen flex flex-col ${appliedTheme}`}>
      {/* 全局加载指示器 */}
      <GlobalLoader visible={loading} />

      {/* 全局通知系统 */}
      <NotificationSystem />

      {/* 头部导航 */}
      <Header
        menuItems={menuItems}
        theme={appliedTheme}
        onThemeToggle={handleThemeToggle}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* 主内容区域 */}
      <main className="flex-1 min-h-0 relative">
        <PageWrapper>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sign-recognition" element={<SignRecognition />} />
            <Route path="/voice-processing" element={<VoiceProcessing />} />
            <Route path="/voice-cloning" element={<VoiceCloning />} />
            <Route path="/translation" element={<Translation />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageWrapper>
      </main>

      {/* 页脚 */}
      <Footer showBackToTop />

      {/* 设置面板 */}
      <SettingsPanel
        settings={settings}
        onUpdate={updateSettings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default App;