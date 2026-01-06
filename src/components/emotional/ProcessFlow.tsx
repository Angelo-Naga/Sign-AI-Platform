/**
 * ProcessFlow 组件 - 情感化流程展示
 * 用于展示产品使用流程或操作步骤，带有连接线和动画效果
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, CheckCircle, CircleDot } from 'lucide-react';

export interface ProcessStep {
  /** 步骤ID */
  id: string;
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 图标 */
  icon?: LucideIcon;
  /** 是否已完成 */
  completed?: boolean;
  /** 当前步骤状态 */
  status?: 'pending' | 'active' | 'completed';
}

interface ProcessFlowProps {
  /** 流程步骤数组 */
  steps: ProcessStep[];
  /** 当前活动步骤索引 */
  activeStep?: number;
  /** 布局方向 */
  direction?: 'horizontal' | 'vertical';
  /** 是否显示数字标识 */
  showNumbers?: boolean;
  /** 是否显示连接线 */
  showConnectors?: boolean;
  /** 连接线颜色 */
  connectorColor?: string;
  /** 额外类名 */
  className?: string;
  /** 点击步骤回调 */
  onStepClick?: (step: ProcessStep, index: number) => void;
}

/**
 * ProcessFlow 组件
 */
export const ProcessFlow: React.FC<ProcessFlowProps> = ({
  steps,
  activeStep = 0,
  direction = 'horizontal',
  showNumbers = true,
  showConnectors = true,
  connectorColor = 'border-purple-300 dark:border-purple-600',
  className = '',
  onStepClick,
}) => {
  const isVertical = direction === 'vertical';

  return (
    <div className={`w-full ${className}`}>
      <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center ${isVertical ? 'gap-6' : 'gap-4 md:gap-8'}`}>
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          const isCompleted = index < activeStep || (step.completed && isActive);
          const isLast = index === steps.length - 1;
          const StepIcon = step.icon;

          return (
            <React.Fragment key={step.id}>
              {/* 步骤节点 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`flex flex-col ${isVertical ? 'items-start' : 'items-center'} ${isVertical ? 'w-full' : 'flex-1'}`}
              >
                {/* 节点内容 */}
                <div
                  onClick={() => onStepClick?.(step, index)}
                  className={`
                    relative flex items-center ${isVertical ? 'space-x-4 mb-2' : 'flex-col space-y-3'}
                    cursor-pointer transition-transform hover:scale-105
                  `}
                >
                  {/* 步骤标识图标 */}
                  <div className={`
                    relative z-10 w-12 h-12 md:w-14 md:h-14 rounded-full
                    flex items-center justify-center transition-all duration-300
                    ${isActive 
                      ? 'bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg shadow-purple-500/30' 
                      : isCompleted 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/30'
                        : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
                    }
                  `}>
                    {/* 已完成状态图标 */}
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    ) : isActive ? (
                      StepIcon ? (
                        <StepIcon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                      ) : (
                        <CircleDot className="w-6 h-6 md:w-7 md:h-7 text-white" />
                      )
                    ) : showNumbers ? (
                      <span className="text-lg font-bold text-gray-400 dark:text-gray-500">
                        {index + 1}
                      </span>
                    ) : StepIcon ? (
                      <StepIcon className="w-6 h-6 md:w-7 md:h-7 text-gray-400 dark:text-gray-500" />
                    ) : null}
                  </div>

                  {/* 活动脉冲效果 */}
                  {isActive && (
                    <motion.div
                      className={`absolute inset-0 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 -z-10`}
                      animate={{
                        scale: [1.2, 1.5, 1.2],
                        opacity: [0.5, 0.2, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      style={{ width: '80px', height: '80px', marginLeft: isVertical ? '-8px' : '-14px', marginTop: isVertical ? '-8px' : '-14px' }}
                    />
                  )}

                  {/* 步骤信息 */}
                  <div className={`flex flex-col ${isVertical ? 'flex-1' : 'items-center text-center'}`}>
                    <h3 className={`
                      font-semibold mb-1 transition-colors
                      ${isActive 
                        ? 'text-purple-600 dark:text-purple-400' 
                        : isCompleted
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-900 dark:text-gray-100'
                      }
                    `}>
                      {step.title}
                    </h3>
                    <p className={`
                      text-sm transition-opacity
                      ${isActive ? 'opacity-100' : 'opacity-70'}
                    `} style={{ 
                      maxWidth: isVertical ? 'auto' : '200px',
                      color: 'var(--color-text-secondary, #4b5563)'
                    }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* 连接线 */}
              {showConnectors && !isLast && (
                <div 
                  className={`
                    ${isVertical ? 'w-0.5 h-6 ml-6' : 'flex-1 h-0.5'}
                    border-t-2 ${isVertical ? 'border-l-2' : 'border-t-2'} 
                    ${connectorColor} 
                    ${isCompleted ? 'border-green-400 dark:border-green-500' : ''}
                  `}
                  style={{
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {isCompleted && (
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-r from-transparent via-green-300 to-transparent dark:via-green-600`}
                      animate={{
                        x: ['-100%', '200%'],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      style={{
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                      }}
                    />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 精简版流程步骤组件（用于单个步骤展示）
 */
interface SimpleStepProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  number?: number;
  isActive?: boolean;
  isCompleted?: boolean;
  className?: string;
}

export const SimpleStep: React.FC<SimpleStepProps> = ({
  title,
  description,
  icon: Icon,
  number,
  isActive = false,
  isCompleted = false,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`
        flex items-start space-x-4 p-6 rounded-2xl
        ${isActive 
          ? 'bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-600'
          : isCompleted
            ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-600'
            : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
        }
        transition-all duration-300
        ${className}
      `}
    >
      {/* 步骤图标/数字 */}
      <div className={`
        w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
        ${isActive 
          ? 'bg-gradient-to-br from-purple-600 to-pink-600'
          : isCompleted
            ? 'bg-gradient-to-br from-green-500 to-emerald-500'
            : 'bg-gray-100 dark:bg-gray-700'
        }
      `}>
        {isCompleted ? (
          <CheckCircle className="w-6 h-6 text-white" />
        ) : Icon ? (
          <Icon className="w-6 h-6 text-white" />
        ) : (
          <span className="text-lg font-bold text-gray-400 dark:text-gray-300">
            {number}
          </span>
        )}
      </div>

      {/* 步骤内容 */}
      <div className="flex-1">
        <h3 className={`
          text-lg font-semibold mb-1
          ${isActive 
            ? 'text-purple-600 dark:text-purple-400' 
            : isCompleted
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-900 dark:text-gray-100'
          }
        `}>
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
};

export default ProcessFlow;