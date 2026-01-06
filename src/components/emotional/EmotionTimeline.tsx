/**
 * EmotionTimeline - 情感动画系统时间线组件
 * 提供步骤时间线可视化、进度动画和节点交互
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Lock, Clock } from 'lucide-react';

// 步骤状态类型
type StepStatus = 'pending' | 'active' | 'completed' | 'locked';

// 步骤数据接口
interface Step {
  /** 步骤ID */
  id: string;
  /** 步骤标题 */
  title: string;
  /** 步骤描述 */
  description?: string;
  /** 步骤状态 */
  status: StepStatus;
  /** 步骤图标 */
  icon?: React.ReactNode;
  /** 步骤完成时间 */
  completedAt?: Date;
  /** 额外信息 */
  extra?: React.ReactNode;
}

// 时间线属性接口
interface EmotionTimelineProps {
  /** 步骤列表 */
  steps: Step[];
  /** 当前激活步骤索引 */
  activeStep?: number;
  /** 是否显示连接线 */
  showConnector?: boolean;
  /** 方向：水平或垂直 */
  orientation?: 'horizontal' | 'vertical';
  /** 自定义颜色 */
  color?: string;
  /** 点击步骤事件 */
  onStepClick?: (stepId: string, index: number) => void;
  /** 自定义类名 */
  className?: string;
}

