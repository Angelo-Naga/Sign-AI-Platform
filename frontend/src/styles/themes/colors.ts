/**
 * colors.ts - 情感化配色方案
 * 定义温馨、友好、易于访问的色彩系统
 */

import { ColorConfig } from './types';

/**
 * 情感化色彩配置
 * 基于色彩心理学，选择能够引起积极情感的颜色
 */

// 主色调 - 温暖友好的蓝色
// 象征信任、专业、平静
export const primaryColors: ColorConfig = {
  50: '#E3F2FD',
  100: '#BBDEFB',
  200: '#90CAF9',
  300: '#64B5F6',
  400: '#42A5F5',
  500: '#3B82F6',
  600: '#2563EB',
  700: '#1D4ED8',
  800: '#1E40AF',
  900: '#1E3A8A'
};

// 成功色 - 柔和自然的绿色
// 象征成功、完成、安全
export const successColors: ColorConfig = {
  50: '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981',
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B'
};

// 警告色 - 温暖愉悦的黄色
// 象征注意、提示、友好
export const warningColors: ColorConfig = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  300: '#FCD34D',
  400: '#FBBF24',
  500: '#F59E0B',
  600: '#D97706',
  700: '#B45309',
  800: '#92400E',
  900: '#78350F'
};

// 错误色 - 柔和温和的红色
// 象征错误、警告、但不刺眼
export const errorColors: ColorConfig = {
  50: '#FEF2F2',
  100: '#FEE2E2',
  200: '#FECACA',
  300: '#FCA5A5',
  400: '#F87171',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
  800: '#991B1B',
  900: '#7F1D1D'
};

// 信息色 - 清新舒缓的青色
// 象征信息、提示、清新
export const infoColors: ColorConfig = {
  50: '#ECFEFF',
  100: '#CFFAFE',
  200: '#A5F3FC',
  300: '#67E8F9',
  400: '#22D3EE',
  500: '#06B6D4',
  600: '#0891B2',
  700: '#0E7490',
  800: '#155E75',
  900: '#164E63'
};

// 中性色 - 柔和的灰度
// 用于背景、文本、边框
export const neutralColors: ColorConfig = {
  50: '#FAFAFA',
  100: '#F5F5F5',
  200: '#E5E5E5',
  300: '#D4D4D4',
  400: '#A3A3A3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717'
};

/**
 * 情感化色彩组合
 * 用于特定的情感场景
 */

// 欢迎主题 - 温暖橙色系
export const welcomeColors = {
  primary: '#FF9F43',
  secondary: '#FF6B6B',
  accent: '#FECA57',
  background: '#FFF5EC'
};

// 激励主题 - 活力粉色系
export const motivationColors = {
  primary: '#FF6B9D',
  secondary: '#C44569',
  accent: '#F8B500',
  background: '#FFF0F5'
};

// 沉静主题 - 宁静紫色系
export const calmColors = {
  primary: '#6C5CE7',
  secondary: '#A29BFE',
  accent: '#00CEC9',
  background: '#F3F0FF'
};

// 创意主题 - 活泼彩虹色
export const creativeColors = {
  primary: '#00B894',
  secondary: '#0984E3',
  accent: '#E17055',
  gradient: ['#00B894', '#0984E3', '#E17055', '#00CEC9'],
  background: '#F8F9FA'
};

/**
 * 渐变色配置
 * 用于背景、按钮、卡片等
 */
export const gradients = {
  // 蓝色渐变
  blue: {
    primary: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    soft: 'linear-gradient(135deg, #93C5FD 0%, #60A5FA 100%)',
    vibrant: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    subtle: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)'
  },

  // 绿色渐变
  green: {
    primary: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    soft: 'linear-gradient(135deg, #6EE7B7 0%, #34D399 100%)',
    vibrant: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    subtle: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)'
  },

  // 黄色渐变
  yellow: {
    primary: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    soft: 'linear-gradient(135deg, #FCD34D 0%, #FBBF24 100%)',
    vibrant: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    subtle: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)'
  },

  // 红色渐变
  red: {
    primary: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    soft: 'linear-gradient(135deg, #FCA5A5 0%, #F87171 100%)',
    vibrant: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
    subtle: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)'
  },

  // 彩虹渐变（用于庆祝效果）
  rainbow: {
    vibrant: 'linear-gradient(135deg, #FF6B6B 0%, #FECA57 25%, #48DBFB 50%, #FF9FF3 75%, #54A0FF 100%)',
    pastel: 'linear-gradient(135deg, #FFB8B8 0%, #FFEAA7 25%, #B8E994 50%, #D7BDE2 75%, #85C1E9 100%)',
    warm: 'linear-gradient(135deg, #FF9F43 0%, #EE5A24 50%, #F8B500 100%)',
    cool: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 50%, #6C5CE7 100%)'
  },

  // 深色渐变
  dark: {
    primary: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
    subtle: 'linear-gradient(135deg, #374151 0%, #4B5563 100%)',
    vibrant: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)'
  },

  // 特殊效果渐变
  special: {
    glassmorphism: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
    metallic: 'linear-gradient(135deg, #E5E7EB 0%, #F3F4F6 50%, #E5E7EB 100%)',
    aurora: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    sunset: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    ocean: 'linear-gradient(135deg, #66a6ff 0%, #89f7fe 100%)',
    forest: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
  }
};

/**
 * 阴影颜色配置
 * 用于不同状态的阴影
 */
export const shadowColors = {
  default: 'rgba(0, 0, 0, 0.1)',
  light: 'rgba(0, 0, 0, 0.05)',
  medium: 'rgba(0, 0, 0, 0.1)',
  dark: 'rgba(0, 0, 0, 0.15)',
  colored: 'rgba(59, 130, 246, 0.3)',
  success: 'rgba(16, 185, 129, 0.3)',
  warning: 'rgba(245, 158, 11, 0.3)',
  error: 'rgba(239, 68, 68, 0.3)'
};

/**
 * 导出所有颜色配置
 */
export const allColors = {
  primary: primaryColors,
  success: successColors,
  warning: warningColors,
  error: errorColors,
  info: infoColors,
  neutral: neutralColors,
  gradients,
  shadowColors
};

export default allColors;