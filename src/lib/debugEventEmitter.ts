// Debug event emitter singleton for the debug panel

import { DebugEvent, DebugEventType } from '@/types/debug';

type DebugEventListener = (event: DebugEvent) => void;

class DebugEventEmitter {
  private listeners: Set<DebugEventListener> = new Set();
  private events: DebugEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events
  private enabled = false;

  constructor() {
    // Enable debug events only in development mode
    this.enabled = import.meta.env.DEV;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  subscribe(listener: DebugEventListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(type: DebugEventType, data: any): void {
    if (!this.enabled) return;

    const event: DebugEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      data,
    };

    // Add to events array
    this.events.push(event);

    // Trim old events if we exceed max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in debug event listener:', error);
      }
    });
  }

  getEvents(): DebugEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
    this.emit('system_event', {
      event: 'debug_logs_cleared',
      details: 'All debug logs have been cleared',
    });
  }

  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }
}

// Export singleton instance
export const debugEvents = new DebugEventEmitter();
