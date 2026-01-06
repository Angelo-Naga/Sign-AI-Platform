/**
 * EmotionToast - 情感化提示组件
 * 提供优雅的通知提示和动画反馈
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// 提示类型
type ToastType = 'success' | 'error' | 'warning' | 'info';

// 提示位置类型
type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

// 提示项接口
interface ToastItem {
  /** 唯一标识 */
  id: string;
  /** 提示类型 */
  type: ToastType;
  /** 提示标题 */
  title?: string;
  /** 提示内容 */
  message: string;
  /** 显示时长（毫秒） */
  duration?: number;
}

// 提示容器属性接口
interface EmotionToastProps {
  /** 提示列表 */
  toasts: ToastItem[];
  /** 移除提示 */
  onRemove: (id: string) => void;
  /** 提示位置 */
  position?: ToastPosition;
  /** 最大显示数量 */
  maxToasts?: number;
}

/**
 * 提示类型配置映射
 */
const toastConfigs: Record<ToastType, { icon: React.ReactNode; colors: string; bgColor: string }> = {
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    colors: 'text-green-600 border-green-200',
    bgColor: 'bg-green-50'
  },
  error: {
    icon: <XCircle className="w-5 h-5" />,
    colors: 'text-red-600 border-red-200',
    bgColor: 'bg-red-50'
  },
  warning: {
    icon: <AlertCircle className="w-5 h-5" />,
    colors: 'text-yellow-600 border-yellow-200',
    bgColor: 'bg-yellow-50'
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    colors: 'text-blue-600 border-blue-200',
    bgColor: 'bg-blue-50'
  }
};

/**
 * 提示位置样式映射
 */
const positionClasses: Record<ToastPosition, string> = {
  'top-left': 'fixed top-4 left-4 flex flex-col items-start gap-2',
  'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2',
  'top-right': 'fixed top-4 right-4 flex flex-col items-end gap-2',
  'bottom-left': 'fixed bottom-4 left-4 flex flex-col items-start gap-2',
  'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2',
  'bottom-right': 'fixed bottom-4 right-4 flex flex-col items-end gap-2'
};

const EmotionToast: React.FC<EmotionToastProps> = ({
  toasts,
  onRemove,
  position = 'top-right',
  maxToasts = 5
}) => {
  const config = toastConfigs;

  /**
   * 提示项组件
   */
  const ToastItem: React.FC<{ toast: ToastItem }> = ({ toast }) => {
    const toastConfig = config[toast.type];

    return (
      <motion.div
        className={`
          relative min-w-[300px] max-w-md p-4 rounded-lg border-2 shadow-lg
          ${toastConfig.bgColor} ${toastConfig.colors}
          flex items-start gap-3
        `}
        initial={{ opacity: 0, x: position.includes('right') ? 50 : position.includes('left') ? -50 : 0, y: -50 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0, x: position.includes('right') ? 50 : position.includes('left') ? -50 : 0, scale: 0.9 }}
        whileHover={{ scale: 1.02 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 25
        }}
      >
        {/* 图标 */}
        <motion.div
          className={`flex-shrink-0 ${toastConfig.colors}`}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring' }}
        >
          {toastConfig.icon}
        </motion.div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <motion.h4
              className="font-semibold mb-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {toast.title}
            </motion.h4>
          )}
          <motion.p
            className="text-sm text-gray-700"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {toast.message}
          </motion.p>
        </div>

        {/* 关闭按钮 */}
        <motion.button
          onClick={() => onRemove(toast.id)}
          className="p-1 rounded hover:bg-black/5 transition-colors"
          whileHover={{ rotate: 90, scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X className="w-4 h-4 text-gray-500" />
        </motion.button>

        {/* 进度条 */}
        <motion.div
          className={`absolute bottom-0 left-0 h-1 ${toastConfig.colors}`}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{
            duration: (toast.duration || 5000) / 1000,
            ease: 'linear'
          }}
        />
      </motion.div>
    );
  };

  return (
    <div className={positionClasses[position]} style={{ zIndex: 9999 }}>
      <AnimatePresence mode="popLayout">
        {toasts.slice(0, maxToasts).map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default EmotionToast;