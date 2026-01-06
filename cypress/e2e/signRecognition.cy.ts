/**
 * 手语识别流程 E2E 测试
 */

describe('手语识别流程测试', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('应该显示手语识别页面', () => {
    cy.contains('Sign Recognition', { matchCase: false }).should('be.visible');
  });

  it('应该启动相机进行手部检测', () => {
    cy.get('[data-testid="camera-start-button"]').click();
    
    // 模拟摄像头权限授予
    // 测试相机元素可见
    cy.get('[data-testid="camera-view"]').should('be.visible');
  });

  it('应该正确显示检测到的手势', () => {
    cy.get('[data-testid="camera-start-button"]').click();
    
    // 等待手部检测开始
    cy.get('[data-testid="camera-view"]').should('be.visible');
    
    // 模拟手部检测结果
    cy.get('[data-testid="sign-result"]').should('exist');
  });

  it('应该显示手势识别的置信度', () => {
    cy.get('[data-testid="camera-start-button"]').click();
    
    cy.get('[data-testid="confidence-indicator"]').should('be.visible');
  });

  it('应该能够停止相机', () => {
    cy.get('[data-testid="camera-start-button"]').click();
    cy.get('[data-testid="camera-stop-button"]').click();
    
    cy.get('[data-testid="camera-view"]').should('not.be.visible');
  });

  it('应该正确显示识别到的手语文本', () => {
    cy.get('[data-testid="camera-start-button"]').click();
    
    // 等待识别完成
    cy.get('[data-testid="sign-text-result"]', { timeout: 10000 }).should('exist');
  });

  it('应该支持多种手势的识别', () => {
    const gestures = ['你好', '谢谢', '再见', '爱', '世界'];
    
    cy.get('[data-testid="camera-start-button"]').click();
    
    cy.wrap(gestures).each((gesture) => {
      cy.contains(gesture, { timeout: 5000 }).should('be.visible');
    });
  });
});