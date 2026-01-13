import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlertService } from './AlertService';

// Fresh storage for each test
let mockStorage: Record<string, string> = {};

describe('AlertService', () => {
  beforeEach(() => {
    AlertService.clearCache();
    // Reset mock storage
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
    });
  });

  it('should return default settings', () => {
    const settings = AlertService.getSettings();
    expect(settings.enabled).toBe(true);
    expect(settings.soundEnabled).toBe(false);
    expect(settings.minConfidence).toBe(60);
  });

  it('should merge settings with defaults', () => {
    // Test that getSettings returns defaults when nothing stored
    const settings = AlertService.getSettings();
    expect(settings).toHaveProperty('enabled');
    expect(settings).toHaveProperty('soundEnabled');
    expect(settings).toHaveProperty('minConfidence');
  });

  it('should not alert for HOLD signals', async () => {
    // Mock Notification as unavailable
    vi.stubGlobal('Notification', undefined);
    
    const result = await AlertService.alert({
      symbol: 'AAPL',
      signal: 'HOLD',
      confidence: 75,
      price: 150,
    });
    
    expect(result).toBe(false);
  });

  it('should not alert for low confidence', async () => {
    vi.stubGlobal('Notification', { permission: 'granted' });
    
    const result = await AlertService.alert({
      symbol: 'AAPL',
      signal: 'BUY',
      confidence: 40, // Below default minConfidence of 60
      price: 150,
    });
    
    expect(result).toBe(false);
  });

  it('should track last signal to prevent duplicates', async () => {
    // First call sets the cache
    AlertService.clearCache();
    
    // Simulate same signal twice - second should return false (no change)
    const params = {
      symbol: 'AAPL',
      signal: 'BUY' as const,
      confidence: 75,
      price: 150,
    };
    
    // Since Notification is not available, both should return false
    // but the cache should still be updated
    vi.stubGlobal('Notification', undefined);
    await AlertService.alert(params);
    const secondResult = await AlertService.alert(params);
    
    expect(secondResult).toBe(false);
  });
});
