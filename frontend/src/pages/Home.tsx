/**
 * 主页组件
 * 展示应用的主要功能入口和介绍
 * 情感化叙事风格 + 企业级Web标准
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Hand,
  Mic,
  UserPlus,
  Languages,
  ArrowRight,
  Sparkles,
  Heart,
  Target,
  Zap,
  Shield,
  Clock,
  Users,
  Star,
  BookOpen,
} from 'lucide-react';
import {
  HeroSection,
  FeatureCard,
  ProcessFlow,
  TestimonialCard,
  TestimonialCarousel,
} from '../components/emotional';

/**
 * 功能卡片数据
 */
const featureCards = [
  {
    id: 'sign',
    title: '手语识别',
    description: '通过AI技术实时识别手语，将手势转换为文字，打破沟通障碍',
    icon: Hand,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    path: '/sign-recognition',
  },
  {
    id: 'voice',
    title: '语音处理',
    description: '智能语音识别和合成，支持情感分析，让交流更自然',
    icon: Mic,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    path: '/voice-processing',
  },
  {
    id: 'clone',
    title: '声音克隆',
    description: '克隆您的声音，用您独特的音色进行语音合成',
    icon: UserPlus,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    path: '/voice-cloning',
  },
  {
    id: 'translation',
    title: '智能翻译',
    description: '多语言实时翻译，支持文本和手语互译，沟通无界限',
    icon: Languages,
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    path: '/translation',
  },
];

/**
 * 优势数据
 */
const advantages = [
  {
    icon: Target,
    title: '精准识别',
    description: '基于深度学习，识别准确率高达95%以上',
  },
  {
    icon: Zap,
    title: '极速响应',
    description: '毫秒级处理速度，实时互动零延迟',
  },
  {
    icon: Shield,
    title: '隐私保护',
    description: '所有数据本地处理，保障您的隐私安全',
  },
];

/**
 * 使用流程步骤
 */
const processSteps = [
  {
    id: 'step-1',
    title: '选择功能',
    description: '根据您的需求选择手语识别、语音处理等功能模块',
    icon: BookOpen,
  },
  {
    id: 'step-2',
    title: '开始使用',
    description: '启动摄像头或麦克风，开始您的智能交流之旅',
    icon: Sparkles,
  },
  {
    id: 'step-3',
    title: '实时交互',
    description: '体验实时的手势识别、语音转换和翻译服务',
    icon: Heart,
  },
];

/**
 * 用户评价数据
 */
const testimonials = [
  {
    id: 'testimonial-1',
    name: '王小明',
    avatar: '',
    role: '听障人士',
    content: '这个应用真的改变了我的生活！手语识别功能非常准确，让我能够更轻松地与听力正常的人交流。感谢开发者的用心设计！',
    rating: 5,
    verified: true,
    date: '2024-03-15',
    gradient: 'from-purple-50 dark:from-purple-900/20 to-pink-50 dark:to-pink-900/20',
  },
  {
    id: 'testimonial-2',
    name: '李女士',
    avatar: '',
    role: '手语翻译志愿者',
    content: '作为手语翻译志愿者，这个工具大大提高了我的工作效率。界面友好，识别速度快，是帮助听障人士沟通的得力助手。',
    rating: 5,
    verified: true,
    date: '2024-02-20',
    gradient: 'from-blue-50 dark:from-blue-900/20 to-cyan-50 dark:to-cyan-900/20',
  },
  {
    id: 'testimonial-3',
    name: '张伟',
    avatar: '',
    role: '无障碍技术研究员',
    content: '从技术角度来看，这个产品的AI性能令人印象深刻。特别是多模态融合技术，在同类产品中处于领先水平。',
    rating: 5,
    verified: true,
    date: '2024-03-08',
    gradient: 'from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20',
  },
  {
    id: 'testimonial-4',
    name: '陈婷',
    avatar: '',
    role: '用户体验设计师',
    content: '界面设计非常人性化，情感化的配色和流畅的动画让整个使用体验变得愉悦。每个功能的位置都很合理，学习成本低。',
    rating: 5,
    verified: true,
    date: '2024-02-28',
    gradient: 'from-orange-50 dark:from-orange-900/20 to-red-50 dark:to-red-900/20',
  },
  {
    id: 'testimonial-5',
    name: '刘浩',
    avatar: '',
    role: '特殊教育教师',
    content: '在课堂上使用这个工具帮助学生理解手语，效果非常好。学生们都很喜欢，特别是实时翻译功能。',
    rating: 5,
    verified: false,
    date: '2024-03-01',
    gradient: 'from-pink-50 dark:from-pink-900/20 to-purple-50 dark:to-purple-900/20',
  },
  {
    id: 'testimonial-6',
    name: '周芸',
    avatar: '',
    role: '听障社区工作者',
    content: '不仅功能强大，而且完全免费！这种无私的精神令人感动。希望更多人能够使用到这个优秀的工具。',
    rating: 5,
    verified: true,
    date: '2024-02-15',
    gradient: 'from-cyan-50 dark:from-cyan-900/20 to-blue-50 dark:to-blue-900/20',
  },
];

/**
 * 主页组件
 */
