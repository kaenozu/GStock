/**
 * Safe locale formatting utilities
 * Handles environments where locale may not be available
 */

export function safeToLocaleTimeString(date: Date): string {
  try {
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  } catch {
    // Fallback for environments without locale support
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
}

export function safeToLocaleDateString(date: Date): string {
  try {
    return date.toLocaleDateString('ja-JP');
  } catch {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}/${m}/${d}`;
  }
}

export function safeNumberFormat(num: number): string {
  try {
    return num.toLocaleString('ja-JP');
  } catch {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}
