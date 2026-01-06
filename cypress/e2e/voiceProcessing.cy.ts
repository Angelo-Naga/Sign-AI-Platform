/**
 * 语音处理流程 E2E 测试
 */

describe('语音处理流程测试', () => {
  beforeEach(() => {
    cy.visit('/voice');
  });

  it('应该显示语音处理页面', () => {
    cy.contains('Voice Processing', { matchCase: false }).should('be.visible');
  });

  it('应该显示录音按钮', () => {
    cy.get('[data-testid="record-button"]').should('be.visible');
    cy.get('[data-testid="record-button"]').should('not.be.disabled');
  });

  it('应该能够开始录音', () => {
    cy.get('[data-testid="record-button"]').click();
    
    // 检查录音状态
    cy.get('[data-testid="record-button"]').should('have.class', 'recording');
    cy.get('[data-testid="recording-indicator"]').should('be.visible');
  });

  it('应该能够停止录音', () => {
    cy.get('[data-testid="record-button"]').click();
    cy.wait(1000);
    
    cy.get('[data-testid="stop-button"]').click();
    
    // 检查录音停止状态
    cy.get('[data-testid="record-button"]').should('not.have.class', 'recording');
    cy.get('[data-testid="recording-indicator"]').should('not.be.visible');
  });

  it('应该显示音频波形', () => {
    cy.get('[data-testid="record-button"]').click();
    cy.wait(1000);
    cy.get('[data-testid="stop-button"]').click();
    
    // 检查波形显示
    cy.get('[data-testid="waveform-display"]').should('be.visible');
  });

  it('应该显示转录结果', () => {
    // 模拟录音和转录
    cy.get('[data-testid="record-button"]').click();
    cy.wait(2000);
    cy.get('[data-testid="stop-button"]').click();
    
    // 等待转录完成
    cy.get('[data-testid="transcription-result"]', { timeout: 15000 }).should('exist');
    cy.get('[data-testid="transcription-text"]').should('not.be.empty');
  });

  it('应该支持播放录制的音频', () => {
    // 录制音频
    cy.get('[data-testid="record-button"]').click();
    cy.wait(1000);
    cy.get('[data-testid="stop-button"]').click();
    
    // 播放音频
    cy.get('[data-testid="play-button"]').click();
    cy.get('[data-testid="play-button"]').should('have.class', 'playing');
  });

  it('应该支持语音情感分析', () => {
    cy.get('[data-testid="record-button"]').click();
    cy.wait(2000);
    cy.get('[data-testid="stop-button"]').click();
    
    // 显示情感分析结果
    cy.get('[data-testid="emotion-result"]', { timeout: 10000 }).should('exist');
  });
});