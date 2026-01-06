/**
 * StepWizard 组件 - 情感化向导流程
 * 用于多步骤表单或设置向导，带有进度指示和导航
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2, Plus } from 'lucide-react';

export interface WizardStep {
  /** 步骤ID */
  id: string;
  /** 步骤标题 */
  title: string;
  /** 步骤描述 */
  description?: string;
  /** 步骤图标 */
  icon?: React.ReactNode;
  /** 步骤内容 */
  content: React.ReactNode;
  /** 是否可选 */
  optional?: boolean;
  /** 验证函数 */
  validate?: () => boolean | Promise<boolean>;
  /** 步骤完成回调 */
  onEnter?: () => void | Promise<void>;
  /** 步骤离开回调 */
  onLeave?: () => void | Promise<void>;
}

interface StepWizardProps {
  /** 向导步骤 */
  steps: WizardStep[];
  /** 完成回调 */
  onComplete?: (data: any) => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void;
  /** 是否显示步骤导航 */
  showSteps?: boolean;
  /** 是否可跳过步骤 */
  allowSkip?: boolean;
  /** 主标题 */
  title?: string;
  /** 额外类名 */
  className?: string;
  /** 初始步骤索引 */
  initialStep?: number;
}

/**
 * StepWizard 组件
 */
export const StepWizard: React.FC<StepWizardProps> = ({
  steps,
  onComplete,
  onCancel,
  showSteps = true,
  allowSkip = false,
  title,
  className = '',
  initialStep = 0,
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [isValid, setIsValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // 导航到特定步骤
  const goToStep = async (index: number) => {
    if (index === currentStep) return;
    
    // 执行离开当前步骤的回调
    if (currentStepData.onLeave) {
      await currentStepData.onLeave();
    }

    setCurrentStep(index);
  };

  // 下一步
  const handleNext = async () => {
    // 验证当前步骤
    if (currentStepData.validate) {
      setIsLoading(true);
      const valid = await currentStepData.validate();
      setIsValid(valid);
      setIsLoading(false);
      
      if (!valid) return;
    }

    if (isLastStep) {
      // 完成向导
      if (onComplete) {
        setIsLoading(true);
        await onComplete(stepData);
        setIsLoading(false);
      }
    } else {
      // 进入下一步
      const nextStepData = steps[currentStep + 1];
      if (nextStepData.onEnter) {
        await nextStepData.onEnter();
      }
      setCurrentStep(currentStep + 1);
    }
  };

  // 上一步
  const handlePrevious = async () => {
    if (isFirstStep) return;
    
    if (currentStepData.onLeave) {
      await currentStepData.onLeave();
    }
    
    setCurrentStep(currentStep - 1);
  };

  // 跳过步骤
  const handleSkip = async () => {
    if (!allowSkip || isLastStep) return;
    
    const nextStepData = steps[currentStep + 1];
    if (nextStepData.onEnter) {
      await nextStepData.onEnter();
    }
    
    setCurrentStep(currentStep + 1);
  };

  // 更新步骤数据
  const updateStepData = (data: Record<string, any>) => {
    setStepData((prev) => ({
      ...prev,
      [currentStep]: {
        ...prev[currentStep],
        ...data,
      },
    }));
  };

  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
      {/* 主标题 */}
      {title && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 md:mb-12"
        >
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 md:mb-3">
            {title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            步骤 {currentStep + 1} / {steps.length}
          </p>
        </motion.div>
      )}

      {/* 步骤导航 */}
      {showSteps && (
        <div className="mb-8 md:mb-12">
          <div className="relative">
            {/* 进度条背景 */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 -translate-y-1/2" />
            
            {/* 进度条填充 */}
            <motion.div
              className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-purple-600 to-pink-600 -translate-y-1/2 transition-all duration-300"
              initial={{ width: '0%' }}
              animate={{
                width: `${((currentStep + 1) / steps.length) * 100}%`,
              }}
            />
            
            {/* 步骤节点 */}
            <div className="flex justify-between relative">
              {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isActive = index === currentStep;
                
                return (
                  <div
                    key={step.id}
                    onClick={() => (isCompleted || allowSkip) && goToStep(index)}
                    className={`
                      relative z-10 flex flex-col items-center space-y-2 cursor-pointer
                      transition-transform hover:scale-110
                    `}
                  >
                    {/* 步骤圆圈 */}
                    <motion.div
                      className={`
                        w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center
                        transition-all duration-300
                        ${isActive
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg shadow-purple-500/30'
                          : isCompleted
                            ? 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/30'
                            : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600'
                        }
                      `}
                      initial={false}
                      animate={{
                        scale: isActive ? 1.1 : 1,
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      ) : (
                        <span className={`
                          text-sm font-semibold
                          ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}
                        `}>
                          {index + 1}
                        </span>
                      )}
                    </motion.div>

                    {/* 步骤标题 */}
                    <span className={`
                      text-xs md:text-sm font-medium text-center max-w-[80px]
                      ${isActive
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-gray-500 dark:text-gray-400'
                      }
                    `}>
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 步骤内容 */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-[400px]"
          >
            {/* 当前步骤标题 */}
            <div className="mb-6 md:mb-8">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {currentStepData.title}
              </h3>
              {currentStepData.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                  {currentStepData.description}
                </p>
              )}
            </div>

            {/* 步骤内容 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              {currentStepData.content}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 导航按钮 */}
      <div className="flex items-center justify-between mt-8 md:mt-12">
        <div className="flex space-x-3 md:space-x-4">
          {/* 取消按钮 */}
          {onCancel && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCancel}
              className="px-6 py-2 md:px-8 md:py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
            >
              取消
            </motion.button>
          )}

          {/* 上一步按钮 */}
          {!isFirstStep && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePrevious}
              className="flex items-center space-x-2 px-6 py-2 md:px-8 md:py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>上一步</span>
            </motion.button>
          )}
        </div>

        <div className="flex space-x-3 md:space-x-4">
          {/* 跳过按钮 */}
          {allowSkip && currentStepData.optional && !isLastStep && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSkip}
              className="flex items-center space-x-2 px-6 py-2 md:px-8 md:py-3 text-purple-600 dark:text-purple-400 font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>跳过</span>
            </motion.button>
          )}

          {/* 下一步/完成按钮 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            disabled={isLoading || !isValid}
            className={`
              flex items-center space-x-2 px-6 py-2 md:px-8 md:py-3
              bg-gradient-to-r from-purple-600 to-pink-600
              text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <span>{isLastStep ? '完成' : '下一步'}</span>
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default StepWizard;