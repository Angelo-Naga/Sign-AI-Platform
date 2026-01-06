/**
 * Cypress E2E 测试辅助文件
 */

// 导入 commands
import './commands';

// 全局配置
Cypress.on('uncaught:exception', (err, runnable) => {
  // 返回 false 防止 Cypress 失败
  // 可以在特定场景下忽略某些错误
  return false;
});

// 全局 hook
beforeEach(() => {
  // 每个 test 之前清空 localStorage
  cy.clearLocalStorage();

  // 清空 cookies
  cy.clearCookies();
});

afterEach(() => {
  // 每个 test 之后截图
  cy.screenshot({ capture: 'viewport' });
});

// 全局配置
declare global {
  namespace Cypress {
    interface Chainable {
      login(username: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      uploadFile(fileName: string, fileType: string): Chainable<void>;
      mockApiResponse(endpoint: string, response: any): Chainable<void>;
    }
  }
}