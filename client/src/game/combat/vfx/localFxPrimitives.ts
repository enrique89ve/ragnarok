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

function completedHandle(): GameEffectHandle {
	return { cancel() {}, onComplete: Promise.resolve() };
}

function fxHost(element: HTMLElement): HTMLElement {
	return element.querySelector<HTMLElement>('.card-frame')
		?? element.closest<HTMLElement>('.card-frame')
		?? element;
}

export function playLocalFx(
	target: PresentationTarget,
	primitive: LocalFxPrimitive,
	key: string,
	priority: GameEffectPriority = 'normal',
): GameEffectHandle {
	const element = resolvePresentationTargetElement(target);
	if (!element) return completedHandle();

	const host = fxHost(element);
	const className = host.classList.contains('card-frame')
		? LOCAL_FX_CLASS[primitive]
		: `combat-fx-target--${primitive}`;
	const durationMs = LOCAL_FX_DURATION_MS[primitive];
	host.classList.add(className);

	const scheduled = gameEffectCoordinator.schedule({
		owner: 'visual-impact',
		lane: 'card-fx',
		key: `${key}:${targetEntityId(target)}:${primitive}`,
		priority,
		delayMs: durationMs,
		run: () => host.classList.remove(className),
	});

	return {
		cancel: () => {
			scheduled.cancel();
			host.classList.remove(className);
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
