/**
 * <CardArt> — slot: card illustration.
 *
 * Render first child, fill the art-layer, z-index 0. If `src` is
 * missing or fails after automatic retries, the fallback panel renders
 * instead so cards never display raw broken-image `alt` text.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useCardFrame } from '../CardFrameContext';

export interface CardArtProps {
	src?: string;
	alt: string;
	loading?: 'lazy' | 'eager';
	fetchPriority?: 'high' | 'low' | 'auto';
}

const RETRY_DELAYS_MS = [350, 1200] as const;

export function buildRetrySrc(src: string, attempt: number): string {
	if (attempt <= 0 || src.startsWith('data:') || src.startsWith('blob:')) {
		return src;
	}
	const separator = src.includes('?') ? '&' : '?';
	return `${src}${separator}r=${attempt}`;
}

const CardArt: React.FC<CardArtProps> = ({
	src,
	alt,
	loading = 'lazy',
	fetchPriority = 'auto',
}) => {
	const { shape } = useCardFrame();
	const [retryAttempt, setRetryAttempt] = useState(0);
	const [permanentlyFailed, setPermanentlyFailed] = useState(false);
	const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (retryTimerRef.current) {
			clearTimeout(retryTimerRef.current);
			retryTimerRef.current = null;
		}
		setRetryAttempt(0);
		setPermanentlyFailed(false);
		return () => {
			if (retryTimerRef.current) {
				clearTimeout(retryTimerRef.current);
				retryTimerRef.current = null;
			}
		};
	}, [src]);

	const handleError = () => {
		if (!src) return;
		if (retryAttempt >= RETRY_DELAYS_MS.length) {
			setPermanentlyFailed(true);
			return;
		}
		const delayMs = RETRY_DELAYS_MS[retryAttempt];
		if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
		retryTimerRef.current = setTimeout(() => {
			retryTimerRef.current = null;
			setRetryAttempt((prev) => prev + 1);
		}, delayMs);
	};

	if (!src || permanentlyFailed) {
		return (
			<div className="card-frame__art-fallback" data-shape={shape}>
				<span>{alt}</span>
			</div>
		);
	}

	const resolvedSrc = buildRetrySrc(src, retryAttempt);

	return (
		<img
			className="card-frame__art"
			src={resolvedSrc}
			alt={alt}
			loading={retryAttempt > 0 ? 'eager' : loading}
			decoding="async"
			fetchPriority={retryAttempt > 0 ? 'high' : fetchPriority}
			onError={handleError}
		/>
	);
};

export default CardArt;
CardArt.displayName = 'CardArt';