const Home: React.FC = () => {
  const navigate = useNavigate();

  // 处理"立即开始"按钮点击
  const handleCtaClick = () => {
    navigate('/sign-recognition');
  };

  // 处理"了解更多"按钮点击
  const handleSecondaryCtaClick = () => {
    // 滚动到功能区域
    const featureSection = document.querySelector('section.py-16.md\\:py-20');
    if (featureSection) {
      featureSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero区域 - 使用情感化HeroSection组件 */}
      <HeroSection
        title="让沟通无界限"
        subtitle="利用最先进的人工智能技术，为听障人士提供智能手语识别、语音处理和翻译服务，让每个人都能自由表达"
        ctaText="立即开始"
        secondaryCtaText="了解更多"
        badgeText="AI驱动的智能交流平台"
        gradientClass="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900"
        stats={[
          { value: '95%+', label: '识别准确率' },
          { value: '50ms', label: '响应速度' },
          { value: '20+', label: '支持语言' },
          { value: '10万+', label: '词汇量' },
        ]}
        showDecorations={true}
        onCtaClick={handleCtaClick}
        onSecondaryCtaClick={handleSecondaryCtaClick}
      />

      {/* 功能区域 */}
      <section className="py-16 md:py-20 lg:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          {/* 区域标题 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 md:mb-16"
          >
            <span className="inline-block px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium mb-4">
              强大的功能
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              全方位的<span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">智能交流</span>解决方案
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              我们提供全方位的智能交流解决方案，满足您的各种需求
            </p>
          </motion.div>

          {/* 功能卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {featureCards.map((card, index) => (
              <Link key={card.id} to={card.path} className="block">
                <FeatureCard
                  {...card}
                  delay={index * 0.1}
                  whileInView={true}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 优势区域 */}
      <section className="py-16 md:py-20 lg:py-24 px-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* 左侧内容 */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium mb-4">
                为什么选择我们？
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                用<span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">科技</span>连接心灵
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                我们专注于为听障人士提供最优质的交流体验，结合最先进的AI技术和人性化的设计理念，
                让每一次沟通都充满温度
              </p>

              {/* 优势列表 */}
              <div className="space-y-5 md:space-y-6">
                {advantages.map((advantage, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-4"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <advantage.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg md:text-xl font-bold mb-2 text-gray-900 dark:text-white">
                        {advantage.title}
                      </h4>
                      <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                        {advantage.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* 右侧图片 */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative order-first lg:order-last"
            >
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                {/* 背景装饰 */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 opacity-50" />
                
                {/* 内容 */}
                <div className="relative z-10 aspect-square rounded-2xl flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-center"
                  >
                    <div className="flex items-center justify-center space-x-3 md:space-x-4 mb-4 md:mb-6">
                      <Hand className="w-14 h-14 md:w-20 md:h-20 text-purple-500" />
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Heart className="w-12 h-12 md:w-16 md:h-16 text-pink-500 fill-current" />
                      </motion.div>
                      <Languages className="w-14 h-14 md:w-20 md:h-20 text-blue-500" />
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                      用爱连接世界
                    </p>
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-2">
                      让沟通无障碍，让声音无界限
                    </p>
                  </motion.div>
                </div>
              </div>

              {/* 装饰元素 */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-6 md:-top-8 -right-6 md:-right-8 w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full opacity-30"
              />
              
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute -bottom-4 -left-4 w-12 h-12 md:-bottom-6 md:-left-6 md:w-16 md:h-16 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-full opacity-30"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 使用流程区域 */}
      <section className="py-16 md:py-20 lg:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          {/* 区域标题 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 md:mb-16"
          >
            <span className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-4">
              使用流程
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              简单三步，<span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">开始体验</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              无需复杂设置，即可开始您的智能交流之旅
            </p>
          </motion.div>

          {/* 流程组件 */}
          <ProcessFlow steps={processSteps} activeStep={0} />
        </div>
      </section>

      {/* 用户评价区域 */}
      <section className="py-16 md:py-20 lg:py-24 px-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-blue-900/20">
        <div className="max-w-7xl mx-auto">
          {/* 区域标题 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 md:mb-16"
          >
            <span className="inline-block px-4 py-2 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full text-sm font-medium mb-4">
              用户反馈
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              听听他们的<span className="bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent">声音</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              来自真实用户的真诚反馈，是我们的最大动力
            </p>
          </motion.div>

          {/* 用户评价轮播 */}
          <TestimonialCarousel testimonials={testimonials} itemsPerPage={3} />
        </div>
      </section>

      {/* CTA区域 */}
      <section className="py-16 md:py-20 lg:py-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl md:rounded-[40px] p-8 md:p-12 lg:p-16 shadow-2xl relative overflow-hidden">
            {/* 背景装饰 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  rotate: [0, 90, 0],
                }}
                transition={{
                  duration: 15,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-2xl"
              />
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  rotate: [0, -90, 0],
                }}
                transition={{
                  duration: 12,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-2xl"
              />
            </div>

            {/* 内容 */}
            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="mb-6 md:mb-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-6">
                  <Heart className="w-8 h-8 md:w-10 md:h-10 text-white fill-current" />
                </div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 md:mb-6"
              >
                准备好开始了吗？
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="text-lg md:text-xl text-white/90 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed"
              >
                加入我们，体验前所未有的智能交流体验，让沟通无障碍，让声音无界限
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6"
              >
                <Link
                  to="/sign-recognition"
                  className={`
                    w-full sm:w-auto px-8 py-4 md:px-10 md:py-5
                    bg-white text-purple-600 rounded-full font-bold text-lg 
                    hover:shadow-2xl transition-all hover:scale-105
                    flex items-center justify-center space-x-2
                  `}
                >
                  <span>免费开始使用</span>
                  <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                </Link>
                
                <a
                  href="#features"
                  className={`
                    w-full sm:w-auto px-8 py-4 md:px-10 md:py-5
                    bg-transparent border-2 border-white text-white rounded-full font-bold text-lg 
                    hover:bg-white/10 transition-all hover:scale-105
                    flex items-center justify-center
                  `}
                >
                  了解更多
                </a>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default Home;