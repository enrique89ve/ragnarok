import { debug } from '../../config/debugConfig';
import { subscribeAllVisualEvents } from './emitter';
import type { VisualEvent, VisualEventMap, VisualEventType } from './events';

export interface EffectHandle {
	cancel(): void;
	onComplete?: Promise<void>;
}

export type VisualEffectHandler<T extends VisualEventType = VisualEventType> = (
	event: VisualEventMap[T]
) => EffectHandle | null;

export type VisualEffectUnregister = () => void;

export const VISUAL_EVENT_TYPES: readonly VisualEventType[] = [
	'phaseEntered',
	'communityCardRevealed',
	'bettingAction',
	'handRankAnnounced',
	'showdownDamage',
	'ragnarokTriggered',
	'streakAnnounced',
	'handImproved',
	'spellCast',
	'wagerActivated',
];

const REGISTRY_EMITTER_PRIORITY = 100;

interface ActiveVisualEffectEntry {
	eventId: string;
	eventType: VisualEventType;
	handle: EffectHandle;
}

const handlers = new Map<VisualEventType, VisualEffectHandler>();
const warnedEventTypes = new Set<VisualEventType>();
let activeEffects: ActiveVisualEffectEntry[] = [];
let emitterSubscription: (() => void) | null = null;

function ensureEmitterSubscription(): void {
	if (emitterSubscription) return;
	emitterSubscription = subscribeAllVisualEvents(dispatchVisualEvent, REGISTRY_EMITTER_PRIORITY);
}

function releaseEmitterSubscriptionIfIdle(): void {
	if (emitterSubscription && handlers.size === 0) {
		emitterSubscription();
		emitterSubscription = null;
	}
}

function warnUnhandledVisualEvent(eventType: VisualEventType): void {
	if (warnedEventTypes.has(eventType)) return;
	warnedEventTypes.add(eventType);
	debug.warn(
		`[VisualEffectRegistry] No handler registered for VisualEvent type "${eventType}" ` +
			'- visual effect skipped. Register one with registerVisualEffect().'
	);
}

function removeActiveVisualEffect(entry: ActiveVisualEffectEntry): void {
	activeEffects = activeEffects.filter(candidate => candidate !== entry);
}

function trackActiveVisualEffect(eventId: string, eventType: VisualEventType, handle: EffectHandle): void {
	const entry: ActiveVisualEffectEntry = { eventId, eventType, handle };
	activeEffects.push(entry);
	if (handle.onComplete) {
		handle.onComplete.then(
			() => removeActiveVisualEffect(entry),
			error => {
				removeActiveVisualEffect(entry);
				debug.error(`[VisualEffectRegistry] Effect "${eventType}" (${eventId}) completion failed:`, error);
			}
		);
	}
}

function dispatchVisualEvent(event: VisualEvent): void {
	const handler = handlers.get(event.type);
	if (!handler) {
		warnUnhandledVisualEvent(event.type);
		return;
	}
	let handle: EffectHandle | null;
	try {
		handle = handler(event);
	} catch (error) {
		debug.error(`[VisualEffectRegistry] Handler error for ${event.type}:`, error);
		return;
	}
	if (handle) {
		trackActiveVisualEffect(event.id, event.type, handle);
	}
}

export function registerVisualEffect<T extends VisualEventType>(
	eventType: T,
	handler: VisualEffectHandler<T>
): VisualEffectUnregister {
	if (handlers.has(eventType)) {
		debug.warn(`[VisualEffectRegistry] Replacing existing handler for "${eventType}".`);
	}
	handlers.set(eventType, handler as VisualEffectHandler);
	ensureEmitterSubscription();
	return () => {
		if (handlers.get(eventType) === (handler as VisualEffectHandler)) {
			handlers.delete(eventType);
		}
		releaseEmitterSubscriptionIfIdle();
	};
}

export function cancelAllActiveVisualEffects(): void {
	const pending = activeEffects;
	activeEffects = [];
	for (const entry of pending) {
		try {
			entry.handle.cancel();
		} catch (error) {
			debug.error(`[VisualEffectRegistry] Cancel failed for "${entry.eventType}" (${entry.eventId}):`, error);
		}
	}
}

export function getActiveVisualEffectHandles(): readonly EffectHandle[] {
	return activeEffects.map(entry => entry.handle);
}

export function getRegisteredVisualEffectTypes(): readonly VisualEventType[] {
	return Array.from(handlers.keys());
}

export function registerVisualEffectDebugLogger(): VisualEffectUnregister {
	const unregisterFns = VISUAL_EVENT_TYPES.map(eventType =>
		registerVisualEffect(eventType, event => {
			debug.log(`[VisualEffectRegistry:test] ${event.type} event=${event.id}`);
			return null;
		})
	);
	return () => {
		for (const unregister of unregisterFns) {
			unregister();
		}
	};
}

export function resetVisualEffectRegistry(): void {
	cancelAllActiveVisualEffects();
	handlers.clear();
	warnedEventTypes.clear();
	releaseEmitterSubscriptionIfIdle();
}
