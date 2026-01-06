/**
 * FeatureCard 组件 - 情感化功能卡片
 * 用于展示产品功能和特性，带有优雅的悬停动画效果
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  /** 卡片ID */
  id: string;
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 图标组件 */
  icon: LucideIcon;
  /** 渐变类名 */
  gradient?: string;
  /** 背景类名 */
  bgColor?: string;
  /** 链接路径 */
  path?: string;
  /** 点击回调 */
  onClick?: () => void;
  /** 链接文字 */
  linkText?: string;
  /** 是否显示更多 */
  showMore?: boolean;
  /** 悬停时的边框颜色 */
  hoverBorderColor?: string;
  /** 额外类名 */
  className?: string;
  /** 动画延迟 */
  delay?: number;
  /** 视图内触发 */
  whileInView?: boolean;
}

/**
 * FeatureCard 组件
 */
export const FeatureCard: React.FC<FeatureCardProps> = ({
  id,
  title,
  description,
  icon: Icon,
  gradient = 'from-purple-500 to-pink-500',
  bgColor = 'bg-purple-50 dark:bg-purple-900/20',
  path,
  onClick,
  linkText = '开始使用',
  showMore = true,
  hoverBorderColor = 'border-purple-400',
  className = '',
  delay = 0,
  whileInView = true,
}) => {
  const CardContent = (
    <div
      className={`
        group block p-6 md:p-8 rounded-3xl border-2 border-transparent
        transition-all duration-300 hover:shadow-2xl
        transform hover:-translate-y-1
        ${bgColor} hover:${hoverBorderColor}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-start space-x-4">
        {/* 图标 */}
        <motion.div
          whileHover={{ rotate: 15, scale: 1.1 }}
          className={`
            w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center
            bg-gradient-to-br ${gradient}
            shadow-lg group-hover:shadow-xl transition-shadow flex-shrink-0
          `}
        >
          <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
        </motion.div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            {title}
          </h3>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-3 md:mb-4 leading-relaxed">
            {description}
          </p>
          
          {showMore && (
            <div className="flex items-center text-purple-600 dark:text-purple-400 font-medium text-sm md:text-base">
              <span>{linkText}</span>
              <motion.div
                initial={{ x: 0 }}
                whileHover={{ x: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-2" />
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // 如果用于动画容器
  if (whileInView) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.5 }}
      >
        <div onClick={onClick} className="cursor-pointer">
          {CardContent}
        </div>
      </motion.div>
    );
  }

  return <div onClick={onClick} className="cursor-pointer">{CardContent}</div>;
};

export default FeatureCard;