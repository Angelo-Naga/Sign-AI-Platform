/**
 * EmotionModal - 情感化模态框组件
 * 提供优雅的进入/退出动画和交互反馈
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// 模态框尺寸类型
type ModalSize = 'small' | 'medium' | 'large' | 'full';

// 模态框属性接口
interface EmotionModalProps {
  /** 是否显示模态框 */
  isOpen: boolean;
  /** 关闭事件 */
  onClose: () => void;
  /** 模态框标题 */
  title?: string;
  /** 模态框内容 */
  children: React.ReactNode;
  /** 模态框尺寸 */
  size?: ModalSize;
  /** 是否显示右上角关闭按钮 */
  showCloseButton?: boolean;
  /** 是否点击遮罩关闭 */
  closeOnOverlayClick?: boolean;
  /** 是否按ESC关闭 */
  closeOnEsc?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 底部操作区 */
  footer?: React.ReactNode;
  /** 顶部图标 */
  icon?: React.ReactNode;
  /** 是否禁止滚动 */
  preventScroll?: boolean;
}

const EmotionModal: React.FC<EmotionModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  className = '',
  footer,
  icon,
  preventScroll = true
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  /**
   * 模态框尺寸配置
   */
  const sizeClasses: Record<ModalSize, string> = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    full: 'max-w-6xl'
  };

  /**
   * 处理ESC键关闭
   */
  useEffect(() => {
    if (!closeOnEsc) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, closeOnEsc]);

  /**
   * 处理页面滚动
   */
  useEffect(() => {
    if (preventScroll && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, preventScroll]);

  /**
   * 处理遮罩点击
   */
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩 */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleOverlayClick}
          >
            {/* 模态框 */}
            <motion.div
              ref={modalRef}
              className={`
                relative bg-white rounded-2xl shadow-2xl overflow-hidden
                ${sizeClasses[size]} w-full max-h-[90vh] flex flex-col
                ${className}
              `}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 300
              }}
            >
              {/* 模态框头部 */}
              {(title || icon || showCloseButton) && (
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    {icon && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                      >
                        {icon}
                      </motion.div>
                    )}
                    {title && (
                      <motion.h2
                        className="text-xl font-semibold text-gray-900"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        {title}
                      </motion.h2>
                    )}
                  </div>
                  {showCloseButton && (
                    <motion.button
                      onClick={onClose}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                      whileHover={{ rotate: 90, scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </motion.button>
                  )}
                </div>
              )}

              {/* 模态框内容 */}
              <div className="flex-1 p-6 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.2 }}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* 模态框底部 */}
              {footer && (
                <motion.div
                  className="p-6 border-t border-gray-200 bg-gray-50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {footer}
                </motion.div>
              )}

              {/* 装饰性光效 */}
              <motion.div
                className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-10 blur-3xl pointer-events-none"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.15, 0.1]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EmotionModal;