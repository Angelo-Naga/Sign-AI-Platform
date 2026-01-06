/**
 * HeroSection 组件 - 情感化英雄区域
 * 用于首页的大横幅区域，展示品牌形象和核心价值
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, Shield } from 'lucide-react';

interface HeroSectionProps {
  /** 主标题 */
  title: string;
  /** 副标题/描述 */
  subtitle: string;
  /** 主要CTA按钮文字 */
  ctaText?: string;
  /** 次要CTA按钮文字 */
  secondaryCtaText?: string;
  /** 主要CTA点击回调 */
  onCtaClick?: () => void;
  /** 次要CTA点击回调 */
  onSecondaryCtaClick?: () => void;
  /** 背景渐变类名 */
  gradientClass?: string;
  /** 统计数据 */
  stats?: Array<{ value: string; label: string }>;
  /** 是否显示动画装饰 */
  showDecorations?: boolean;
  /** 额外类名 */
  className?: string;
  /** 特性标签文字 */
  badgeText?: string;
}

/**
 * HeroSection 组件
 */
export const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  subtitle,
  ctaText = '立即开始',
  secondaryCtaText = '了解更多',
  onCtaClick,
  onSecondaryCtaClick,
  gradientClass = 'bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900',
  stats,
  showDecorations = true,
  className = '',
  badgeText = 'AI驱动的智能交流平台',
}) => {
  // 容器变体动画
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  // 项目变体动画
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <section className={`relative overflow-hidden ${gradientClass} py-16 md:py-24 lg:py-32 px-4 ${className}`}>
      {/* 背景装饰动画 */}
      {showDecorations && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {/* 左上角装饰 */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute -top-32 -right-32 w-64 h-64 bg-purple-300 dark:bg-purple-700 rounded-full opacity-20 blur-3xl"
          />
          {/* 右下角装饰 */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, -90, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute -bottom-32 -left-32 w-96 h-96 bg-pink-300 dark:bg-pink-700 rounded-full opacity-20 blur-3xl"
          />
          {/* 中间装饰圆 */}
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-200 dark:bg-blue-800 rounded-full opacity-10 blur-3xl"
          />
        </div>
      )}

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto relative">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center"
        >
          {/* 品牌/特性标签 */}
          <motion.div variants={itemVariants} className="mb-6 md:mb-8">
            <div className="inline-flex items-center space-x-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-4 md:px-6 py-2 md:py-3 shadow-lg">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
              <span className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">
                {badgeText}
              </span>
            </div>
          </motion.div>

          {/* 主标题 */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 md:mb-6 leading-tight"
          >
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
              {title}
            </span>
          </motion.h1>

          {/* 副标题 */}
          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-400 mb-8 md:mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            {subtitle}
          </motion.p>

          {/* CTA 按钮组 */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 mb-12 md:mb-16"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCtaClick}
              className={`
                w-full sm:w-auto px-8 py-4 md:px-10 md:py-5
                bg-gradient-to-r from-purple-600 to-pink-600
                text-white rounded-full font-semibold text-lg shadow-lg 
                hover:shadow-xl transition-all flex items-center justify-center space-x-2
              `}
            >
              <span>{ctaText}</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSecondaryCtaClick}
              className="w-full sm:w-auto px-8 py-4 md:px-10 md:py-5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-purple-300 dark:hover:border-purple-600"
            >
              {secondaryCtaText}
            </motion.button>
          </motion.div>

          {/* 统计数据 */}
          {stats && stats.length > 0 && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-4xl mx-auto"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className={`
                    bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl 
                    p-4 md:p-6 shadow-lg hover:shadow-xl transition-shadow
                  `}
                >
                  <p className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
                    {stat.value}
                  </p>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* 底部渐变过渡 */}
      <div className={`absolute bottom-0 left-0 right-0 h-24 ${gradientClass} bg-gradient-to-t from-transparent to-current opacity-50`} />
    </section>
  );
};

export default HeroSection;