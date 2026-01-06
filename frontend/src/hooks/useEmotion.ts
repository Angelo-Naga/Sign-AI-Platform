/**
 * useEmotion - 情感化Hook
 * 提供情感状态管理、情感动画触发和用户反馈收集功能
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

/**
 * 情感状态类型
 */
export type EmotionType = 'neutral' | 'happy' | 'sad' | 'excited' | 'calm' | 'focused' | 'confused';

/**
 * 反馈类型
 */
export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

/**
 * 提示项接口
 */
export interface ToastItem {
  id: string;
  type: FeedbackType;
  title?: string;
  message: string;
  duration?: number;
}

/**
 * useEmotion Hook返回值
 */
interface UseEmotionReturn {
  // 情感状态
  emotion: EmotionType;
  setEmotion: (emotion: EmotionType) => void;

  // 提示系统
  toasts: ToastItem[];
  showToast: (type: FeedbackType, message: string, title?: string) => void;
  removeToast: (id: string) => void;

  // 庆祝效果
  triggerCelebration: () => void;
  triggerConfetti: () => void;
  triggerSuccess: () => void;
  triggerError: () => void;

  // 交互反馈
  handleClickReaction: () => void;
  handleSuccessReaction: () => void;
  handleErrorReaction: () => void;

  // 用户反馈收集
  collectFeedback: (rating: number, comment?: string) => void;

  // 动画触发
  triggerPulse: () => void;
  triggerShake: () => void;
  triggerBounce: () => void;

  // 清理
  clearToasts: () => void;
  resetEmotion: () => void;
}

/**
 * useEmotion Hook
 * 管理情感化UI状态和交互反馈
 */
export const useEmotion = (): UseEmotionReturn => {
  // 情感状态
  const [emotion, setEmotionState] = useState<EmotionType>('neutral');

  // 提示列表
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // 用于生成唯一ID
  const toastIdRef = useRef(0);

  /**
   * 设置情感状态
   */
  const setEmotion = useCallback((newEmotion: EmotionType) => {
    setEmotionState(newEmotion);

    // 根据情感类型触发不同的视觉反馈（可选扩展）
    switch (newEmotion) {
      case 'excited':
        triggerConfetti();
        break;
      case 'happy':
        triggerHappyAnimation();
        break;
      default:
        break;
    }
  }, []);

  /**
   * 显示提示
   */
  const showToast = useCallback((type: FeedbackType, message: string, title?: string, duration = 3000) => {
    const id = `toast-${toastIdRef.current++}`;
    const newToast: ToastItem = { id, type, title, message, duration };

    setToasts((prev) => [...prev, newToast]);

    // 自动移除提示
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  /**
   * 移除提示
   */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * 触发庆祝效果（彩带）
   */
  const triggerCelebration = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FF6B6B', '#FECA57', '#48DBFB', '#FF9FF3', '#54A0FF']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FF6B6B', '#FECA57', '#48DBFB', '#FF9FF3', '#54A0FF']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
    showToast('success', '🎉 恭喜！');
  }, [showToast]);

  /**
   * 触发彩带效果
   */
  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF6B6B', '#FECA57', '#48DBFB', '#FF9FF3', '#54A0FF']
    });
  }, []);

  /**
   * 触发成功反馈
   */
  const triggerSuccess = useCallback(() => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#10B981', '#3B82F6', '#F59E0B']
    });
    showToast('success', '操作成功完成！', '成功');
  }, [showToast]);

  /**
   * 触发错误反馈
   */
  const triggerError = useCallback(() => {
    setEmotionState('confused');
    showToast('error', '操作失败，请重试', '错误');
  }, [showToast]);

  /**
   * 处理点击交互反馈
   */
  const handleClickReaction = useCallback(() => {
    // 可以添加触觉反馈（在支持的设备上）
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  /**
   * 处理成功交互反馈
   */
  const handleSuccessReaction = useCallback(() => {
    setEmotionState('happy');
    triggerConfetti();
    if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }
  }, [triggerConfetti]);

  /**
   * 处理错误交互反馈
   */
  const handleErrorReaction = useCallback(() => {
    setEmotionState('confused');
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
  }, []);

  /**
   * 收集用户反馈
   */
  const collectFeedback = useCallback((rating: number, comment?: string) => {
    console.log('用户反馈收集:', { rating, comment });

    // 根据评分调整情感状态
    if (rating >= 4) {
      setEmotionState('happy');
      showToast('success', '感谢您的反馈！', '反馈已提交');
    } else if (rating >= 3) {
      setEmotionState('neutral');
      showToast('info', '感谢您的反馈！', '反馈已提交');
    } else {
      setEmotionState('sad');
      showToast('warning', '感谢您的反馈，我们会继续改进', '反馈已提交');
    }

    // 这里可以添加实际的数据发送逻辑
    // 例如：发送到后端API
  }, [showToast]);

  /**
   * 触发脉冲动画
   */
  const triggerPulse = useCallback(() => {
    document.body.classList.add('emotion-pulse');
    setTimeout(() => {
      document.body.classList.remove('emotion-pulse');
    }, 1000);
  }, []);

  /**
   * 触发抖动动画
   */
  const triggerShake = useCallback(() => {
    document.body.classList.add('emotion-shake');
    setTimeout(() => {
      document.body.classList.remove('emotion-shake');
    }, 500);
  }, []);

  /**
   * 触发弹跳动画
   */
  const triggerBounce = useCallback(() => {
    document.body.classList.add('emotion-bounce');
    setTimeout(() => {
      document.body.classList.remove('emotion-bounce');
    }, 600);
  }, []);

  /**
   * 快乐动画效果
   */
  const triggerHappyAnimation = useCallback(() => {
    // 可以扩展其他动画效果
    triggerConfetti();
  }, [triggerConfetti]);

  /**
   * 清除所有提示
   */
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  /**
   * 重置情感状态
   */
  const resetEmotion = useCallback(() => {
    setEmotionState('neutral');
  }, []);

  /**
   * 清理未完成的提示
   */
  useEffect(() => {
    return () => {
      clearToasts();
    };
  }, [clearToasts]);

  return {
    emotion,
    setEmotion,
    toasts,
    showToast,
    removeToast,
    triggerCelebration,
    triggerConfetti,
    triggerSuccess,
    triggerError,
    handleClickReaction,
    handleSuccessReaction,
    handleErrorReaction,
    collectFeedback,
    triggerPulse,
    triggerShake,
    triggerBounce,
    clearToasts,
    resetEmotion
  };
};

export default useEmotion;