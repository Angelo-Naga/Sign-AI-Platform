/**
 * types.ts - 主题类型定义
 * 定义主题配置的类型接口
 */

// 颜色配置接口
export interface ColorConfig {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

// 颜色主题接口
export interface ColorsTheme {
  primary: ColorConfig;
  success: ColorConfig;
  warning: ColorConfig;
  error: ColorConfig;
  info: ColorConfig;
  neutral: ColorConfig;
}

// 字体 family 接口
export interface FontFamily {
  sans: string;
  mono: string;
  serif?: string;
}

// 字体大小接口
export interface FontSize {
  xs: string;
  sm: string;
  base: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
  '5xl': string;
  '6xl': string;
  '7xl'?: string;
  '8xl'?: string;
  '9xl'?: string;
}

// 字体粗细接口
export interface FontWeight {
  light: number;
  normal: number;
  medium: number;
  semibold: number;
  bold: number;
  extrabold?: number;
  black?: number;
}

// 行高接口
export interface LineHeight {
  tight: number;
  normal: number;
  relaxed: number;
  loose?: number;
}

// 字号间距接口
export interface LetterSpacing {
  tighter: string;
  tight: string;
  normal: string;
  wide: string;
  wider: string;
  widest: string;
}

// 文本样式接口
export interface TextStyle {
  fontSize: string;
  fontWeight: number | string;
  lineHeight: string | number;
  letterSpacing?: string;
  textTransform?: string;
}

// 文本颜色接口
export interface TextColor {
  primary: string;
  secondary: string;
  disabled: string;
  hover: string;
  link: string;
  inverse: string;
}

// 字体配置接口
export interface Typography {
  fontFamily: FontFamily;
  fontSize: FontSize;
  fontWeight: FontWeight;
  lineHeight: LineHeight;
  letterSpacing?: LetterSpacing;
  textStyles?: Record<string, TextStyle>;
  textColor?: TextColor;
}

// 间距接口
export interface Spacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
  '5xl': string;
}

// 圆角接口
export interface BorderRadius {
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
}

// 阴影接口
export interface Shadow {
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
  none: string;
}

// 动画持续时间接口
export interface AnimationDuration {
  fast: number;
  normal: number;
  slow: number;
}

// 缓动函数接口
export interface AnimationEasing {
  linear: string;
  ease: string;
  easeIn: string;
  easeOut: string;
  easeInOut: string;
  bounce: string;
  spring: string;
}

// 动画预设接口
export interface AnimationPresets {
  fadeIn: { opacity: [number, number] };
  slideUp: { y: [number, number]; opacity: [number, number] };
  slideDown: { y: [number, number]; opacity: [number, number] };
  slideLeft: { x: [number, number]; opacity: [number, number] };
  slideRight: { x: [number, number]; opacity: [number, number] };
  scaleIn: { scale: [number, number]; opacity: [number, number] };
  bounce: { y: [number, number, number]; rotate: [number, number, number] };
  pulse: { scale: [number, number, number]; opacity: [number, number, number] };
  spin: { rotate: [number, number] };
  ping: { transform: [string, string]; opacity: [number, number] };
}

// 动画配置接口
export interface Animation {
  duration: AnimationDuration;
  easing: AnimationEasing;
  presets: AnimationPresets;
}

// 过渡配置接口
export interface Transition {
  default: string;
  fast: string;
  slow: string;
}

// Z-index 接口
export interface ZIndex {
  dropdown: number;
  sticky: number;
  fixed: number;
  modalBackdrop: number;
  modal: number;
  popover: number;
  tooltip: number;
}

// 断点接口
export interface Breakpoints {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

// 主题配置接口
export interface ThemeConfig {
  name: string;
  colors: ColorsTheme;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadow: Shadow;
  animation: Animation;
  transition: Transition;
  zIndex: ZIndex;
  breakpoints: Breakpoints;
}