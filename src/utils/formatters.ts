/**
 * 格式化工具函数
 * 提供各种数据格式化函数
 */

/**
 * 格式化数字为千分位
 * @param num 数字
 * @returns 格式化后的字符串
 */
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 格式化百分比
 * @param value 值（0-1）
 * @param decimals 小数位数
 * @returns 格式化后的百分比字符串
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * 格式化货币
 * @param amount 金额
 * @param currency 货币符号（默认：¥）
 * @param decimals 小数位数
 * @returns 格式化后的货币字符串
 */
export function formatCurrency(amount: number, currency: string = '¥', decimals: number = 2): string {
  return `${currency}${amount.toFixed(decimals)}`;
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 格式化比特率
 * @param bps 比特每秒
 * @returns 格式化后的比特率字符串
 */
export function formatBitrate(bps: number): string {
  if (bps === 0) return '0 bps';

  const k = 1000;
  const sizes = ['bps', 'kbps', 'Mbps', 'Gbps'];
  const i = Math.floor(Math.log(bps) / Math.log(k));

  return `${(bps / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 格式化频率
 * @param hz 赫兹
 * @returns 格式化后的频率字符串
 */
export function formatFrequency(hz: number): string {
  if (hz === 0) return '0 Hz';

  const k = 1000;
  const sizes = ['Hz', 'kHz', 'MHz', 'GHz'];
  const i = Math.floor(Math.log(hz) / Math.log(k));

  return `${(hz / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 格式化时间
 * @param seconds 秒数
 * @returns 格式化后的时间字符串
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(hours.toString().padStart(2, '0'));
  parts.push(minutes.toString().padStart(2, '0'));
  parts.push(secs.toString().padStart(2, '0'));

  return parts.join(':');
}

/**
 * 格式化简短时间
 * @param seconds 秒数
 * @returns 格式化后的简短时间字符串
 */
export function formatTimeShort(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}小时${minutes}分`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  } else {
    return `${secs}秒`;
  }
}

/**
 * 格式化日期
 * @param date 日期对象或时间戳
 * @param format 格式字符串
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  date: Date | number,
  format: string = 'YYYY-MM-DD'
): string {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day);
}

/**
 * 格式化日期时间
 * @param date 日期对象或时间戳
 * @param format 格式字符串（默认：YYYY-MM-DD HH:mm:ss）
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(
  date: Date | number,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string {
  const d = date instanceof Date ? date : new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 格式化相对时间
 * @param timestamp 时间戳
 * @returns 相对时间字符串
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 12 * month;

  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  } else if (diff < month) {
    return `${Math.floor(diff / day)}天前`;
  } else if (diff < year) {
    return `${Math.floor(diff / month)}个月前`;
  } else {
    return `${Math.floor(diff / year)}年前`;
  }
}

/**
 * 格式化星期
 * @param date 日期对象或时间戳
 * @param format 格式（short: short/long: long）
 * @returns 星期字符串
 */
export function formatWeekday(date: Date | number, format: 'short' | 'long' = 'short'): string {
  const d = date instanceof Date ? date : new Date(date);
  const weekdays = format === 'short'
    ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    : ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  
  return weekdays[d.getDay()];
}

/**
 * 格式化文件名（去除扩展名）
 * @param filename 文件名
 * @returns 无扩展名的文件名
 */
export function formatFileNameWithoutExt(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '');
}

/**
 * 格式化文件扩展名
 * @param filename 文件名
 * @returns 扩展名（包含点）
 */
export function formatFileExt(filename: string): string {
  const match = filename.match(/\.[^/.]+$/);
  return match ? match[0] : '';
}

/**
 * 格式化MIME类型
 * @param mimeType MIME类型
 * @returns 格式化后的MIME类型描述
 */
export function formatMimeType(mimeType: string): string {
  const types: Record<string, string> = {
    'image/jpeg': 'JPEG图片',
    'image/png': 'PNG图片',
    'image/gif': 'GIF图片',
    'image/webp': 'WebP图片',
    'audio/mpeg': 'MP3音频',
    'audio/wav': 'WAV音频',
    'audio/ogg': 'OGG音频',
    'video/mp4': 'MP4视频',
    'video/webm': 'WebM视频',
    'application/pdf': 'PDF文档',
    'application/zip': 'ZIP压缩包',
  };
  
  return types[mimeType] || mimeType;
}

/**
 * 格式化语言代码
 * @param langCode 语言代码
 * @returns 格式化后的语言名称
 */
export function formatLanguage(langCode: string): string {
  const languages: Record<string, string> = {
    'zh': '中文',
    'en': 'English',
    'ja': '日本語',
    'ko': '한국어',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'ru': 'Русский',
    'ar': 'العربية',
    'pt': 'Português',
    'it': 'Italiano',
    'hi': 'हिन्दी',
    'sign': '手语',
  };
  
  return languages[langCode] || langCode;
}

/**
 * 格式化置信度
 * @param confidence 置信度（0-1）
 * @returns 格式化后的置信度字符串
 */
export function formatConfidence(confidence: number): string {
  if (confidence >= 0.9) return '极高';
  if (confidence >= 0.8) return '高';
  if (confidence >= 0.6) return '中等';
  if (confidence >= 0.4) return '较低';
  return '低';
}

/**
 * 格式化分数
 * @param score 分数（0-1 或 0-100）
 * @param max 最大值（默认为100）
 * @param decimals 小数位数
 * @returns 格式化后的分数字符串
 */
export function formatScore(score: number, max: number = 100, decimals: number = 1): string {
  const normalized = score >= 1 ? score : score * max;
  return `${normalized.toFixed(decimals)}/${max}`;
}

/**
 * 格式化数组为逗号分隔的字符串
 * @param arr 数组
 * @param separator 分隔符（默认：, ）
 * @returns 格式化后的字符串
 */
export function formatArray(arr: unknown[], separator: string = ', '): string {
  return arr.join(separator);
}

/**
 * 格式化对象为查询字符串
 * @param obj 对象
 * @returns 查询字符串
 */
export function formatQueryString(obj: Record<string, unknown>): string {
  const params = Object.entries(obj)
    .map(([key, value]) => {
      if (value === null || value === undefined) return '';
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    })
    .filter(Boolean)
    .join('&');

  return params ? `?${params}` : '';
}

/**
 * 格式化JSON字符串
 * @param obj 对象
 * @param space 缩进空格数
 * @returns 格式化后的JSON字符串
 */
export function formatJSON(obj: unknown, space: number = 2): string {
  return JSON.stringify(obj, null, space);
}

/**
 * 格式化电话号码
 * @param phone 电话号码
 * @returns 格式化后的电话号码
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`;
  }
  
  return phone;
}

/**
 * 格式化身份证号（隐藏部分）
 * @param idCard 身份证号
 * @returns 格式化后的身份证号
 */
export function formatIdCard(idCard: string): string {
  if (idCard.length < 8) return idCard;
  return `${idCard.substring(0, 4)}********${idCard.substring(idCard.length - 4)}`;
}

/**
 * 格式化银行卡号（每4位添加空格）
 * @param cardNumber 银行卡号
 * @returns 格式化后的银行卡号
 */
export function formatBankCard(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, '');
  return cleaned.replace(/(\d{4})/g, '$1 ').trim();
}

