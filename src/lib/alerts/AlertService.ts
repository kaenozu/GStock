/**
 * AlertService - Browser notification system for trading signals
 * Phase 19: The Nervous System
 */

const SETTINGS_KEY = 'gstock_alert_settings';
const ALERT_HISTORY_KEY = 'gstock_alert_history';

export interface AlertSettings {
  enabled: boolean;
  soundEnabled: boolean;
  minConfidence: number; // Only alert if confidence >= this
  enablePriceAlerts: boolean;
  enableVolumeAlerts: boolean;
  enableEarningsAlerts: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
}

export interface AlertHistory {
  id: string;
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  timestamp: number;
  type: 'SIGNAL' | 'PRICE' | 'VOLUME' | 'EARNINGS';
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  enabled: boolean;
}

export interface VolumeAlert {
  id: string;
  symbol: string;
  thresholdMultiplier: number; // e.g., 2 for 2x average volume
  enabled: boolean;
}

const DEFAULT_SETTINGS: AlertSettings = {
  enabled: true,
  soundEnabled: false,
  minConfidence: 60,
  enablePriceAlerts: false,
  enableVolumeAlerts: false,
  enableEarningsAlerts: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
};

export class AlertService {
  private static lastSignal: Map<string, string> = new Map();
  private static audioContext: AudioContext | null = null;
  private static priceAlerts: Map<string, PriceAlert[]> = new Map();
  private static volumeAlerts: Map<string, VolumeAlert[]> = new Map();

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
   * Check if currently in quiet hours
   */
  static isQuietHours(): boolean {
    const settings = this.getSettings();
    if (!settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = settings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = settings.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      return currentTime >= startTime || currentTime < endTime;
    }
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
    
    if (!settings.enabled || !this.isAvailable() || this.isQuietHours()) {
      return false;
    }
    
    if (params.confidence < settings.minConfidence) {
      return false;
    }
    
    const lastSignal = this.lastSignal.get(params.symbol);
    const currentSignalKey = `${params.signal}-${params.confidence}`;
    
    if (lastSignal === currentSignalKey) {
      return false;
    }
    
    if (params.signal === 'HOLD') {
      this.lastSignal.set(params.symbol, currentSignalKey);
      return false;
    }
    
    this.lastSignal.set(params.symbol, currentSignalKey);
    
    const icon = params.signal === 'BUY' ? '🟢' : '🔴';
    const title = `${icon} ${params.symbol}: ${params.signal}`;
    const body = `信頼度: ${params.confidence}% | 価格: $${params.price.toFixed(2)}`;
    
    const notification = this.createNotification(title, body, params.symbol);
    
    this.addToHistory({
      id: Date.now().toString(),
      symbol: params.symbol,
      signal: params.signal,
      confidence: params.confidence,
      price: params.price,
      timestamp: Date.now(),
      type: 'SIGNAL'
    });
    
    if (notification && settings.soundEnabled) {
      this.playAlertSound(params.signal);
    }
    
    return notification !== null;
  }

  /**
   * Price alert management
   */
  static addPriceAlert(alert: Omit<PriceAlert, 'id'>): string {
    const id = Date.now().toString();
    const newAlert: PriceAlert = { ...alert, id };
    
    const alerts = this.priceAlerts.get(alert.symbol) || [];
    alerts.push(newAlert);
    this.priceAlerts.set(alert.symbol, alerts);
    
    return id;
  }

  static removePriceAlert(symbol: string, alertId: string): void {
    const alerts = this.priceAlerts.get(symbol) || [];
    this.priceAlerts.set(symbol, alerts.filter(a => a.id !== alertId));
  }

  static getPriceAlerts(symbol: string): PriceAlert[] {
    return this.priceAlerts.get(symbol) || [];
  }