const EmotionTimeline: React.FC<EmotionTimelineProps> = ({
  steps,
  activeStep,
  showConnector = true,
  orientation = 'vertical',
  color = '#3B82F6',
  onStepClick,
  className = ''
}) => {
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);

  /**
   * 获取步骤样式配置
   */
  const getStepStatus = (step: Step, index: number): StepStatus => {
    if (activeStep !== undefined) {
      if (index < activeStep) return 'completed';
      if (index === activeStep) return 'active';
      return 'pending';
    }
    return step.status;
  };

  const isClickable = (status: StepStatus) => {
    return status === 'completed' || status === 'active';
  };

  /**
   * 渲染图标
   */
  const renderIcon = (status: StepStatus, icon?: React.ReactNode) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4" />;
      case 'active':
        return <Clock className="w-4 h-4 animate-pulse" />;
      case 'locked':
        return <Lock className="w-4 h-4" />;
      default:
        return icon || <ChevronRight className="w-4 h-4" />;
    }
  };

  /**
   * 渲染水平时间线
   */
  const renderHorizontal = () => {
    return (
      <div className={`flex items-center justify-between gap-4 ${className}`}>
        {steps.map((step, index) => {
          const status = getStepStatus(step, index);
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              {/* 步骤节点 */}
              <div
                className="flex flex-col items-center flex-1 cursor-pointer"
                onClick={() => isClickable(status) && onStepClick?.(step.id, index)}
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                {/* 节点圆圈 */}
                <motion.div
                  className={`
                    relative w-12 h-12 rounded-full flex items-center justify-center
                    border-2 shadow-md transition-colors
                    ${
                      status === 'completed'
                        ? 'bg-green-500 border-green-500 text-white'
                        : status === 'active'
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : status === 'locked'
                        ? 'bg-gray-200 border-gray-300 text-gray-400'
                        : 'bg-white border-gray-300 text-gray-600'
                    }
                  `}
                  whileHover={isClickable(status) ? { scale: 1.1 } : {}}
                  whileTap={isClickable(status) ? { scale: 0.95 } : {}}
                  animate={{
                    boxShadow:
                      status === 'active'
                        ? ['0 0 0 0 rgba(59, 130, 246, 0.7)', '0 0 0 10px rgba(59, 130, 246, 0)']
                        : undefined
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: status === 'active' ? Infinity : 0
                  }}
                >
                  {renderIcon(status, step.icon)}

                  {/* 完成动画标记 */}
                  <AnimatePresence>
                    {status === 'completed' && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
                        >
                          <span className="text-xs">★</span>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* 步骤标题 */}
                <motion.div
                  className="mt-2 text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <p className={`font-medium text-sm ${
                    status === 'active' ? 'text-blue-600' : 
                    status === 'completed' ? 'text-green-600' : 
                    'text-gray-600'
                  }`}>
                    {step.title}
                  </p>
                  {step.description && status !== 'locked' && (
                    <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                  )}
                </motion.div>
              </div>

              {/* 连接线 */}
              {showConnector && !isLast && (
                <motion.div
                  className="flex-1 h-1 bg-gray-200 rounded mx-2 overflow-hidden"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                >
                  <motion.div
                    className="h-full"
                    style={{ backgroundColor: status === 'completed' || status === 'active' ? color : '#E5E7EB' }}
                    initial={{ width: 0 }}
                    animate={{ width: status === 'completed' || status === 'active' ? '100%' : '0%' }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  />
                </motion.div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  /**
   * 渲染垂直时间线
   */
  const renderVertical = () => {
    return (
      <div className={`flex gap-6 ${className}`}>
        {/* 左侧：步骤节点 */}
        <div className="flex flex-col items-center py-2">
          {steps.map((step, index) => {
            const status = getStepStatus(step, index);
            const isLast = index === steps.length - 1;

            return (
              <React.Fragment key={step.id}>
                {/* 节点圆圈 */}
                <motion.button
                  onClick={() => isClickable(status) && onStepClick?.(step.id, index)}
                  disabled={!isClickable(status)}
                  onMouseEnter={() => setHoveredStep(step.id)}
                  onMouseLeave={() => setHoveredStep(null)}
                  className={`
                    relative w-12 h-12 rounded-full flex items-center justify-center
                    border-2 shadow-md transition-colors z-10
                    ${
                      status === 'completed'
                        ? 'bg-green-500 border-green-500 text-white'
                        : status === 'active'
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : status === 'locked'
                        ? 'bg-gray-200 border-gray-300 text-gray-400'
                        : 'bg-white border-gray-300 text-gray-600'
                    }
                    ${isClickable(status) ? 'cursor-pointer' : 'cursor-not-allowed'}
                  `}
                  whileHover={isClickable(status) ? { scale: 1.1 } : {}}
                  whileTap={isClickable(status) ? { scale: 0.95 } : {}}
                  animate={{
                    boxShadow:
                      status === 'active'
                        ? ['0 0 0 0 rgba(59, 130, 246, 0.7)', '0 0 0 10px rgba(59, 130, 246, 0)']
                        : undefined
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: status === 'active' ? Infinity : 0
                  }}
                >
                  {renderIcon(status, step.icon)}

                  {/* 完成动画标记 */}
                  <AnimatePresence>
                    {status === 'completed' && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
                        >
                          <span className="text-xs">★</span>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>

                {/* 连接线 */}
                {showConnector && !isLast && (
                  <div className="flex-1 w-1 bg-gray-200 relative overflow-hidden">
                    <motion.div
                      className="absolute top-0 left-0 w-full"
                      style={{ backgroundColor: status === 'completed' || status === 'active' ? color : '#E5E7EB' }}
                      initial={{ height: 0 }}
                      animate={{ height: status === 'completed' || status === 'active' ? '100%' : '0%' }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* 右侧：步骤内容 */}
        <div className="flex-1 py-2 space-y-6">
          {steps.map((step, index) => {
            const status = getStepStatus(step, index);

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  p-4 rounded-lg border-2 transition-colors
                  ${
                    status === 'completed'
                      ? 'border-green-200 bg-green-50'
                      : status === 'active'
                      ? 'border-blue-300 bg-blue-50'
                      : status === 'locked'
                      ? 'border-gray-200 bg-gray-50'
                      : 'border-gray-200 bg-white'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className={`font-semibold ${
                      status === 'active' ? 'text-blue-600' : 
                      status === 'completed' ? 'text-green-600' : 
                      'text-gray-700'
                    }`}>
                      {step.title}
                    </h3>
                    {step.description && (
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    )}
                    {step.completedAt && status === 'completed' && (
                      <p className="text-xs text-gray-500 mt-2">
                        完成时间: {step.completedAt.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  {step.extra && <div>{step.extra}</div>}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      {orientation === 'horizontal' ? renderHorizontal() : renderVertical()}
    </div>
  );
};

export default EmotionTimeline;