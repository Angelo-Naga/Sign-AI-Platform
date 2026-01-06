/**
 * 页脚组件
 * 提供企业级网站的底部信息和导航
 * 情感化设计 + 企业级Web标准
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Github,
  Twitter,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  Heart,
  ArrowUp,
  ChevronRight,
} from 'lucide-react';
import type { SocialLink, FooterLink } from '../types';

interface FooterProps {
  /** 社交媒体链接 */
  socialLinks?: SocialLink[];
  /** 联系信息 */
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  /** 显示回到顶部按钮 */
  showBackToTop?: boolean;
}

/**
 * 底部导航链接组
 */
interface LinkGroup {
  title: string;
  links: FooterLink[];
}

const linkGroups: LinkGroup[] = [
  {
    title: '产品',
    links: [
      { label: '手语识别', path: '/sign-recognition' },
      { label: '语音处理', path: '/voice-processing' },
      { label: '声音克隆', path: '/voice-cloning' },
      { label: '双向翻译', path: '/translation' },
    ],
  },
  {
    title: '资源',
    links: [
      { label: '使用文档', path: '/docs' },
      { label: 'API 参考', path: '/api/docs' },
      { label: '教程', path: '/tutorials' },
      { label: '常见问题', path: '/faq' },
    ],
  },
  {
    title: '公司',
    links: [
      { label: '关于我们', path: '/about' },
      { label: '联系我们', path: '/contact' },
      { label: '加入我们', path: '/careers' },
      { label: '博客', path: '/blog' },
    ],
  },
  {
    title: '支持',
    links: [
      { label: '帮助中心', path: '/help' },
      { label: '社区论坛', path: '/community' },
      { label: '反馈建议', path: '/feedback' },
      { label: '服务状态', path: '/status' },
    ],
  },
];

/**
 * 社交媒体图标映射
 */
const socialIconMap: Record<string, React.ElementType> = {
  github: Github,
  twitter: Twitter,
  linkedin: Linkedin,
  email: Mail,
};

/**
 * 页脚组件
 */
