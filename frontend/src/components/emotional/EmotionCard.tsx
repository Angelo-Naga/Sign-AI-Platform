/**
 * EmotionCard - 情感化卡片组件
 * 提供悬停效果、加载动画和状态反馈
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 卡片变体类型
type CardVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

// 卡片属性接口
interface EmotionCardProps {
  /** 卡片标题 */
  title?: string;
  /** 卡片内容 */
  children: React.ReactNode;
  /** 卡片变体 */
  variant?: CardVariant;
  /** 是否悬停升起 */
  hoverable?: boolean;
  /** 是否可点击 */
  clickable?: boolean;
  /** 点击事件 */
  onClick?: () => void;
  /** 是否加载中 */
  loading?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 卡片图标 */
  icon?: React.ReactNode;
  /** 底部操作区 */
  actions?: React.ReactNode;
  /** 是否显示阴影 */
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * 卡片变体颜色映射
 */
const cardVariants: Record<CardVariant, { bg: string; border: string; icon: string }> = {
  default: {
    bg: 'bg-white',
    border: 'border-gray-200',
    icon: 'text-gray-600'
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-600'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600'
  }
};

const EmotionCard: React.FC<EmotionCardProps> = ({
  title,
  children,
  variant = 'default',
  hoverable = true,
  clickable = false,
  onClick,
  loading = false,
  className = '',
  icon,
  actions,
  shadow = 'md'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const variantConfig = cardVariants[variant];

  /**
   * 卡片动画变体配置
   */
  const cardVariants_anim = {
    idle: {
      y: 0,
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      boxShadow: hoverable ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
    },
    hover: hoverable
      ? {
          y: -8,
          scale: 1.02,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }
      : {}
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  return (
    <motion.div
      className={`
        relative rounded-2xl border-2 p-6
        ${variantConfig.bg} ${variantConfig.border}
        ${clickable ? 'cursor-pointer' : ''}
        transition-all duration-300
        ${className}
      `}
      variants={cardVariants_anim}
      initial="idle"
      animate={isHovered ? 'hover' : 'idle'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={clickable && !loading ? onClick : undefined}
      whileTap={clickable ? { scale: 0.98 } : {}}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20
      }}
    >
      {/* 加载遮罩 */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-12 h-12"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            >
              <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent" />
              <div className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-blue-400 border-b-transparent border-l-blue-400" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 卡片光效 */}
      <AnimatePresence>
        {isHovered && hoverable && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.3) 0%, transparent 70%)'
            }}
          />
        )}
      </AnimatePresence>

      {/* 卡片头部 */}
      {(title || icon) && (
        <div className="flex items-center gap-3 mb-4">
          {icon && (
            <motion.div
              className={`${variantConfig.icon}`}
              animate={isHovered ? { scale: 1.1, rotate: 5 } : {}}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {icon}
            </motion.div>
          )}
          {title && (
            <motion.h3
              className="text-xl font-semibold text-gray-800"
              animate={isHovered ? { x: 4 } : {}}
            >
              {title}
            </motion.h3>
          )}
        </div>
      )}

      {/* 卡片内容 */}
      <motion.div
        opacity={loading ? 0 : 1}
        animating={{ opacity: loading ? 0 : 1 }}
      >
        {children}
      </motion.div>

      {/* 底部操作区 */}
      {actions && (
        <motion.div
          className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {actions}
        </motion.div>
      )}

      {/* 悬停指示器 */}
      <AnimatePresence>
        {isHovered && clickable && (
          <motion.div
            className="absolute top-4 right-4"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          >
            <svg
              className="w-5 h-5 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EmotionCard;