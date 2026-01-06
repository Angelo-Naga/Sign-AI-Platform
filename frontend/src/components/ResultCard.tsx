/**
 * 结果卡片组件
 * 用于展示识别、翻译等结果信息
 */

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Copy, Share2, History, Star } from 'lucide-react';
import { formatRelativeTime, formatPercent } from '../utils/formatters';

interface ResultCardProps {
  /** 标题 */
  title: string;
  /** 结果内容 */
  content: string;
  /** 置信度 (0-1) */
  confidence?: number;
  /** 时间戳 */
  timestamp?: number;
  /** 是否成功 */
  success?: boolean;
  /** 错误信息 */
  error?: string;
  /** 是否可以复制 */
  copyable?: boolean;
  /** 是否可以收藏 */
  favoritable?: boolean;
  /** 是否已收藏 */
  isFavorite?: boolean;
  /** 复制回调 */
  onCopy?: () => void;
  /** 收藏回调 */
  onFavorite?: () => void;
  /** 分享回调 */
  onShare?: () => void;
  /** 查看详情回调 */
  onViewDetails?: () => void;
  /** 删除回调 */
  onDelete?: () => void;
  /** 额外样式类 */
  className?: string;
}

/**
 * 结果卡片组件
 */
export const ResultCard: React.FC<ResultCardProps> = ({
  title,
  content,
  confidence,
  timestamp,
  success = true,
  error,
  copyable = true,
  favoritable = false,
  isFavorite = false,
  onCopy,
  onFavorite,
  onShare,
  onViewDetails,
  onDelete,
  className = '',
}) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      onCopy?.();
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const getConfidenceColor = (conf: number): string => {
    if (conf >= 0.9) return 'text-green-500';
    if (conf >= 0.7) return 'text-blue-500';
    if (conf >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceLabel = (conf: number): string => {
    if (conf >= 0.9) return '置信度极高';
    if (conf >= 0.7) return '置信度高';
    if (conf >= 0.5) return '置信度中等';
    return '置信度较低';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`
        bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6
        border ${success ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}
        ${className}
      `}
    >
      {/* 头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* 状态图标 */}
          {success ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center"
            >
              <CheckCircle className="w-6 h-6 text-green-500" />
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center"
            >
              <XCircle className="w-6 h-6 text-red-500" />
            </motion.div>
          )}

          {/* 标题和时间 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            {timestamp && (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <History className="w-3 h-3 mr-1" />
                {formatRelativeTime(timestamp)}
              </p>
            )}
          </div>
        </div>

        {/* 置信度 */}
        {confidence !== undefined && success && (
          <div className="flex flex-col items-end">
            <span className={`text-sm font-semibold ${getConfidenceColor(confidence)}`}>
              {formatPercent(confidence)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getConfidenceLabel(confidence)}
            </span>
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="mb-4">
        {success ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-gray-900 dark:text-white text-lg leading-relaxed">
              {content}
            </p>
          </div>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400 text-sm">
              {error || '处理失败，请重试'}
            </p>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* 复制按钮 */}
          {copyable && success && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="复制内容"
            >
              <Copy className="w-5 h-5" />
            </motion.button>
          )}

          {/* 收藏按钮 */}
          {favoritable && success && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onFavorite}
              className={`p-2 rounded-lg transition-colors ${
                isFavorite
                  ? 'text-yellow-500 hover:text-yellow-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              } hover:bg-gray-100 dark:hover:bg-gray-700`}
              title={isFavorite ? '取消收藏' : '添加收藏'}
            >
              <Star className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </motion.button>
          )}

          {/* 分享按钮 */}
          {onShare && success && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onShare}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="分享"
            >
              <Share2 className="w-5 h-5" />
            </motion.button>
          )}
        </div>

        {/* 详细信息和删除按钮 */}
        <div className="flex items-center space-x-2">
          {onViewDetails && success && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onViewDetails}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              查看详情
            </motion.button>
          )}

          {onDelete && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onDelete}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              删除
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * 紧凑型结果卡片
 */
export const CompactResultCard: React.FC<{
  title: string;
  content: string;
  confidence?: number;
  success?: boolean;
  onClick?: () => void;
  className?: string;
}> = ({
  title,
  content,
  confidence,
  success = true,
  onClick,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`
        bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 cursor-pointer
        border-l-4 ${success ? 'border-l-green-500' : 'border-l-red-500'}
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h4>
        {confidence !== undefined && (
          <span className="text-xs font-semibold text-blue-500">
            {formatPercent(confidence)}
          </span>
        )}
      </div>
      <p className="text-gray-900 dark:text-white text-sm truncate">
        {content}
      </p>
    </motion.div>
  );
};

export default ResultCard;