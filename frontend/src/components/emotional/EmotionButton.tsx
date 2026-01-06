/**
 * EmotionButton - 情感化按钮组件
 * 提供丰富的交互动画和视觉反馈，增强用户体验
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';

// 按钮尺寸类型
type ButtonSize = 'small' | 'medium' | 'large';

// 按钮变体类型
type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';

// 按钮属性接口
interface EmotionButtonProps {
  /** 按钮文本 */
  children: React.ReactNode;
  /** 按钮变体 */
  variant?: ButtonVariant;
  /** 按钮尺寸 */
  size?: ButtonSize;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 是否显示涟漪效果 */
  ripple?: boolean;
  /** 点击事件 */
  onClick?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 图标 */
  icon?: React.ReactNode;
  /** 图标位置 */
  iconPosition?: 'left' | 'right';
  /** 是否全宽度 */
  fullWidth?: boolean;
}

/**
 * 按钮颜色映射配置
 */
const buttonVariants: Record<ButtonVariant, { bg: string; hover: string; text: string }> = {
  primary: {
    bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
    hover: 'from-blue-600 to-blue-700',
    text: 'text-white'
  },
  secondary: {
    bg: 'bg-gradient-to-r from-gray-500 to-gray-600',
    hover: 'from-gray-600 to-gray-700',
    text: 'text-white'
  },
  success: {
    bg: 'bg-gradient-to-r from-green-500 to-green-600',
    hover: 'from-green-600 to-green-700',
    text: 'text-white'
  },
  warning: {
    bg: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
    hover: 'from-yellow-600 to-yellow-700',
    text: 'text-white'
  },
  danger: {
    bg: 'bg-gradient-to-r from-red-500 to-red-600',
    hover: 'from-red-600 to-red-700',
    text: 'text-white'
  },
  ghost: {
    bg: 'bg-transparent',
    hover: 'hover:bg-gray-100',
    text: 'text-gray-700'
  }
};

/**
 * 按钮尺寸映射配置
 */
const buttonSizes: Record<ButtonSize, string> = {
  small: 'px-3 py-1.5 text-sm',
  medium: 'px-4 py-2 text-base',
  large: 'px-6 py-3 text-lg'
};

const EmotionButton: React.FC<EmotionButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  ripple = true,
  onClick,
  className = '',
  icon,
  iconPosition = 'left',
  fullWidth = false
}) => {
  const [isClicked, setIsClicked] = useState(false);

  const variantConfig = buttonVariants[variant];
  const sizeClass = buttonSizes[size];

  /**
   * 处理按钮点击事件
   * 添加点击动画反馈
   */
  const handleClick = () => {
    if (!disabled && !loading) {
      setIsClicked(true);
      setTimeout(() => setIsClicked(false), 200);
      onClick?.();
    }
  };

  return (
    <motion.button
      className={`
        relative overflow-hidden rounded-lg font-semibold
        ${variantConfig.bg} ${variantConfig.text}
        ${sizeClass}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        transition-all duration-300
        shadow-md hover:shadow-lg
        ${className}
      `}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      onClick={handleClick}
      disabled={disabled || loading}
      animate={isClicked ? { scale: [1, 0.95, 1] } : {}}
      transition={{
        duration: 0.3,
        ease: 'easeInOut'
      }}
    >
      {/* 涟漪效果 */}
      {ripple && !disabled && !loading && (
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.5, opacity: 0 }}
          animate={isClicked ? { scale: 3, opacity: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            transformOrigin: 'center'
          }}
        />
      )}

      {/* 加载动画 */}
      {loading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}

      {/* 按钮内容 */}
      <span className={`flex items-center justify-center gap-2 ${loading ? 'opacity-0' : ''}`}>
        {icon && iconPosition === 'left' && <span>{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span>{icon}</span>}
      </span>

      {/* 悬停光泽效果 */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0"
        animate={!disabled && !loading ? { x: ['-100%', '200%'], opacity: [0, 0.2, 0] } : {}}
        transition={{ duration: 0.6 }}
        style={{ pointerEvents: 'none' }}
      />
    </motion.button>
  );
};

export default EmotionButton;