import {
	gameEffectCoordinator,
	type GameEffectHandle,
	type GameEffectPriority,
} from '@/game/effects/core/gameEffectCoordinator';
import {
	resolvePresentationTargetElement,
	targetEntityId,
} from '@/game/effects/presentation/EffectTargetResolver';
import type { LocalFxPrimitive, PresentationTarget } from '@/game/effects/presentation/types';

const LOCAL_FX_DURATION_MS: Record<LocalFxPrimitive, number> = {
	'impact-light': 220,
	'impact-normal': 300,
	'impact-heavy': 420,
	'white-flash': 180,
	shine: 520,
	'shield-flash': 360,
};

const LOCAL_FX_CLASS: Record<LocalFxPrimitive, string> = {
	'impact-light': 'card-fx--impact-light',
	'impact-normal': 'card-fx--impact-normal',
	'impact-heavy': 'card-fx--impact-heavy',
	'white-flash': 'card-fx--white-flash',
	shine: 'card-fx--shine',
	'shield-flash': 'card-fx--shield-flash',
};

const localFxOwners = new WeakMap<HTMLElement, Map<string, symbol>>();

function completedHandle(): GameEffectHandle {
	return { cancel() {}, onComplete: Promise.resolve() };
}

function fxHost(element: HTMLElement): HTMLElement {
	return element.querySelector<HTMLElement>('.card-frame')
		?? element.closest<HTMLElement>('.card-frame')
		?? element;
}

function removeOwnedClass(host: HTMLElement, className: string, owner: symbol): void {
	const owners = localFxOwners.get(host);
	if (owners?.get(className) !== owner) return;
	host.classList.remove(className);
	owners.delete(className);
	if (owners.size === 0) localFxOwners.delete(host);
}

export function playLocalFx(
	target: PresentationTarget,
	primitive: LocalFxPrimitive,
	priority: GameEffectPriority = 'normal',
): GameEffectHandle {
	const element = resolvePresentationTargetElement(target);
	if (!element) return completedHandle();

	const host = fxHost(element);
	const className = host.classList.contains('card-frame')
		? LOCAL_FX_CLASS[primitive]
		: `combat-fx-target--${primitive}`;
	const durationMs = LOCAL_FX_DURATION_MS[primitive];
	const owner = Symbol(className);
	const owners = localFxOwners.get(host) ?? new Map<string, symbol>();
	owners.set(className, owner);
	localFxOwners.set(host, owners);
	// CSS animations do not restart when the class is already present. Remove
	// and force a layout boundary before re-adding it so repeated impacts on the
	// same target always produce a fresh reaction.
	host.classList.remove(className);
	void host.offsetWidth;
	host.classList.add(className);

	const scheduled = gameEffectCoordinator.schedule({
		owner: 'visual-impact',
		lane: 'card-fx',
		key: `${targetEntityId(target)}:${primitive}`,
		priority,
		delayMs: durationMs,
		run: () => removeOwnedClass(host, className, owner),
	});

	return {
		cancel: () => {
			scheduled.cancel();
			removeOwnedClass(host, className, owner);
		},
		onComplete: scheduled.onComplete,
	};
}

export function combineEffectHandles(handles: readonly GameEffectHandle[]): GameEffectHandle {
	const completions = handles
		.map(handle => handle.onComplete)
		.filter((completion): completion is Promise<void> => completion !== undefined);
	return {
		cancel: () => handles.forEach(handle => handle.cancel()),
		onComplete: Promise.all(completions).then(() => undefined),
	};
}
