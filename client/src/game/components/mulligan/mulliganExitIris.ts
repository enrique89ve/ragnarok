/** One chamber exit. The viewport plate owns it whenever that plate is up. */

export const MULLIGAN_EXIT_IRIS_PHASE = {
	closed: 'closed',
	covered: 'covered',
	iris: 'iris',
} as const;

export type MulliganExitIrisPhase =
	(typeof MULLIGAN_EXIT_IRIS_PHASE)[keyof typeof MULLIGAN_EXIT_IRIS_PHASE];

export const MULLIGAN_EXIT_IRIS_EVENT = {
	activate: 'activate',
	release: 'release',
	irisFinished: 'iris-finished',
} as const;

export type MulliganExitIrisEvent =
	(typeof MULLIGAN_EXIT_IRIS_EVENT)[keyof typeof MULLIGAN_EXIT_IRIS_EVENT];

export const reduceMulliganExitIris = (
	phase: MulliganExitIrisPhase,
	event: MulliganExitIrisEvent,
	motionEnabled: boolean,
): MulliganExitIrisPhase => {
	switch (event) {
		case MULLIGAN_EXIT_IRIS_EVENT.activate:
			return MULLIGAN_EXIT_IRIS_PHASE.covered;
		case MULLIGAN_EXIT_IRIS_EVENT.irisFinished:
			return phase === MULLIGAN_EXIT_IRIS_PHASE.iris
				? MULLIGAN_EXIT_IRIS_PHASE.closed
				: phase;
		case MULLIGAN_EXIT_IRIS_EVENT.release:
			if (phase !== MULLIGAN_EXIT_IRIS_PHASE.covered) return phase;
			return motionEnabled
				? MULLIGAN_EXIT_IRIS_PHASE.iris
				: MULLIGAN_EXIT_IRIS_PHASE.closed;
		default: {
			const unreachable: never = event;
			return unreachable;
		}
	}
};
