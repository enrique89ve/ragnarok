export type CardMotionValues = {
	x?: number;
	y?: number;
	rotate?: number;
	scale: number;
	durationMs?: number;
	ease?: string;
};

export function applyCardMotion(element: HTMLElement, motion: CardMotionValues): void {
	element.setAttribute('data-card-motion', '');
	element.style.setProperty('--card-motion-x', `${motion.x ?? 0}px`);
	element.style.setProperty('--card-motion-y', `${motion.y ?? 0}px`);
	element.style.setProperty('--card-motion-rotate', `${motion.rotate ?? 0}deg`);
	element.style.setProperty('--card-motion-scale', String(motion.scale));
	element.style.setProperty(
		'--card-motion-duration',
		`${motion.durationMs ?? 150}ms`,
	);
	if (motion.ease !== undefined) {
		element.style.setProperty('--card-motion-ease', motion.ease);
	}
	element.style.removeProperty('transform');
}

/** Stamp/remove a cast class on the frame and its nearest motion host. */
export function stampCardMotionClass(
	element: HTMLElement,
	className: 'is-casting' | 'is-activating',
	active: boolean,
): void {
	element.classList.toggle(className, active);
	const motionHost = element.closest<HTMLElement>('[data-card-motion], .bf-card-wrapper');
	if (motionHost !== null && motionHost !== element) {
		motionHost.classList.toggle(className, active);
	}
}