export const Footer: React.FC<FooterProps> = ({
  socialLinks = [
    { platform: 'github', url: 'https://github.com', label: 'GitHub' },
    { platform: 'twitter', url: 'https://twitter.com', label: 'Twitter' },
    { platform: 'linkedin', url: 'https://linkedin.com', label: 'LinkedIn' },
    { platform: 'email', url: 'mailto:contact@signai.com', label: 'Email' },
  ],
  contactInfo = {
    email: 'contact@signai.com',
    phone: '+86 400-123-4567',
    address: '上海市浦东新区张江高科技园区',
  },
  showBackToTop = true,
}) => {
  const [emailHovered, setEmailHovered] = useState(false);

  /**
   * 滚动到顶部
   */
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  /**
   * 获取社交图标组件
   */
  const getSocialIcon = (platform: string) => {
    const IconComponent = socialIconMap[platform] || Github;
    return <IconComponent className="w-5 h-5" />;
  };

  /**
   * 处理链接点击
   */
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string, label: string) => {
    // 检查是否是有效路由
    const validRoutes = ['/', '/sign-recognition', '/voice-processing', '/voice-cloning', '/translation', '/privacy', '/terms', '/cookies', '/accessibility'];
    
    if (!validRoutes.includes(path)) {
      e.preventDefault();
      // 对于不存在路由的链接，显示提示并滚动到相应区域
      const targetId = path.replace('/', '') || 'home';
      const element = document.getElementById(targetId);
      
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else {
        // 如果没有对应元素，显示友好提示
        alert(`"${label}" 页面正在开发中，敬请期待！\n\n您可以体验以下功能：\n- 手语识别\n- 语音处理\n- 声音克隆\n- 双向翻译`);
      }
    }
  };

  return (
    <footer className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white">
      {/* 主要内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-12">
          {/* 品牌信息 */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center space-x-3 mb-4 group">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-purple-500/50 transition-shadow"
              >
                <svg
                  className="w-7 h-7 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M8 3l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 7v14" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 21h8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Sign AI
                </h3>
                <p className="text-xs text-gray-400">让沟通无处不在</p>
              </div>
            </Link>

            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              致力于通过人工智能技术，为听障人士和语障人士提供更便捷的沟通方式，消除沟通障碍，构建无障碍社会。
            </p>

            {/* 社交媒体链接 */}
            <div className="flex items-center space-x-3">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.platform}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, y: -3 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 bg-gray-800 hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500 rounded-lg flex items-center justify-center transition-all duration-300"
                  aria-label={social.label}
                  title={social.label}
                >
                  <span className="text-gray-400 hover:text-white">
                    {getSocialIcon(social.platform)}
                  </span>
                </motion.a>
              ))}
            </div>
          </div>

          {/* 导航链接 */}
          {linkGroups.map((group, index) => (
            <div key={group.title} className="lg:col-span-1">
              <h4 className="text-base font-semibold text-white mb-4 flex items-center group">
                {group.title}
                <ChevronRight className={`w-4 h-4 ml-2 text-purple-400 transition-transform duration-300 transform group-hover:rotate-90`} />
              </h4>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <motion.li
                    key={link.path}
                    whileHover={{ x: 5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Link
                      to={link.path}
                      onClick={(e) => handleLinkClick(e, link.path, link.label)}
                      className="text-sm text-gray-400 hover:text-purple-400 dark:hover:text-purple-300 transition-colors duration-200 flex items-center group/link cursor-pointer active:scale-95"
                    >
                      <ChevronRight className="w-3 h-3 mr-2 opacity-0 -ml-5 transition-all duration-200 group-hover/link:opacity-100 group-hover/link:ml-0 text-purple-400" />
                      <span>{link.label}</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>
          ))}

          {/* 联系信息 */}
          <div className="lg:col-span-1">
            <h4 className="text-base font-semibold text-white mb-4 flex items-center group">
              联系我们
              <ChevronRight className={`w-4 h-4 ml-2 text-purple-400 transition-transform duration-300 transform group-hover:rotate-90`} />
            </h4>
            <ul className="space-y-4">
              {contactInfo.email && (
                <li className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mail className="w-4 h-4 text-purple-400" />
                  </div>
                  <a
                    href={`mailto:${contactInfo.email}`}
                    onMouseEnter={() => setEmailHovered(true)}
                    onMouseLeave={() => setEmailHovered(false)}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <span className="block font-medium text-white">
                      邮箱地址
                    </span>
                    <span className="text-purple-400">{contactInfo.email}</span>
                  </a>
                </li>
              )}
              {contactInfo.phone && (
                <li className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Phone className="w-4 h-4 text-purple-400" />
                  </div>
                  <a
                    href={`tel:${contactInfo.phone}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <span className="block font-medium text-white">服务热线</span>
                    <span className="text-purple-400">{contactInfo.phone}</span>
                  </a>
                </li>
              )}
              {contactInfo.address && (
                <li className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-sm text-gray-400 hover:text-white transition-colors">
                    <span className="block font-medium text-white">
                      公司地址
                    </span>
                    <span>{contactInfo.address}</span>
                  </div>
                </li>
              )}
            </ul>

            {/* 订阅表单 */}
            <div className="mt-6">
              <p className="text-sm text-gray-400 mb-3">订阅我们的最新动态</p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="输入您的邮箱"
                  className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-l-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500"
                  aria-label="邮箱地址"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-r-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                >
                  订阅
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* 装饰性线条 */}
        <div className="mt-12 mb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        </div>

        {/* 底部信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 版权信息 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} Sign AI. 保留所有权利
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span className="flex items-center">
                Made with{' '}
                <motion.span
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Heart className="w-4 h-4 mx-1 text-red-500 fill-current" />
                </motion.span>
                for everyone
              </span>
            </div>
          </div>

          {/* 法律链接 */}
          <div className="flex flex-wrap items-center justify-start sm:justify-end gap-4 md:gap-6 text-sm text-gray-400">
            <Link
              to="/privacy"
              onClick={(e) => handleLinkClick(e, '/privacy', '隐私政策')}
              className="hover:text-purple-400 transition-colors cursor-pointer active:scale-95"
            >
              隐私政策
            </Link>
            <Link
              to="/terms"
              onClick={(e) => handleLinkClick(e, '/terms', '服务条款')}
              className="hover:text-purple-400 transition-colors cursor-pointer active:scale-95"
            >
              服务条款
            </Link>
            <Link
              to="/cookies"
              onClick={(e) => handleLinkClick(e, '/cookies', 'Cookie 政策')}
              className="hover:text-purple-400 transition-colors cursor-pointer active:scale-95"
            >
              Cookie 政策
            </Link>
            <Link
              to="/accessibility"
              onClick={(e) => handleLinkClick(e, '/accessibility', '无障碍声明')}
              className="hover:text-purple-400 transition-colors cursor-pointer active:scale-95"
            >
              无障碍声明
            </Link>
          </div>
        </div>
      </div>

      {/* 回到顶部按钮 */}
      {showBackToTop && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50"
          aria-label="回到顶部"
          title="回到顶部"
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </footer>
  );
};

export default Footer;