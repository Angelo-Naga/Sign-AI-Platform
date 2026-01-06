/**
 * Cypress E2E 测试配置
 */

import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // 实现 node 事件监听器
      return config;
    },
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    excludeSpecPattern: ['**/*.spec.ts'],
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    pageLoadTimeout: 60000,
    trashAssetsBeforeRuns: true,
    chromeWebSecurity: false,
    experimentalWebKitSupport: true,
    env: {
      apiUrl: 'http://localhost:8000',
      wsUrl: 'ws://localhost:8000/ws'
    }
  },

  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite'
    },
    specPattern: 'src/**/__tests__/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts'
  }
});