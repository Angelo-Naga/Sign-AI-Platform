/**
 * TestimonialCard 组件 - 情感化用户评价卡片
 * 用于展示用户评价、案例故事或反馈
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote, CheckCircle } from 'lucide-react';

export interface Testimonial {
  /** 唯一标识 */
  id: string;
  /** 用户姓名 */
  name: string;
  /** 用户头像URL */
  avatar?: string;
  /** 用户角色/头衔 */
  role?: string;
  /** 评价内容 */
  content: string;
  /** 评分（1-5） */
  rating?: number;
  /** 是否已验证 */
  verified?: boolean;
  /** 时间戳 */
  date?: string;
  /** 背景渐变类名 */
  gradient?: string;
}

interface TestimonialCardProps {
  /** 评价数据 */
  testimonial: Testimonial;
  /** 是否显示评分 */
  showRating?: boolean;
  /** 额外类名 */
  className?: string;
  /** 动画延迟 */
  delay?: number;
  /** 视图内触发 */
  whileInView?: boolean;
  /** 点击回调 */
  onClick?: () => void;
}

/**
 * TestimonialCard 组件
 */
export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  testimonial,
  showRating = true,
  className = '',
  delay = 0,
  whileInView = true,
  onClick,
}) => {
  const {
    name,
    avatar,
    role,
    content,
    rating = 5,
    verified = false,
    date,
    gradient = 'from-purple-50 dark:from-purple-900/20 to-pink-50 dark:to-pink-900/20',
  } = testimonial;

  // 生成星星
  const renderStars = () => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 md:w-5 md:h-5 ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ));
  };

  const CardContent = (
    <motion.div
      onClick={onClick}
      className={`
        relative bg-gradient-to-br ${gradient} rounded-2xl md:rounded-3xl
        p-6 md:p-8 shadow-lg hover:shadow-xl transition-shadow duration-300
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      whileHover={{ y: -4 }}
    >
      {/* 引用符号装饰 */}
      <Quote className="absolute top-4 right-4 md:top-6 md:right-6 w-8 h-8 md:w-10 md:h-10 text-purple-300 dark:text-purple-600 opacity-30" />

      {/* 评价内容 */}
      <p className="text-gray-700 dark:text-gray-300 text-sm md:text-base lg:text-lg leading-relaxed mb-6 relative">
        {content}
      </p>

      {/* 评分 */}
      {showRating && (
        <div className="flex items-center space-x-1 mb-4 md:mb-6">
          {renderStars()}
          {verified && (
            <CheckCircle className="w-4 h-4 ml-2 text-blue-500" />
          )}
        </div>
      )}

      {/* 用户信息 */}
      <div className="flex items-center space-x-3 md:space-x-4">
        {/* 头像 */}
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-md"
          />
        ) : (
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-md">
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* 用户详情 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base truncate">
              {name}
            </h4>
            {verified && (
              <CheckCircle className="w-3 h-3 text-blue-500 flex-shrink-0" />
            )}
          </div>
          {role && (
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
              {role}
            </p>
          )}
        </div>

        {/* 时间 */}
        {date && (
          <time className="text-xs md:text-sm text-gray-500 dark:text-gray-500 flex-shrink-0">
            {new Date(date).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </time>
        )}
      </div>
    </motion.div>
  );

  // 如果用于动画容器
  if (whileInView) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.5 }}
      >
        {CardContent}
      </motion.div>
    );
  }

  return CardContent;
};

/**
 * TestimonialCarousel 组件 - 评价轮播
 */
interface TestimonialCarouselProps {
  /** 评价列表 */
  testimonials: Testimonial[];
  /** 每页显示数量 */
  itemsPerPage?: number;
  /** 额外类名 */
  className?: string;
}

export const TestimonialCarousel: React.FC<TestimonialCarouselProps> = ({
  testimonials = [],
  itemsPerPage = 3,
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const totalPages = Math.ceil(testimonials.length / itemsPerPage);
  const startIndex = currentIndex * itemsPerPage;
  const visibleTestimonials = testimonials.slice(startIndex, startIndex + itemsPerPage);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % totalPages);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  return (
    <div className={`relative ${className}`}>
      {/* 评价卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleTestimonials.map((testimonial, index) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} delay={index * 0.1} />
        ))}
      </div>

      {/* 导航控制 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-4 mt-8">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={prevSlide}
            className="p-2 md:p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
            aria-label="上一页"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>

          {/* 分页指示器 */}
          <div className="flex items-center space-x-2">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`
                  w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300
                  ${index === currentIndex 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 w-6 md:w-8' 
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }
                `}
                aria-label={`查看第 ${index + 1} 页评价`}
              />
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={nextSlide}
            className="p-2 md:p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
            aria-label="下一页"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default TestimonialCard;