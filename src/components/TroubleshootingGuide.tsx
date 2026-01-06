/**
 * 故障排除指南组件
 * 提供摄像头问题的诊断和解决方案
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  CameraOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Globe,
  Wrench,
  HelpCircle,
  X,
} from 'lucide-react';

interface TroubleshootingGuideProps {
  onClose: () => void;
  openSection?: string;
}

interface TroubleshootingSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  severity: 'high' | 'medium' | 'low';
  solutions: string[];
}

const SECTIONS: TroubleshootingSection[] = [
  {
    id: 'permission',
    title: '摄像头权限问题',
    icon: <Shield className="w-6 h-6" />,
    severity: 'high',
    solutions: [
      '点击浏览器地址栏左侧的锁图标或信息图标',
      '在弹出的菜单中找到"摄像头"选项',
      '将摄像头权限设置为"允许"',
      '刷新页面重新加载',
      '如果仍无法解决，尝试在浏览器设置中清除缓存并重启浏览器',
    ],
  },
  {
    id: 'device',
    title: '设备连接问题',
    icon: <CameraOff className="w-6 h-6" />,
    severity: 'high',
    solutions: [
      '检查摄像头物理连接是否牢固',
      '尝试更换USB接口连接摄像头',
      '确认摄像头没有被其他应用程序占用（如腾讯会议、Zoom等）',
      '在设备管理器中检查摄像头驱动是否正常',
      '尝试重新插拔摄像头或重启计算机',
      '如果是外接摄像头，尝试连接到其他电脑测试是否正常工作',
    ],
  },
  {
    id: 'https',
    title: 'HTTPS访问限制',
    icon: <Globe className="w-6 h-6" />,
    severity: 'high',
    solutions: [
      '浏览器要求摄像头访问必须在HTTPS环境下',
      '如果是在本地开发，请使用 localhost 或 127.0.0.1 访问',
      '如果已部署的生产环境，请配置SSL证书使用HTTPS协议',
      '临时测试可在Chrome启动时添加 --unsafely-treat-insecure-origin-as-secure 参数（仅限开发测试）',
      '建议使用 ngrok 等工具创建本地HTTPS隧道进行测试',
    ],
  },
  {
    id: 'browser',
    title: '浏览器兼容性',
    icon: <AlertTriangle className="w-6 h-6" />,
    severity: 'medium',
    solutions: [
      '推荐使用 Chrome 90+、Firefox 88+、Edge 90+ 或 Safari 14+',
      'Safari 需要额外配置摄像头权限（系统偏好设置 > 安全性与隐私）',
      '如果使用Firefox，确保在 about:config 中启用了媒体设备',
      '更新浏览器到最新版本',
      '禁用浏览器插件（尤其是隐私保护类插件）后重试',
    ],
  },
  {
    id: 'driver',
    title: '驱动程序问题',
    icon: <Wrench className="w-6 h-6" />,
    severity: 'medium',
    solutions: [
      '在设备管理器中展开"照相机"或"图像设备"，查看摄像头状态',
      '如果有黄色感叹号，右键选择"更新驱动程序"',
      '如果更新无效，尝试卸载设备后重新安装驱动',
      '访问摄像头制造商官网下载最新驱动程序',
      'Windows用户可使用 Windows设备管理器自动搜索驱动更新',
    ],
  },
  {
    id: 'other',
    title: '其他常见问题',
    icon: <HelpCircle className="w-6 h-6" />,
    severity: 'low',
    solutions: [
      '检查系统防火墙或杀毒软件是否阻止了摄像头访问',
      '确保计算机的物理隐私开关没有被关闭',
      '如果是笔记本电脑，确认没有使用Fn键禁用了摄像头',
      '检查摄像头是否被其他用户或其他程序独占使用',
      '尝试使用命令提示符重启Windows摄像头服务(net stop UsoSvc && net start UsoSvc)',
    ],
  },
];

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    case 'medium':
      return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
    case 'low':
      return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
    default:
      return 'border-gray-500';
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'high':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'medium':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'low':
      return <CheckCircle className="w-5 h-5 text-blue-500" />;
    default:
      return <HelpCircle className="w-5 h-5 text-gray-500" />;
  }
};

export const TroubleshootingGuide: React.FC<TroubleshootingGuideProps> = ({ onClose, openSection }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(openSection ? [openSection] : ['permission'])
  );

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(SECTIONS.map(s => s.id)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* 标题 */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">故障排除指南</h2>
              <p className="text-blue-100 text-sm">
                按照以下步骤解决摄像头访问问题
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={expandAll}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              展开全部
            </button>
            <button
              onClick={collapseAll}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              收起全部
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-4">
          {SECTIONS.map((section) => {
            const isExpanded = expandedSections.has(section.id);

            return (
              <motion.div
                key={section.id}
                layout
                className={`border-l-4 ${getSeverityColor(section.severity)} rounded-lg overflow-hidden`}
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-4 flex items-center justify-between text-left bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {getSeverityIcon(section.severity)}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {section.title}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {section.solutions.length} 个解决方案
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-gray-50 dark:bg-slate-700/50">
                        <ol className="space-y-3">
                          {section.solutions.map((solution, index) => (
                            <motion.li
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-start space-x-3"
                            >
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-semibold">
                                {index + 1}
                              </span>
                              <span className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                                {solution}
                              </span>
                            </motion.li>
                          ))}
                        </ol>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* 底部提示 */}
        <div className="border-t border-gray-200 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <HelpCircle className="w-4 h-4" />
            <span>
              如果以上方法都无法解决问题，请尝试使用演示模式体验产品功能
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TroubleshootingGuide;