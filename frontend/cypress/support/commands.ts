/**
 * Cypress 自定义命令
 */

// 登录命令
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/api/v1/auth/login`,
    body: {
      username,
      password
    }
  }).then((response) => {
    const token = response.body.token;
    window.localStorage.setItem('authToken', token);
  });
});

// 登出命令
Cypress.Commands.add('logout', () => {
  window.localStorage.removeItem('authToken');
});

// 上传文件命令
Cypress.Commands.add('uploadFile', (fileName: string, fileType: string) => {
  cy.fixture(fileName).then((fileContent) => {
    cy.get('[type="file"]').attachFile({
      fileContent,
      fileName,
      mimeType: fileType
    });
  });
});

// Mock API 响应命令
Cypress.Commands.add('mockApiResponse', (endpoint: string, response: any) => {
  cy.intercept('GET', endpoint, {
    statusCode: 200,
    body: response
  }).as('mockResponse');
});

// 等待 WebSocket 连接命令
Cypress.Commands.add('waitForWebSocket', (timeout: number = 10000) => {
  cy.window({ timeout }).should((win: any) => {
    expect(win.webSocketService).to.exist;
    expect(win.webSocketService.isConnected()).to.be.true;
  });
});

// 模拟摄像头命令
Cypress.Commands.add('mockCamera', () => {
  cy.window().then((win: any) => {
    const mockStream = {
      getVideoTracks: () => [{
        stop: () => {}
      }],
      getAudioTracks: () => []
    };
    
    cy.stub(win.navigator.mediaDevices, 'getUserMedia').callsFake(() => {
      return Promise.resolve(mockStream);
    });
  });
});

// 模拟麦克风命令
Cypress.Commands.add('mockMicrophone', () => {
  cy.window().then((win: any) => {
    const mockStream = {
      getVideoTracks: () => [],
      getAudioTracks: () => [{
        stop: () => {}
      }]
    };
    
    cy.stub(win.navigator.mediaDevices, 'getUserMedia').callsFake(() => {
      return Promise.resolve(mockStream);
    });
  });
});

// 等待加载完成命令
Cypress.Commands.add('waitForLoad', (timeout: number = 10000) => {
  cy.get('[data-testid*="loading"]', { timeout, log: false }).should('not.exist');
});

// 点击带防抖的元素命令
Cypress.Commands.add('clickDebounced', { prevSubject: 'element' }, (subject, options = {}) => {
  cy.wrap(subject).click();
  cy.wait(100); // 等待防抖时间
  return cy.wrap(subject);
});

// 检查元素是否可见并可交互
Cypress.Commands.add('shouldBeInteractable', { prevSubject: 'element' }, (subject) => {
  cy.wrap(subject)
    .should('be.visible')
    .and('not.be.disabled')
    .and('not.be.css', 'pointer-events', 'none');
});

// 等待动画完成
Cypress.Commands.add('waitForAnimation', (timeout: number = 2000) => {
  cy.wait(timeout);
});

// 截图对比命令（用于视觉回归测试）
Cypress.Commands.add('compareScreenshot', (name: string) => {
  cy.screenshot(name, { capture: 'viewport' });
});

// 检查网络请求
Cypress.Commands.add('checkNetworkRequest', (method: string, url: string) => {
  cy.intercept(method, url).as('request');
});

// 等待特定请求完成
Cypress.Commands.add('waitForRequest', (alias: string) => {
  cy.wait(`@${alias}`);
});

// 清除所有 Mock
Cypress.Commands.add('clearAllMocks', () => {
  cy.window().then((win: any) => {
    if (win.localStorage) {
      win.localStorage.clear();
    }
    if (win.sessionStorage) {
      win.sessionStorage.clear();
    }
  });
});

// 类型声明
declare global {
  namespace Cypress {
    interface Chainable {
      login(username: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      uploadFile(fileName: string, fileType: string): Chainable<void>;
      mockApiResponse(endpoint: string, response: any): Chainable<void>;
      waitForWebSocket(timeout?: number): Chainable<void>;
      mockCamera(): Chainable<void>;
      mockMicrophone(): Chainable<void>;
      waitForLoad(timeout?: number): Chainable<void>;
      clickDebounced(options?: any): Chainable<JQuery<HTMLElement>>;
      shouldBeInteractable(): Chainable<JQuery<HTMLElement>>;
      waitForAnimation(timeout?: number): Chainable<void>;
      compareScreenshot(name: string): Chainable<void>;
      checkNetworkRequest(method: string, url: string): Chainable<void>;
      waitForRequest(alias: string): Chainable<any>;
      clearAllMocks(): Chainable<void>;
    }
  }
}