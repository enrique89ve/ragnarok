import {
	captureVisualSnapshot,
	presentationTargetForEntityId,
} from '@/game/effects/presentation/EffectTargetResolver';

export function damageFloaterPositionForEntity(
	targetId: string,
): { readonly x: number; readonly y: number } | null {
	const target = presentationTargetForEntityId(targetId);
	const snapshot = captureVisualSnapshot(target);
	if (!snapshot) return null;

	if (target.type === 'hero') {
		return {
			x: snapshot.rect.left + snapshot.rect.width * 1.02,
			y: snapshot.rect.top + snapshot.rect.height * 0.7,
		};
	}

	return {
		x: snapshot.center.x,
		y: snapshot.rect.top + snapshot.rect.height * 0.32,
	};
}