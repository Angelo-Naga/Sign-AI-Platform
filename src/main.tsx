/**
 * 主应用入口文件
 * 初始化React应用并配置全局设置
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';

console.log('[SignAI] main.tsx 开始加载');

/**
 * 移除加载动画（立即执行，不依赖页面事件）
 */
const removeLoading = () => {
  console.log('[SignAI] 正在移除加载动画...');
  const loadingElement = document.getElementById('__loading__');
  if (loadingElement) {
    loadingElement.style.opacity = '0';
    console.log('[SignAI] 加载动画淡出');
    setTimeout(() => {
      loadingElement.remove();
      console.log('[SignAI] 加载动画已移除');
    }, 300);
  } else {
    console.log('[SignAI] 未找到加载动画元素');
  }
};

/**
 * 创建根容器
 */
try {
  console.log('[SignAI] 创建React根容器');
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('未找到 #root 元素');
  }
  
  const root = createRoot(rootElement);
  console.log('[SignAI] React根容器创建成功');

  /**
   * 渲染应用
   */
  console.log('[SignAI] 开始渲染React应用');
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          containerStyle={{}}
          toastOptions={{
            duration: 4000,
            style: {
              background: 'white',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            },
            success: {
              style: {
                background: '#10b981',
                color: 'white',
              },
              iconTheme: {
                primary: 'white',
                secondary: '#34d399',
              },
            },
            error: {
              style: {
                background: '#ef4444',
                color: 'white',
              },
              iconTheme: {
                primary: 'white',
                secondary: '#f87171',
              },
            },
            loading: {
              style: {
                background: '#6366f1',
                color: 'white',
              },
            },
          }}
        />
      </BrowserRouter>
    </React.StrictMode>
  );
  
  console.log('[SignAI] React应用渲染完成');
  
  // 在React渲染后立即移除加载动画
  setTimeout(() => {
    removeLoading();
  }, 100);
  
} catch (error) {
  console.error('[SignAI] React应用挂载失败:', error);
  // 即使出错也要移除加载动画，避免页面卡住
  removeLoading();
}

// 全局错误捕获
window.addEventListener('error', (event) => {
  console.error('[SignAI] 全局错误:', event.error);
  removeLoading();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[SignAI] 未处理的Promise拒绝:', event.reason);
  removeLoading();
});