/**
 * FeedbackComponents - 情感反馈组件
 * 提供成功/失败动画、庆祝效果（彩带、粒子）、手势反馈动画
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CheckCircle, XCircle, ThumbsUp, Heart, Star, Zap } from 'lucide-react';

// 反馈类型
type FeedbackType = 'success' | 'error' | 'celebration' | 'gesture' | 'loading';

// 手势类型
type GestureType = 'thumbs-up' | 'heart' | 'star' | 'zap';

// 情感反馈组件接口
interface EmotionFeedbackProps {
  /** 反馈类型 */
  type: FeedbackType;
  /** 是否显示 */
  visible: boolean;
  /** 标题 */
  title?: string;
  /** 描述 */
  message?: string;
  /** 自动隐藏延迟（毫秒） */
  autoHideDelay?: number;
  /** 隐藏回调 */
  onHide?: () => void;
  /** 手势类型（当 type='gesture' 时） */
  gestureType?: GestureType;
  /** 自定义样式 */
  className?: string;
}

/**
 * 粒子效果组件
 */
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
}

const ParticleEffect: React.FC<{ count?: number }> = ({ count = 30 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 创建粒子
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
    particles.current = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: canvas.width / 2,
      y: canvas.height / 2,
      size: Math.random() * 10 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10
    }));

    // 动画循环
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.2; // 重力
        particle.size *= 0.98; // 逐渐变小

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.size / 10;
        ctx.fill();
      });

      // 移过小的粒子
      particles.current = particles.current.filter((p) => p.size > 0.5);

      if (particles.current.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      width={window.innerWidth}
      height={window.innerHeight}
    />
  );
};

/**
 * 成功/失败反馈组件
 */
const SuccessErrorFeedback: React.FC<{
  type: 'success' | 'error';
  title?: string;
  message?: string;
  onComplete?: () => void;
}> = ({ type, title, message, onComplete }) => {
  const controls = useAnimation();

  useEffect(() => {
    // 播放动画
    controls.start({
      scale: [0, 1.2, 1],
      rotate: type === 'success' ? [0, 360] : [0, -15, 15, 0],
      opacity: [0, 1, 1],
      transition: { duration: 0.8 }
    });

    // 成功时触发彩带
    if (type === 'success') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
      });

      // 延迟触发第二轮彩带
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 100,
          origin: { y: 0.7 }
        });
      }, 500);
    }

    // 延迟完成
    const timer = setTimeout(() => {
      onComplete?.();
    }, 2500);

    return () => clearTimeout(timer);
  }, [type, controls, onComplete]);

  const isSuccess = type === 'success';

  return (
    <motion.div
      animate={controls}
      className="relative flex flex-col items-center justify-center p-8 rounded-2xl bg-white shadow-2xl"
    >
      <motion.div
        className={`w-24 h-24 rounded-full flex items-center justify-center ${
          isSuccess ? 'bg-green-100' : 'bg-red-100'
        }`}
      >
        {isSuccess ? (
          <CheckCircle className="w-16 h-16 text-green-500" />
        ) : (
          <XCircle className="w-16 h-16 text-red-500" />
        )}
      </motion.div>

      {title && (
        <motion.h2
          className={`mt-6 text-2xl font-bold ${isSuccess ? 'text-green-600' : 'text-red-600'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {title}
        </motion.h2>
      )}

      {message && (
        <motion.p
          className="mt-2 text-gray-600 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {message}
        </motion.p>
      )}

      {/* 装饰性光晕 */}
      <motion.div
        className={`absolute inset-0 rounded-2xl opacity-0 ${
          isSuccess ? 'bg-green-400' : 'bg-red-400'
        } blur-3xl`}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ duration: 2, repeat: 1 }}
      />
    </motion.div>
  );
};

/**
 * 庆祝效果组件
 */
const CelebrationFeedback: React.FC<{
  title?: string;
  message?: string;
  onComplete?: () => void;
}> = ({ title, message, onComplete }) => {
  const [showParticles, setShowParticles] = useState(true);
  const controls = useAnimation();

  useEffect(() => {
    // 触发大规模彩带效果
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();

    // 播放动画
    controls.start({
      scale: [0, 1.3, 1],
      opacity: [0, 1, 1],
      transition: { duration: 0.8 }
    });

    // 延迟完成
    const timer = setTimeout(() => {
      setShowParticles(false);
      onComplete?.();
    }, 4000);

    return () => clearTimeout(timer);
  }, [controls, onComplete]);

  return (
    <motion.div
      animate={controls}
      className="relative flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-br from-yellow-100 via-orange-100 to-red-100 shadow-2xl"
    >
      {/* 粒子效果 */}
      <AnimatePresence>{showParticles && <ParticleEffect count={50} />}</AnimatePresence>

      {/* 奖杯图标 */}
      <motion.div
        className="mb-6"
        animate={{
          rotate: [-10, 10, -10],
          y: [0, -10, 0]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        <Star className="w-20 h-20 text-yellow-500" fill="currentColor" />
      </motion.div>

      {title && (
        <motion.h2
          className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {title}
        </motion.h2>
      )}

      {message && (
        <motion.p
          className="mt-2 text-gray-700 text-center text-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {message}
        </motion.p>
      )}

      {/* 光泽效果 */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-20 bg-gradient-to-r from-transparent via-white to-transparent"
        animate={{
          x: ['-100%', '200%']
        }}
        transition={{
          duration: 2,
          repeat: Infinity
        }}
      />
    </motion.div>
  );
};

/**
 * 手势反馈组件
 */
const GestureFeedback: React.FC<{
  gestureType: GestureType;
  title?: string;
  message?: string;
  onComplete?: () => void;
}> = ({ gestureType, title, message, onComplete }) => {
  const controls = useAnimation();

  // 手势图标映射
  const gestures: Record<GestureType, { icon: React.ReactNode; color: string }> = {
    'thumbs-up': { icon: <ThumbsUp className="w-16 h-16" />, color: 'text-blue-500' },
    heart: { icon: <Heart className="w-16 h-16" />, color: 'text-red-500' },
    star: { icon: <Star className="w-16 h-16" />, color: 'text-yellow-500' },
    zap: { icon: <Zap className="w-16 h-16" />, color: 'text-purple-500' }
  };

  const gesture = gestures[gestureType];

  useEffect(() => {
    // 播放手势动画
    controls.start({
      scale: [0, 1.2, 1, 1.2, 1],
      rotate: [0, 360],
      transition: { duration: 1, repeat: 2 }
    });

    // 延迟完成
    const timer = setTimeout(() => {
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [gestureType, controls, onComplete]);

  return (
    <motion.div
      animate={controls}
      className="relative flex flex-col items-center justify-center p-8 rounded-2xl bg-white shadow-2xl"
    >
      <motion.div
        className={`mb-6 ${gesture.color}`}
        animate={{
          scale: [1, 1.3, 1],
          rotate: [0, 360]
        }}
        transition={{
          duration: 0.8,
          repeat: 2,
          ease: 'easeInOut'
        }}
      >
        {gesture.icon}
      </motion.div>

      {title && (
        <motion.h2
          className="text-2xl font-bold text-gray-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {title}
        </motion.h2>
      )}

      {message && (
        <motion.p
          className="mt-2 text-gray-600 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );
};

/**
 * 主情感反馈组件
 */
const EmotionFeedback: React.FC<EmotionFeedbackProps> = ({
  type,
  visible,
  title,
  message,
  autoHideDelay = 3000,
  onHide,
  gestureType = 'thumbs-up',
  className = ''
}) => {
  if (!visible) return null;

  const handleComplete = () => {
    onHide?.();
  };

  switch (type) {
    case 'success':
      return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}>
          <SuccessErrorFeedback type="success" title={title} message={message} onComplete={handleComplete} />
        </div>
      );

    case 'error':
      return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}>
          <SuccessErrorFeedback type="error" title={title} message={message} onComplete={handleComplete} />
        </div>
      );

    case 'celebration':
      return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}>
          <CelebrationFeedback title={title} message={message} onComplete={handleComplete} />
        </div>
      );

    case 'gesture':
      return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}>
          <GestureFeedback gestureType={gestureType} title={title} message={message} onComplete={handleComplete} />
        </div>
      );

    default:
      return null;
  }
};

/**
 * 快速触发庆祝效果的 Hook 友好函数
 */
export const triggerConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
  });
};

/**
 * 快速触发成功反馈
 */
export const showSuccessFeedback = (title?: string, message?: string) => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#10B981', '#3B82F6', '#F59E0B']
  });

  return { type: 'success' as const, title, message };
};

/**
 * 快速触发庆祝反馈
 */
export const showCelebrationFeedback = (title?: string, message?: string) => {
  const duration = 5000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();

  return { type: 'celebration' as const, title, message };
};

export default EmotionFeedback;