/**
 * 格式化邮箱（隐藏部分）
 * @param email 邮箱
 * @returns 格式化后的邮箱
 */
export function formatEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  
  if (local.length <= 3) {
    return `${'***'.substring(0, local.length)}@${domain}`;
  }
  
  return `${local.substring(0, 2)}***${local.substring(local.length - 1)}@${domain}`;
}

/**
 * 格式化地址（隐藏部分）
 * @param address 地址
 * @returns 格式化后的地址
 */
export function formatAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.substring(0, 4)}***${address.substring(address.length - 4)}`;
}

/**
 * 格式化波形数据
 * @param dataArray 波形数据数组
 * @param barCount 条形数量
 * @returns 格式化后的波形数据
 */
export function formatWaveform(dataArray: Uint8Array, barCount: number = 50): number[] {
  if (dataArray.length === 0) return [];

  const step = Math.floor(dataArray.length / barCount);
  const waveform: number[] = [];

  for (let i = 0; i < barCount; i++) {
    const start = i * step;
    const end = start + step;
    const chunk = dataArray.slice(start, end);
    const average = chunk.reduce((sum, val) => sum + val, 0) / chunk.length;
    waveform.push(average);
  }

  return waveform;
}

/**
 * 格式化坐标
 * @param lat 纬度
 * @param lng 经度
 * @returns 格式化后的坐标字符串
 */
export function formatCoordinate(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * 格式化语言代码
 * @param lang 语言代码
 * @returns 语言名称
 */
export function formatLanguageCode(lang: string): string {
  const languages: Record<string, string> = {
    'zh': '中文',
    'zh-CN': '简体中文',
    'zh-TW': '繁体中文',
    'en': '英文',
    'ja': '日文',
    'ko': '韩文',
    'fr': '法文',
    'de': '德文',
    'es': '西班牙文',
    'ru': '俄文',
  };

  return languages[lang] || lang;
}

/**
 * 情感数据接口
 */
export interface EmotionData {
  label: string;
  icon: string;
}

/**
 * 获取情感格式化数据（包含标签和图标）
 * @param emotion 情感标签
 * @returns 情感数据对象
 */
export function getEmotionData(emotion: string): EmotionData {
  const emotionMap: Record<string, EmotionData> = {
    'happy': { label: '开心', icon: '😊' },
    'sad': { label: '悲伤', icon: '😢' },
    'angry': { label: '愤怒', icon: '😠' },
    'neutral': { label: '平静', icon: '😐' },
    'surprised': { label: '惊讶', icon: '😲' },
    'fearful': { label: '恐惧', icon: '😨' },
  };

  return emotionMap[emotion] || { label: emotion, icon: '😐' };
}

/**
 * 格式化情感标签
 * @param emotion 情感标签
 * @returns 格式化后的情感标签
 */
export function formatEmotion(emotion: string): string {
  return getEmotionData(emotion).label;
}

/**
 * 格式化状态
 * @param status 状态
 * @returns 格式化后的状态字符串
 */
export function formatStatus(status: string): string {
  const statuses: Record<string, string> = {
    'success': '成功',
    'error': '错误',
    'pending': '等待中',
    'processing': '处理中',
    'completed': '已完成',
    'failed': '失败',
    'cancelled': '已取消',
    'default': '默认',
    'active': '活跃',
    'inactive': '非活跃',
  };

  return statuses[status] || status;
}