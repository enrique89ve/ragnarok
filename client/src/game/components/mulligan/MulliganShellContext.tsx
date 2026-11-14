import { createContext, useContext, useMemo, type ReactNode } from 'react';

export const MULLIGAN_EXIT_IRIS_OWNER = {
	viewport: 'viewport',
	screen: 'screen',
} as const;

export type MulliganExitIrisOwner =
	(typeof MULLIGAN_EXIT_IRIS_OWNER)[keyof typeof MULLIGAN_EXIT_IRIS_OWNER];

export type MulliganShellValue = {
	readonly exitIrisOwner: MulliganExitIrisOwner;
};

const SCREEN_SHELL: MulliganShellValue = {
	exitIrisOwner: MULLIGAN_EXIT_IRIS_OWNER.screen,
};

const MulliganShellContext = createContext<MulliganShellValue>(SCREEN_SHELL);

export type MulliganShellProviderProps = {
	readonly exitIrisOwner: MulliganExitIrisOwner;
	readonly children: ReactNode;
};

/** Tells the decision screen whether the viewport plate already owns the exit iris. */
export const MulliganShellProvider = ({
	exitIrisOwner,
	children,
}: MulliganShellProviderProps) => {
	const value = useMemo<MulliganShellValue>(
		() => ({ exitIrisOwner }),
		[exitIrisOwner],
	);
	return (
		<MulliganShellContext.Provider value={value}>
			{children}
		</MulliganShellContext.Provider>
	);
};

export const useMulliganShell = (): MulliganShellValue => useContext(MulliganShellContext);
