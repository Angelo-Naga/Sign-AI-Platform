/**
 * EmotionLoader - 情感化加载动画组件
 * 提供多种优雅的加载动画效果
 */

import React from 'react';
import { motion } from 'framer-motion';

// 加载器类型
type LoaderType = 'pulse' | 'dots' | 'spinner' | 'bars' | 'ripple' | 'bouncing-ball';

// 加载器尺寸
type LoaderSize = 'small' | 'medium' | 'large';

// 加载器属性接口
interface EmotionLoaderProps {
  /** 加载器类型 */
  type?: LoaderType;
  /** 加载器尺寸 */
  size?: LoaderSize;
  /** 加载文本 */
  text?: string;
  /** 自定义颜色 */
  color?: string;
  /** 是否全屏显示 */
  fullScreen?: boolean;
  /** 自定义类名 */
  className?: string;
}

const EmotionLoader: React.FC<EmotionLoaderProps> = ({
  type = 'dots',
  size = 'medium',
  text,
  color = '#3B82F6',
  fullScreen = false,
  className = ''
}) => {
  /**
   * 加载器尺寸配置映射
   */
  const sizeConfig: Record<LoaderSize, { scale: number; textSize: string }> = {
    small: { scale: 1, textSize: 'text-sm' },
    medium: { scale: 1.5, textSize: 'text-base' },
    large: { scale: 2, textSize: 'text-lg' }
  };

  const config = sizeConfig[size];

  /**
   * 脉冲加载器
   */
  const PulseLoader = () => (
    <div className="relative" style={{ transform: `scale(${config.scale})` }}>
      <motion.div
        className="w-12 h-12 rounded-full"
        style={{ backgroundColor: color }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [1, 0.5, 1]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
    </div>
  );

  /**
   * 圆点加载器
   */
  const DotsLoader = () => (
    <div className="flex gap-2" style={{ transform: `scale(${config.scale})` }}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: color }}
          animate={{
            y: [0, -10, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.1,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );

  /**
   * 旋转加载器
   */
  const SpinnerLoader = () => (
    <div className="relative" style={{ transform: `scale(${config.scale})` }}>
      <motion.div
        className="w-12 h-12"
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear'
        }}
      >
        <svg className="w-full h-full" viewBox="0 0 50 50">
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            strokeWidth="4"
            style={{ stroke: color, opacity: 0.2 }}
          />
          <path
            d="M25 5 A20 20 0 0 1 45 25"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            style={{ stroke: color }}
          />
        </svg>
      </motion.div>
    </div>
  );

  /**
   * 条形加载器
   */
  const BarsLoader = () => (
    <div className="flex gap-1 items-end h-12" style={{ transform: `scale(${config.scale})` }}>
      {[0, 1, 2, 3, 4].map((index) => (
        <motion.div
          key={index}
          className="w-2 rounded-t"
          style={{ backgroundColor: color }}
          animate={{
            height: [10, 30, 10]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: index * 0.1,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );

  /**
   * 涟漪加载器
   */
  const RippleLoader = () => (
    <div className="relative" style={{ transform: `scale(${config.scale})` }}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="absolute w-12 h-12 rounded-full border-4"
          style={{ borderColor: color }}
          animate={{
            scale: [0, 2],
            opacity: [1, 0]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.3,
            ease: 'easeOut'
          }}
        />
      ))}
    </div>
  );

  /**
   * 弹球加载器
   */
  const BouncingBallLoader = () => (
    <div className="relative w-full" style={{ transform: `scale(${config.scale})` }}>
      <svg className="w-24 h-12" viewBox="0 0 100 50">
        <path
          d="M10 40 Q27.5 40 27.5 25 T45 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-gray-300"
        />
        <motion.circle
          cx={27.5}
          cy={25}
          r={5}
          fill={color}
          animate={{
            cx: [27.5, 72.5],
            cy: [25, 25]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.5, 1]
          }}
        />
        <motion.path
          d="M45 10 Q62.5 25 62.5 40 T80 25"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-gray-300"
          animate={{
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity
          }}
        />
      </svg>
    </div>
  );

  /**
   * 根据类型渲染加载器
   */
  const renderLoader = () => {
    switch (type) {
      case 'pulse':
        return <PulseLoader />;
      case 'dots':
        return <DotsLoader />;
      case 'spinner':
        return <SpinnerLoader />;
      case 'bars':
        return <BarsLoader />;
      case 'ripple':
        return <RippleLoader />;
      case 'bouncing-ball':
        return <BouncingBallLoader />;
      default:
        return <DotsLoader />;
    }
  };

  const content = (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {renderLoader()}
      {text && (
        <motion.p
          className={config.textSize}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          style={{ color }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};

export default EmotionLoader;