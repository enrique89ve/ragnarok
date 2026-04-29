/**
 * HiveEvents - Event Broadcasting (Core 5 Only)
 * 
 * Simple event emitter for real-time state sync.
 * Focused on the 5 core on-chain data types.
 * 
 */

import { HiveMatchResult } from './schemas/HiveTypes';

export type HiveEventType =
  | 'match:ended'
  | 'card:transferred'
  | 'token:updated'
  | 'transaction:confirmed'
  | 'transaction:failed';

export interface TransactionConfirmedPayload {
  trxId: string;
}

export interface TransactionFailedPayload {
  trxId?: string;
  errorMessage: string;
}

export interface HiveEvent<T = unknown> {
  type: HiveEventType;
  payload: T;
  timestamp: number;
}

type EventCallback<T = unknown> = (event: HiveEvent<T>) => void;

class HiveEventEmitter {
  private listeners: Map<HiveEventType | '*', Set<EventCallback>> = new Map();

  on<T = unknown>(eventType: HiveEventType | '*', callback: EventCallback<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback as EventCallback);
    
    return () => {
      this.listeners.get(eventType)?.delete(callback as EventCallback);
    };
  }

  emit<T = unknown>(type: HiveEventType, payload: T): void {
    const event: HiveEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
    };

    this.listeners.get(type)?.forEach((cb) => cb(event as HiveEvent));
    this.listeners.get('*')?.forEach((cb) => cb(event as HiveEvent));
  }

  emitMatchEnded(result: HiveMatchResult): void {
    this.emit('match:ended', result);
  }

  emitCardTransferred(cardUid: string, from: string, to: string): void {
    this.emit('card:transferred', { cardUid, from, to });
  }

  emitTokenUpdate(token: string, amount: number, change: number): void {
    this.emit('token:updated', { token, amount, change });
  }

  emitTransactionConfirmed(payload: TransactionConfirmedPayload): void {
    this.emit('transaction:confirmed', payload);
  }

  emitTransactionFailed(payload: TransactionFailedPayload): void {
    this.emit('transaction:failed', payload);
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

export const hiveEvents = new HiveEventEmitter();
