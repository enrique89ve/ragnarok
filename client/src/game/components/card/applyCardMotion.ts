export type CardMotionValues = {
	x?: number;
	y?: number;
	rotate?: number;
	scale: number;
};

export function applyCardMotion(element: HTMLElement, motion: CardMotionValues): void {
	element.setAttribute('data-card-motion', '');
	element.style.setProperty('--card-motion-x', `${motion.x ?? 0}px`);
	element.style.setProperty('--card-motion-y', `${motion.y ?? 0}px`);
	element.style.setProperty('--card-motion-rotate', `${motion.rotate ?? 0}deg`);
	element.style.setProperty('--card-motion-scale', String(motion.scale));
	element.style.removeProperty('transform');
}
