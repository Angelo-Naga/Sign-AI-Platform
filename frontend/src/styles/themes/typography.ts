/**
 * typography.ts - 字体配置
 * 定义适合情感化UI的字体系统
 */

import { Typography } from './types';

/**
 * 情感化字体配置
 * 选择易读、友好的字体组合
 */
export const typography: Typography = {
  // 字体系列
  fontFamily: {
    // 无衬线字体 - 现代、清爽、易读
    sans: [
      '-apple-system', // Apple 系统
      'BlinkMacSystemFont', // Chrome/Blink
      '"Segoe UI"', // Windows
      'Roboto', // Android/Google
      '"Helvetica Neue"', // iOS 优化
      'Arial', // 回退
      'sans-serif' // 最终回退
    ].join(', '),

    // 等宽字体 - 代码、数字显示
    mono: [
      'Consolas', // Windows
      'Monaco', // Mac
      '"Courier New"', // 通用
      'monospace' // 标准
    ].join(', '),

    // 衬线字体 - 标题、强调文本
    serif: [
      'Georgia', // 经典衬线字体
      'Times New Roman', // 通用衬线
      'Times', // 标准
      'serif' // 类别
    ].join(', ')
  },

  // 字体大小（以 rem 为单位，基准为 16px）
  fontSize: {
    // 极小文本
    xs: '0.75rem',  // 12px - 辅助信息、标签

    // 小文本
    sm: '0.875rem', // 14px - 描述文本、辅助说明

    // 基础文本
    base: '1rem',   // 16px - 正文、默认大小

    // 大文本
    lg: '1.125rem', // 18px - 重要文本、副标题

    // 超大文本
    xl: '1.25rem',  // 20px - 小标题

    // 特大文本
    '2xl': '1.5rem', // 24px - 标题

    // 巨大文本
    '3xl': '1.875rem', // 30px - 主标题

    // 超大标题
    '4xl': '2.25rem', // 36px - 特大标题

    // 标题文字
    '5xl': '3rem',    // 48px - 页面主标题

    // 超级标题
    '6xl': '3.75rem', // 60px - 特殊用途
    '7xl': '4.5rem',  // 72px - 英雄区标题
    '8xl': '6rem',    // 96px - 超大展示
    '9xl': '8rem'     // 128px - 极大展示
  },

  // 字体粗细
  fontWeight: {
    //纤细文本
    light: 300, // 300 - 淡化文本、水印

    // 正常文本
    normal: 400, // 400 - 正文、默认

    // 中等粗细
    medium: 500, // 500 - 重点标注

    // 半粗体
    semibold: 600, // 600 - 小标题、强调

    // 粗体
    bold: 700, // 700 - 标题、重要信息

    // 超粗体
    extrabold: 800, // 800 - 极重要信息
    black: 900 // 900 - 特殊强调
  },

  // 行高（单位：行数的倍数）
  lineHeight: {
    // 紧凑行高
    tight: 1.25,  // 1.25 - 适合按钮、标签

    // 正常行高
    normal: 1.5,  // 1.5 - 适合正文

    // 宽松行高
    relaxed: 1.75, // 1.75 - 适合标题、长文本

    // 超宽松
    loose: 2      // 2 - 特殊排版需求
  },

  // 字间距
  letterSpacing: {
    // 紧凑字距
    tighter: '-0.05em', // -5%

    // 稍紧凑
    tight: '-0.025em', // -2.5%

    // 正常
    normal: '0', // 0

    // 稍宽
    wide: '0.025em', // 2.5%

    // 宽松
    wider: '0.05em', // 5%

    // 超宽
    widest: '0.1em' // 10%
  },

  // 文本样式预设
  textStyles: {
    // 标题样式
    h1: {
      fontSize: '3rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em'
    },

    h2: {
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.02em'
    },

    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.01em'
    },

    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
      letterSpacing: '0'
    },

    // 正文样式
    body: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: '0'
    },

    bodyLarge: {
      fontSize: '1.125rem',
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: '0'
    },

    bodySmall: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0.01em'
    },

    // 辅助文本样式
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.4,
      letterSpacing: '0.02em'
    },

    overline: {
      fontSize: '0.75rem',
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: '0.1em',
      textTransform: 'uppercase'
    },

    // 按钮文本样式
    button: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
      letterSpacing: '0.01em'
    },

    buttonSmall: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0'
    },

    buttonLarge: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
      letterSpacing: '0.01em'
    }
  },

  // 文本颜色配置
  textColor: {
    // 主要文本
    primary: '#1F2937', // gray-800

    // 次要文本
    secondary: '#6B7280', // gray-500

    // 禁用文本
    disabled: '#9CA3AF', // gray-400

    // 悬停文本
    hover: '#111827', // gray-900

    // 链接文本
    link: '#3B82F6', // blue-500

    // 反色文本（深色背景）
    inverse: '#FFFFFF'
  }
};

/**
 * 响应式字体大小
 * 根据屏幕尺寸调整字体
 */
export const responsiveTypography = {
  mobile: {
    h1: { fontSize: '2rem' },
    h2: { fontSize: '1.75rem' },
    h3: { fontSize: '1.25rem' }
  },

  tablet: {
    h1: { fontSize: '2.5rem' },
    h2: { fontSize: '2rem' },
    h3: { fontSize: '1.5rem' }
  },

  desktop: {
    h1: { fontSize: '3rem' },
    h2: { fontSize: '2.25rem' },
    h3: { fontSize: '1.5rem' }
  }
};

export default typography;