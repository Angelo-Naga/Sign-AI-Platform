/**
 * 验证器函数单元测试
 */

import { describe, it, expect } from 'vitest';
import { 
  validateEmail, 
  validateUrl, 
  validatePhone, 
  required,
  minLength,
  maxLength 
} from '@/utils/validators';

describe('验证器函数', () => {
  describe('validateEmail', () => {
    it('应该正确验证有效的邮箱地址', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    it('应该拒绝无效的邮箱地址', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('invalid@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });

    it('应该正确处理空值', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('应该正确验证有效的 URL', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://example.com/path')).toBe(true);
      expect(validateUrl('https://sub.example.com:8080/path?query=value')).toBe(true);
    });

    it('应该拒绝无效的 URL', () => {
      expect(validateUrl('not a url')).toBe(false);
      expect(validateUrl('http://')).toBe(false);
      expect(validateUrl('ftp://example.com')).toBe(false);
    });

    it('应该正确处理空值', () => {
      expect(validateUrl('')).toBe(false);
      expect(validateUrl(null as any)).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('应该正确验证有效的手机号码', () => {
      expect(validatePhone('13800138000')).toBe(true);
      expect(validatePhone('+8613800138000')).toBe(true);
      expect(validatePhone('0123456789')).toBe(true);
    });

    it('应该拒绝无效的手机号码', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('abcdefghijk')).toBe(false);
      expect(validatePhone('')).toBe(false);
    });
  });

  describe('required', () => {
    it('应该要求值存在', () => {
      expect(required('test')).toBe(true);
      expect(required(' ')).toBe(true);
      expect(required('0')).toBe(true);
    });

    it('应该拒绝空值', () => {
      expect(required('')).toBe(false);
      expect(required(null as any)).toBe(false);
      expect(required(undefined as any)).toBe(false);
    });
  });

  describe('minLength', () => {
    it('应该正确验证最小长度', () => {
      const validator = minLength(5);
      expect(validator('hello')).toBe(true);
      expect(validator('hello world')).toBe(true);
      expect(validator('hi')).toBe(false);
    });

    it('应该正确处理长度等于最小值的字符串', () => {
      const validator = minLength(5);
      expect(validator('hello')).toBe(true);
    });
  });

  describe('maxLength', () => {
    it('应该正确验证最大长度', () => {
      const validator = maxLength(10);
      expect(validator('hello')).toBe(true);
      expect(validator('hello world')).toBe(false);
    });

    it('应该正确处理长度等于最大值的字符串', () => {
      const validator = maxLength(5);
      expect(validator('hello')).toBe(true);
    });
  });
});