  static checkPriceAlerts(symbol: string, currentPrice: number): void {
    const settings = this.getSettings();
    if (!settings.enablePriceAlerts || !settings.enabled) return;

    const alerts = this.getPriceAlerts(symbol);
    
    alerts.forEach(alert => {
      if (!alert.enabled) return;

      const triggered = alert.condition === 'ABOVE' 
        ? currentPrice >= alert.targetPrice
        : currentPrice <= alert.targetPrice;

      if (triggered) {
        this.createNotification(
          `📊 ${symbol} Price Alert`,
          `Price ${alert.condition === 'ABOVE' ? 'above' : 'below'} $${alert.targetPrice}`,
          symbol
        );
        
        alert.enabled = false;
        this.removePriceAlert(symbol, alert.id);
      }
    });
  }

  /**
   * Volume alert management
   */
  static addVolumeAlert(alert: Omit<VolumeAlert, 'id'>): string {
    const id = Date.now().toString();
    const newAlert: VolumeAlert = { ...alert, id };
    
    const alerts = this.volumeAlerts.get(alert.symbol) || [];
    alerts.push(newAlert);
    this.volumeAlerts.set(alert.symbol, alerts);
    
    return id;
  }

  static removeVolumeAlert(symbol: string, alertId: string): void {
    const alerts = this.volumeAlerts.get(symbol) || [];
    this.volumeAlerts.set(symbol, alerts.filter(a => a.id !== alertId));
  }

  static getVolumeAlerts(symbol: string): VolumeAlert[] {
    return this.volumeAlerts.get(symbol) || [];
  }

  static checkVolumeAlerts(symbol: string, currentVolume: number, avgVolume: number): void {
    const settings = this.getSettings();
    if (!settings.enableVolumeAlerts || !settings.enabled) return;

    const alerts = this.getVolumeAlerts(symbol);
    
    alerts.forEach(alert => {
      if (!alert.enabled) return;

      const threshold = avgVolume * alert.thresholdMultiplier;
      
      if (currentVolume >= threshold) {
        this.createNotification(
          `📈 ${symbol} Volume Alert`,
          `Volume ${alert.thresholdMultiplier}x average: ${currentVolume.toLocaleString()}`,
          symbol
        );
        
        alert.enabled = false;
        this.removeVolumeAlert(symbol, alert.id);
      }
    });
  }

  /**
   * Earnings alert
   */
  static async earningsAlert(symbol: string, earningsDate: string, epsEstimate: number | null): Promise<void> {
    const settings = this.getSettings();
    if (!settings.enableEarningsAlerts || !settings.enabled) return;

    const title = `📅 ${symbol} Earnings`;
    let body = `Earnings on ${earningsDate}`;
    
    if (epsEstimate) {
      body += ` | EPS Estimate: $${epsEstimate.toFixed(2)}`;
    }

    this.createNotification(title, body, symbol);
  }
  
  /**
   * Create notification with common settings
   */
  private static createNotification(title: string, body: string, symbol: string): Notification | null {
    if (!this.isAvailable() || this.isQuietHours()) {
      return null;
    }
    
    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `gstock-${symbol}`,
        requireInteraction: false,
      });
      
      setTimeout(() => notification.close(), 10000);
      return notification;
    } catch (error) {
      console.error('AlertService: Failed to create notification:', error);
      return null;
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
      
      oscillator.frequency.value = signal === 'BUY' ? 880 : 440;
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
   * Alert history management
   */
  private static addToHistory(alert: AlertHistory): void {
    if (typeof window === 'undefined') return;
    
    try {
      const history = this.getAlertHistory();
      history.unshift(alert);
      
      const maxHistory = 100;
      const trimmedHistory = history.slice(0, maxHistory);
      
      localStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('AlertService: Failed to save alert history:', error);
    }
  }

  static getAlertHistory(): AlertHistory[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(ALERT_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static clearAlertHistory(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ALERT_HISTORY_KEY);
  }
  
  /**
   * Clear last signal cache (for testing)
   */
  static clearCache(): void {
    this.lastSignal.clear();
  }

  /**
   * Reset all alerts
   */
  static resetAll(): void {
    this.lastSignal.clear();
    this.priceAlerts.clear();
    this.volumeAlerts.clear();
  }
}
