/**
 * 数据验证工具
 * 提供各种数据验证函数
 */

/**
 * 验证邮箱格式
 * @param email 邮箱地址
 * @returns 是否有效
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证手机号格式（中国大陆）
 * @param phone 手机号
 * @returns 是否有效
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证身份证号格式（中国大陆）
 * @param idCard 身份证号
 * @returns 是否有效
 */
export function isValidIdCard(idCard: string): boolean {
  // 18位身份证号正则
  const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
  return idCardRegex.test(idCard);
}

/**
 * 验证URL格式
 * @param url URL地址
 * @returns 是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证IP地址格式（IPv4）
 * @param ip IP地址
 * @returns 是否有效
 */
export function isValidIPv4(ip: string): boolean {
  const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipRegex);
  
  if (!match) return false;
  
  // 检查每个数字段是否在0-255之间
  return match.slice(1).every(segment => {
    const num = parseInt(segment, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * 验证端口号
 * @param port 端口号
 * @returns 是否有效
 */
export function isValidPort(port: number): boolean {
  return port >= 0 && port <= 65535 && Number.isInteger(port);
}

/**
 * 验证用户名格式
 * @param username 用户名
 * @returns 是否有效
 */
export function isValidUsername(username: string): boolean {
  // 4-20个字符，只能包含字母、数字、下划线
  const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/;
  return usernameRegex.test(username);
}

/**
 * 验证密码强度
 * @param password 密码
 * @returns 强度等级（0-4）
 */
export function checkPasswordStrength(password: string): number {
  let strength = 0;

  // 长度检查
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;

  // 包含大写字母
  if (/[A-Z]/.test(password)) strength++;

  // 包含小写字母
  if (/[a-z]/.test(password)) strength++;

  // 包含数字
  if (/[0-9]/.test(password)) strength++;

  // 包含特殊字符
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  return Math.min(strength, 4);
}

/**
 * 验证文件类型
 * @param file 文件
 * @param allowedTypes 允许的文件类型数组
 * @returns 是否有效
 */
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.startsWith('.')) {
      // 扩展名匹配
      return file.name.toLowerCase().endsWith(type.toLowerCase());
    } else {
      // MIME类型匹配
      return file.type === type;
    }
  });
}

/**
 * 验证文件大小
 * @param file 文件
 * @param maxSize 最大大小（字节）
 * @returns 是否有效
 */
export function isValidFileSize(file: File, maxSize: number): boolean {
  return file.size <= maxSize;
}

/**
 * 验证图片格式
 * @param file 文件
 * @returns 是否是有效图片
 */
export function isImageFile(file: File): boolean {
  const imageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
  ];
  return isValidFileType(file, imageTypes);
}

/**
 * 验证音频格式
 * @param file 文件
 * @returns 是否是有效音频
 */
export function isAudioFile(file: File): boolean {
  const audioTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'audio/flac',
    'audio/webm',
  ];
  return isValidFileType(file, audioTypes);
}

/**
 * 验证视频格式
 * @param file 文件
 * @returns 是否是有效视频
 */
export function isVideoFile(file: File): boolean {
  const videoTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
  ];
  return isValidFileType(file, videoTypes);
}

/**
 * 验证文本长度
 * @param text 文本
 * @param min 最小长度
 * @param max 最大长度
 * @returns 是否有效
 */
export function isValidLength(text: string, min: number, max: number): boolean {
  return text.length >= min && text.length <= max;
}

/**
 * 验证数字范围
 * @param num 数字
 * @param min 最小值
 * @param max 最大值
 * @returns 是否有效
 */
export function isValidRange(num: number, min: number, max: number): boolean {
  return num >= min && num <= max;
}

/**
 * 验证是否为空
 * @param value 值
 * @returns 是否为空
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * 验证是否为数字
 * @param value 值
 * @returns 是否为数字
 */
export function isNumber(value: unknown): boolean {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 验证是否为整数
 * @param value 值
 * @returns 是否为整数
 */
export function isInteger(value: unknown): boolean {
  return isNumber(value) && Number.isInteger(value);
}

/**
 * 验证是否为正数
 * @param value 值
 * @returns 是否为正数
 */
export function isPositive(value: unknown): boolean {
  return isNumber(value) && (value as number) > 0;
}

/**
 * 验证是否为有效日期
 * @param date 日期
 * @returns 是否有效
 */
export function isValidDate(date: Date | string): boolean {
  const d = date instanceof Date ? date : new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * 验证是否为有效JSON字符串
 * @param str 字符串
 * @returns 是否有效
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证是否为十六进制颜色
 * @param color 颜色字符串
 * @returns 是否有效
 */
export function isHexColor(color: string): boolean {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
}

/**
 * 验证RGB颜色
 * @param rgb RGB字符串（如：rgb(255, 0, 0)）
 * @returns 是否有效
 */
export function isValidRGB(rgb: string): boolean {
  const rgbRegex = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;
  const match = rgb.match(rgbRegex);
  
  if (!match) return false;
  
  return match.slice(1).every(component => {
    const num = parseInt(component, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * 验证坐标（经纬度）
 * @param latitude 纬度
 * @param longitude 经度
 * @returns 是否有效
 */
export function isValidCoordinates(latitude: number, longitude: number): boolean {
  return (
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180
  );
}

/**
 * 验证是否为中国手机号（包含+86前缀）
 * @param phone 手机号
 * @returns 是否有效
 */
export function isChinesePhone(phone: string): boolean {
  // 去除+86前缀和空格
  const cleaned = phone.replace(/^\+86/, '').replace(/\s/g, '');
  return isValidPhone(cleaned);
}

/**
 * 验证银行卡号（Luhn算法）
 * @param cardNumber 银行卡号
 * @returns 是否有效
 */
export function isValidBankCard(cardNumber: string): boolean {
  // 去除空格和非数字字符
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * 验证UUID格式
 * @param uuid UUID字符串
 * @returns 是否有效
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * 验证MAC地址格式
 * @param mac MAC地址
 * @returns 是否有效
 */
export function isValidMACAddress(mac: string): boolean {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
}

/**
 * 验证正则表达式字符串
 * @param pattern 正则表达式字符串
 * @returns 是否有效
 */
export function isValidRegExp(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证是否为安全密码（至少8位，包含大小写字母、数字和特殊字符）
 * @param password 密码
 * @returns 是否安全
 */
export function isSecurePassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}