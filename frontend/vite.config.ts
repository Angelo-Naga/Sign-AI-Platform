/**
 * Vite 性能优化配置
 * 包含代码分割、懒加载、构建优化和资源压缩
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 路径别名配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
      '@styles': path.resolve(__dirname, './src/styles'),
    }
  },

  // 开发服务器配置
  server: {
    port: 3001,
    host: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  },

  // 生产构建优化
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    
    rollupOptions: {
      output: {
        // 手动代码分割
        manualChunks: (id: string) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('three')) {
              return 'three-vendor';
            }
            return 'vendor';
          }
          
          if (id.includes('pages')) {
            return 'pages';
          }
          
          if (id.includes('components')) {
            return 'components';
          }
        },
        
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo: any) => {
          if (/\.(png|jpe?g|gif|svg|webp|ico)/i.test(assetInfo.name)) {
            return `images/[name]-[hash].[ext]`;
          }
          if (/\.(woff2?|eot|ttf|otf)/i.test(assetInfo.name)) {
            return `fonts/[name]-[hash].[ext]`;
          }
          return `assets/[name]-[hash].[ext]`;
        }
      }
    },
    
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        unused: true,
        dead_code: true,
      },
      format: {
        comments: false
      }
    },
    
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    assetsInlineLimit: 4096
  },

  // 依赖优化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      'axios'
    ],
    exclude: [
      'hls.js'
    ]
  },

  // CSS 配置
  css: {
    modules: {
      localsConvention: 'camelCase',
      scopeBehaviour: 'local'
    }
  },

  // esbuild 配置
  esbuild: {
    drop: ['console', 'debugger'],
    minify: ({} as any),
    target: 'es2015'
  }
});