/**
 * Tracks whether the static PNG frame failed to load (404 or network).
 *
 * Pattern lifted from the lab `FrameStatic.tsx`: a local `useState`
 * flag flipped by an `<img onError>` handler. When `pngFailed` is
 * true, the consumer renders the SVG-only fallback chrome instead.
 *
 * Returned as a `[flag, handler]` tuple to keep destructuring cheap
 * at the call site.
 */

import { useCallback, useState } from 'react';

export interface CardFramePngStatus {
	pngFailed: boolean;
	handlePngError: () => void;
}

export function useCardFramePngStatus(): CardFramePngStatus {
	const [pngFailed, setPngFailed] = useState(false);
	const handlePngError = useCallback(() => setPngFailed(true), []);
	return { pngFailed, handlePngError };
}
