import { useEffect, useState } from 'react';
import { MULLIGAN_LOL } from './mulliganLolTiming';
import {
	MULLIGAN_EXIT_IRIS_EVENT,
	MULLIGAN_EXIT_IRIS_PHASE,
	reduceMulliganExitIris,
	type MulliganExitIrisPhase,
} from './mulliganExitIris';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export type MulliganExitIrisState = {
	readonly covered: boolean;
	readonly irisOpen: boolean;
};

const readPrefersReducedMotion = (): boolean =>
	typeof window !== 'undefined'
	&& typeof window.matchMedia === 'function'
	&& window.matchMedia(REDUCED_MOTION_QUERY).matches;

const phaseAfterRelease = (
	phase: MulliganExitIrisPhase,
	active: boolean,
	motionEnabled: boolean,
): MulliganExitIrisPhase => {
	if (active) return phase;
	const motion = motionEnabled && !readPrefersReducedMotion();
	return reduceMulliganExitIris(phase, MULLIGAN_EXIT_IRIS_EVENT.release, motion);
};

/** Hold the obsidian cover, then play at most one iris after `active` drops. */
export const useMulliganExitIris = (
	active: boolean,
	motionEnabled: boolean,
): MulliganExitIrisState => {
	const [phase, setPhase] = useState<MulliganExitIrisPhase>(
		active ? MULLIGAN_EXIT_IRIS_PHASE.covered : MULLIGAN_EXIT_IRIS_PHASE.closed,
	);
	const [seenActive, setSeenActive] = useState(active);

	if (active !== seenActive) {
		setSeenActive(active);
		if (active) {
			setPhase(current => reduceMulliganExitIris(
				current,
				MULLIGAN_EXIT_IRIS_EVENT.activate,
				true,
			));
		}
	}

	useEffect(() => {
		const next = phaseAfterRelease(phase, active, motionEnabled);
		if (next === phase) return;
		setPhase(next);
	}, [active, motionEnabled, phase]);

	useEffect(() => {
		if (phase !== MULLIGAN_EXIT_IRIS_PHASE.iris) return;
		const timer = window.setTimeout(() => {
			setPhase(current => reduceMulliganExitIris(
				current,
				MULLIGAN_EXIT_IRIS_EVENT.irisFinished,
				true,
			));
		}, MULLIGAN_LOL.irisOpenMs);
		return () => window.clearTimeout(timer);
	}, [phase]);

	return {
		covered: phase !== MULLIGAN_EXIT_IRIS_PHASE.closed,
		irisOpen: phase === MULLIGAN_EXIT_IRIS_PHASE.iris,
	};
};
