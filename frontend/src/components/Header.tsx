/**
 * 头部导航组件
 * 提供应用程序的主要导航和用户操作
 * 企业级Web标准 + 情感化设计
 */

import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Hand,
  Mic,
  UserPlus,
  Languages,
  Menu,
  X,
  Settings,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  User,
  LogOut,
} from 'lucide-react';
import type { NavMenuItem } from '../types';

interface HeaderProps {
  /** 菜单项 */
  menuItems: NavMenuItem[];
  /** 当前主题 */
  theme?: 'light' | 'dark' | 'auto';
  /** 主题切换回调 */
  onThemeToggle?: () => void;
  /** 设置打开回调 */
  onOpenSettings?: () => void;
}

/**
 * 导航图标映射
 */
const iconMap: Record<string, React.ElementType> = {
  Home,
  Hand,
  Mic,
  UserPlus,
  Languages,
};

/**
 * 生成面包屑导航
 * 基于 pathname 生成面包屑数据，适用于 BrowserRouter
 */
const generateBreadcrumbs = (
  pathname: string,
  menuItems: NavMenuItem[]
) => {
  // 主页默认不显示面包屑
  if (pathname === '/') return null;

  const breadcrumbs: Array<{ title: string; path: string; isLast: boolean }> = [];
  
  // 添加主页
  breadcrumbs.push({
    title: '主页',
    path: '/',
    isLast: false,
  });

  // 查找当前路径对应的菜单项
  const currentMenuItem = menuItems.find(item => item.path === pathname);
  if (currentMenuItem) {
    breadcrumbs.push({
      title: currentMenuItem.label,
      path: currentMenuItem.path,
      isLast: true,
    });
  } else if (pathname === '/settings') {
    // 设置页面
    breadcrumbs.push({
      title: '设置',
      path: '/settings',
      isLast: true,
    });
  } else if (pathname === '/profile') {
    // 个人资料页面
    breadcrumbs.push({
      title: '个人资料',
      path: '/profile',
      isLast: true,
    });
  }

  return breadcrumbs.length <= 1 ? null : breadcrumbs;
};

/**
 * 头部导航组件
 */
export const Header: React.FC<HeaderProps> = ({
  menuItems,
  theme = 'light',
  onThemeToggle,
  onOpenSettings,
}) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 生成面包屑
  const breadcrumbs = useMemo(
    () => generateBreadcrumbs(location.pathname, menuItems),
    [location.pathname, menuItems]
  );

  /**
   * 获取图标组件
   */
  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Home;
    return <IconComponent className="w-5 h-5" />;
  };

  /**
   * 检查是否是当前激活的菜单
   */
  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  /**
   * 处理主题切换
   */
  const handleThemeToggle = () => {
    onThemeToggle?.();
    // 触发主题切换反馈
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 主导航栏 */}
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo和移动端菜单按钮 */}
          <div className="flex items-center space-x-3 md:space-x-4">
            {/* 移动端菜单按钮 */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={isMobileMenuOpen ? '关闭菜单' : '打开菜单'}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              )}
            </motion.button>

            {/* Logo */}
            <Link
              to="/"
              className="flex items-center space-x-2 md:space-x-3 group"
            >
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow"
              >
                <Hand className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </motion.div>
              <div className="hidden sm:block">
                <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
                  Sign AI
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  手语识别与交互系统
                </p>
              </div>
            </Link>
          </div>

          {/* 桌面端导航 */}
          <nav className="hidden xl:flex items-center space-x-1">
            {menuItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`
                  relative flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-200
                  ${isActive(item.path)
                    ? 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-700 dark:text-purple-300 font-semibold shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50'
                  }
                `}
              >
                <span className="relative">{getIcon(item.icon)}</span>
                <span className="font-medium">{item.label}</span>
                {isActive(item.path) && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* 右侧操作按钮 */}
          <div className="flex items-center space-x-1 md:space-x-2">
            {/* 通知按钮 */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 md:p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="通知"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                {/* 通知红点 */}
                <motion.span
                  className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-gradient-to-br from-red-500 to-pink-500 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </motion.button>

              {/* 通知下拉菜单 */}
              <AnimatePresence>
                {showNotifications && (
                  <>
                    {/* 背景遮罩 */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-3 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                            通知
                          </h3>
                          <button
                            onClick={() => setShowNotifications(false)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </button>
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto p-4">
                        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                          <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">暂无新通知</p>
                        </div>
                      </div>
                      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="w-full text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
                        >
                          查看全部通知
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* 主题切换按钮 */}
            <motion.button
              whileHover={{ scale: 1.05, rotate: 15 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleThemeToggle}
              className="p-2 md:p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
              aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            >
              <AnimatePresence mode="wait">
                {theme === 'dark' ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* 设置按钮 */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenSettings}
              className="hidden sm:flex p-2 md:p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="设置"
              aria-label="设置"
            >
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </motion.button>

            {/* 用户菜单 */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-1.5 md:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="用户菜单"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </motion.button>

              <AnimatePresence>
                {showUserMenu && (
                  <>
                    {/* 背景遮罩 */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                    >
                      <div className="p-2">
                        <Link
                          to="/profile"
                          className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">个人资料</span>
                        </Link>
                        <Link
                          to="/settings"
                          className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">系统设置</span>
                        </Link>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                        <button
                          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400"
                          onClick={() => {
                            setShowUserMenu(false);
                            // 这里可以添加登出逻辑
                          }}
                        >
                          <LogOut className="w-5 h-5" />
                          <span className="text-sm font-medium">退出登录</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* 面包屑导航 */}
        {breadcrumbs && breadcrumbs.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden md:flex items-center space-x-2 py-2 text-sm border-t border-gray-100 dark:border-gray-800"
          >
            {breadcrumbs.map((breadcrumb, index) => (
              <React.Fragment key={breadcrumb.path}>
                <Link
                  to={breadcrumb.path}
                  className={`
                    flex items-center space-x-1 hover:text-purple-600 dark:hover:text-purple-400 transition-colors
                    ${breadcrumb.isLast
                      ? 'text-gray-900 dark:text-white font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  {breadcrumb.title}
                </Link>
                {!breadcrumb.isLast && (
                  <ChevronDown className="w-3 h-3 text-gray-400 rotate-[-90deg]" />
                )}
              </React.Fragment>
            ))}
          </motion.div>
        )}

        {/* 移动端导航菜单 */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden pb-4"
            >
              <div className="flex flex-col space-y-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                        ${isActive(item.path)
                          ? 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-700 dark:text-purple-300 font-medium'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <span>{getIcon(item.icon)}</span>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </motion.div>
                ))}
                
                {/* 移动端设置按钮 */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: menuItems.length * 0.05 }}
                >
                  <button
                    onClick={() => {
                      onOpenSettings?.();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">设置</span>
                  </button>
                </motion.div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Header;