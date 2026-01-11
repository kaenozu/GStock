/**
 * AlertService - Browser notification system for trading signals
 * Phase 19: The Nervous System
 */

const SETTINGS_KEY = 'gstock_alert_settings';

export interface AlertSettings {
  enabled: boolean;
  soundEnabled: boolean;
  minConfidence: number; // Only alert if confidence >= this
}

const DEFAULT_SETTINGS: AlertSettings = {
  enabled: true,
  soundEnabled: false,
  minConfidence: 60,
};

export class AlertService {
  private static lastSignal: Map<string, string> = new Map();
  private static audioContext: AudioContext | null = null;
  
  /**
   * Request notification permission
   */
  static async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission === 'denied') {
      return false;
    }
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  /**
   * Check if notifications are available and permitted
   */
  static isAvailable(): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    return Notification.permission === 'granted';
  }
  
  /**
   * Get current alert settings
   */
  static getSettings(): AlertSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  
  /**
   * Save alert settings
   */
  static saveSettings(settings: Partial<AlertSettings>): void {
    if (typeof window === 'undefined') return;
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  }
  
  /**
   * Send alert for signal change
   * Only fires if signal changed from last known state
   */
  static async alert(params: {
    symbol: string;
    signal: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    price: number;
  }): Promise<boolean> {
    const settings = this.getSettings();
    
    if (!settings.enabled || !this.isAvailable()) {
      return false;
    }
    
    if (params.confidence < settings.minConfidence) {
      return false;
    }
    
    // Check if signal changed
    const lastSignal = this.lastSignal.get(params.symbol);
    const currentSignalKey = `${params.signal}-${params.confidence}`;
    
    if (lastSignal === currentSignalKey) {
      return false; // No change
    }
    
    // Only alert on actionable signals (BUY/SELL), not HOLD
    if (params.signal === 'HOLD') {
      this.lastSignal.set(params.symbol, currentSignalKey);
      return false;
    }
    
    this.lastSignal.set(params.symbol, currentSignalKey);
    
    // Create notification
    const icon = params.signal === 'BUY' ? '🟢' : '🔴';
    const title = `${icon} ${params.symbol}: ${params.signal}`;
    const body = `信頼度: ${params.confidence}% | 価格: $${params.price.toFixed(2)}`;
    
    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `gstock-${params.symbol}`, // Replace previous notification for same symbol
        requireInteraction: false,
      });
      
      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);
      
      // Play sound if enabled
      if (settings.soundEnabled) {
        this.playAlertSound(params.signal);
      }
      
      return true;
    } catch (error) {
      console.error('AlertService: Failed to create notification:', error);
      return false;
    }
  }
  
  /**
   * Play alert sound
   */
  private static playAlertSound(signal: 'BUY' | 'SELL' | 'HOLD'): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      
      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Different tones for BUY vs SELL
      oscillator.frequency.value = signal === 'BUY' ? 880 : 440; // A5 for BUY, A4 for SELL
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (error) {
      console.error('AlertService: Failed to play sound:', error);
    }
  }
  
  /**
   * Clear last signal cache (for testing)
   */
  static clearCache(): void {
    this.lastSignal.clear();
  }
}
