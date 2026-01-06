/**
 * EmotionProgress - 情感化进度条组件
 * 提供流畅的进度动画和视觉反馈
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// 进度条尺寸类型
type ProgressSize = 'small' | 'medium' | 'large';

// 进度条变体类型
type ProgressVariant = 'linear' | 'circular' | 'segmented';

// 进度条属性接口
interface EmotionProgressProps {
  /** 当前进度值 (0-100) */
  value: number;
  /** 进度条类型 */
  variant?: ProgressVariant;
  /** 进度条尺寸 */
  size?: ProgressSize;
  /** 是否显示百分比文本 */
  showLabel?: boolean;
  /** 是否显示动画 */
  animated?: boolean;
  /** 动画持续时间（秒） */
  duration?: number;
  /** 颜色主题 */
  color?: string;
  /** 自定义类名 */
  className?: string;
  /** 自定义标签 */
  label?: string;
  /** 是否垂直显示 */
  vertical?: boolean;
}

const EmotionProgress: React.FC<EmotionProgressProps> = ({
  value,
  variant = 'linear',
  size = 'medium',
  showLabel = true,
  animated = true,
  duration = 0.5,
  color = '#3B82F6',
  className = '',
  label,
  vertical = false
}) => {
  // 限制值在 0-100 范围内
  const normalizedValue = Math.min(100, Math.max(0, value));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (animated) {
      // 平滑动画过渡
      let startTime: number;
      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const elapsed = (currentTime - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        
        setDisplayValue(normalizedValue * progress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    } else {
      setDisplayValue(normalizedValue);
    }
  }, [normalizedValue, animated, duration]);

  /**
   * 线性进度条渲染
   */
  const renderLinearProgress = () => {
    const sizeClasses = `${vertical ? 'h-48 w-4' : 'h-4 w-full rounded-full'}`;
    const height = vertical ? '100%' : '100%';
    const width = vertical ? '100%' : `${displayValue}%`;
    
    return (
      <div className={`relative ${sizeClasses} ${className}`}>
        {/* 背景轨道 */}
        <div className={`absolute inset-0 bg-gray-200 rounded-full overflow-hidden ${vertical ? 'h-full w-full' : ''}`}>
          {/* 进度填充 */}
          <motion.div
            className={`absolute ${vertical ? 'bottom-0 w-full' : 'left-0 h-full'}`}
            style={{
              backgroundColor: color,
              width: width,
              height: height
            }}
            initial={{ width: 0, height: 0 }}
            animate={{
              width: vertical ? '100%' : `${displayValue}%`,
              height: vertical ? `${displayValue}%` : '100%'
            }}
            transition={{ duration, ease: 'easeOut' }}
          >
            {/* 光泽动画 */}
            <motion.div
              className={`absolute inset-0 ${vertical ? 'w-full' : 'h-full'}`}
              animate={{
                background: [
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                ]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear'
              }}
            />
          </motion.div>
        </div>

        {/* 百分比标签 */}
        {showLabel && !vertical && (
          <motion.span
            className={`absolute text-sm font-semibold transform -translate-y-full mb-2 ${parseFloat(width) > 10 ? 'text-white' : 'text-gray-700'}`}
            style={{
              left: `${displayValue}%`,
              transform: 'translate(-50%, -100%)'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {label ? label : `${Math.round(displayValue)}%`}
          </motion.span>
        )}
      </div>
    );
  };

  /**
   * 圆形进度条渲染
   */
  const renderCircularProgress = () => {
    const sizeMap = {
      small: { container: 'w-16 h-16', strokeWidth: 4, fontSize: 'text-sm' },
      medium: { container: 'w-24 h-24', strokeWidth: 6, fontSize: 'text-base' },
      large: { container: 'w-32 h-32', strokeWidth: 8, fontSize: 'text-xl' }
    };

    const config = sizeMap[size];
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (displayValue / 100) * circumference;

    return (
      <div className={`relative ${config.container} ${className}`}>
        <svg className="w-full h-full transform -rotate-90">
          {/* 背景圆 */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={config.strokeWidth}
          />
          {/* 进度圆 */}
          <motion.circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration, ease: 'easeOut' }}
            style={{
              strokeDasharray: circumference
            }}
          />
        </svg>

        {/* 中心百分比 */}
        {showLabel && (
          <motion.div
            className={`absolute inset-0 flex items-center justify-center ${config.fontSize} font-bold`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ color }}
          >
            {label ? label : `${Math.round(displayValue)}%`}
          </motion.div>
        )}
      </div>
    );
  };

  /**
   * 分段进度条渲染
   */
  const renderSegmentedProgress = () => {
    const segments = 10;
    const completedSegments = Math.floor(displayValue / 10);

    return (
      <div className={`flex gap-2 ${vertical ? 'flex-col h-48' : 'flex-row w-full items-center'} ${className}`}>
        {Array.from({ length: segments }).map((_, index) => (
          <motion.div
            key={index}
            className={`${vertical ? 'w-4' : 'h-4'} rounded-md transition-colors duration-300`}
            style={{
              backgroundColor: index < completedSegments ? color : '#E5E7EB',
              width: vertical ? '100%' : '10%'
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              backgroundColor: index < completedSegments ? color : '#E5E7EB'
            }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          />
        ))}

        {/* 百分比标签 */}
        {showLabel && (
          <span className={`ml-4 text-lg font-semibold`} style={{ color }}>
            {label ? label : `${Math.round(displayValue)}%`}
          </span>
        )}
      </div>
    );
  };

  return (
    <div>
      {variant === 'linear' && renderLinearProgress()}
      {variant === 'circular' && renderCircularProgress()}
      {variant === 'segmented' && renderSegmentedProgress()}
    </div>
  );
};

export default EmotionProgress;