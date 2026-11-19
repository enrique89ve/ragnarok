import { debug } from '../../config/debugConfig';
import type { VisualEvent, VisualEventMap, VisualEventType } from './events';

export type VisualEventUnsubscribe = () => void;

interface VisualEventSubscriptionEntry {
	id: string;
	eventType: VisualEventType | '*';
	handler: (event: VisualEvent) => void;
	priority: number;
}

let subscriptions: VisualEventSubscriptionEntry[] = [];
let rendererEnabled = true;
let generation = 0;
let subscriptionIdCounter = 0;

export function setVisualEventRendererEnabled(enabled: boolean): void {
	if (!enabled) discardPendingVisualEvents();
	rendererEnabled = enabled;
}

export function isVisualEventRendererEnabled(): boolean {
	return rendererEnabled;
}

export function discardPendingVisualEvents(): void {
	generation++;
}

export function emitVisualEvent(event: VisualEvent): void {
	if (!rendererEnabled) return;
	const emittedIn = generation;
	const matching = subscriptions.filter(entry => entry.eventType === event.type || entry.eventType === '*');
	for (const entry of matching) {
		// Finish the command (including P2P bookkeeping) before any renderer runs.
		// Each subscriber starts independently even when another never completes.
		void Promise.resolve().then(() => {
			if (generation === emittedIn && subscriptions.includes(entry)) return entry.handler(event);
		}).catch(error => debug.error(`[VisualEventEmitter] Handler error for ${event.type}:`, error));
	}
}

function addSubscription(
	eventType: VisualEventType | '*',
	handler: (event: VisualEvent) => void,
	priority: number
): VisualEventUnsubscribe {
	subscriptionIdCounter += 1;
	const entry: VisualEventSubscriptionEntry = {
		id: `vfx-sub_${Date.now()}_${subscriptionIdCounter}`,
		eventType,
		handler,
		priority,
	};
	subscriptions.push(entry);
	subscriptions.sort((a, b) => b.priority - a.priority);
	return () => {
		subscriptions = subscriptions.filter(candidate => candidate.id !== entry.id);
	};
}

export function subscribeVisualEvent<T extends VisualEventType>(
	eventType: T,
	handler: (event: VisualEventMap[T]) => void,
	priority = 0
): VisualEventUnsubscribe {
	return addSubscription(eventType, handler as (event: VisualEvent) => void, priority);
}

export function subscribeAllVisualEvents(
	handler: (event: VisualEvent) => void,
	priority = 0
): VisualEventUnsubscribe {
	return addSubscription('*', handler, priority);
}
