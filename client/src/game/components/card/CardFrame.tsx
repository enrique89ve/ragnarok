/**
 * <CardFrame> — scaffold (commit (a) of the unification rollout).
 *
 * THIS COMMIT: types + sizing table + PNG-status hook only.
 * Renders a placeholder root <div> with the resolved dimensions so the
 * skeleton compiles, type-checks, and can be imported by callers. The
 * PNG + SVG layers and the slot children land in commit (b).
 *
 * Why a skeleton-first commit: keeps the diff scannable, lets us land
 * the public type surface (consumers can write their migration sites
 * against it) before the rendering implementation is finalized, and
 * follows the project's commit-cadence discipline.
 */

import React from 'react';
import type { CardFrameProps } from './types';
import { resolveCardDims } from './sizing';

const CardFrame: React.FC<CardFrameProps> = ({
	shape = 'tile',
	rarity,
	element,
	size = 'medium',
	render = 'png',
	disablePng = false,
	onClick,
	overrideWidth,
	overrideHeight,
	children,
	className,
	style,
	...rest
}) => {
	const dims = resolveCardDims({ shape, size, overrideWidth, overrideHeight });
	const effectiveRender = disablePng ? 'svg' : render;

	const classes = [
		'card-frame',
		`card-frame--${shape}`,
		`card-frame--rarity-${rarity}`,
		`card-frame--render-${effectiveRender}`,
		className ?? '',
	].filter(Boolean).join(' ');

	return (
		<div
			className={classes}
			data-rarity={rarity}
			data-element={element}
			data-render={effectiveRender}
			style={{
				position: 'relative',
				width: dims.width,
				height: dims.height,
				aspectRatio: dims.aspectRatio,
				...style,
			}}
			onClick={onClick}
			{...rest}
		>
			{children}
		</div>
	);
};

export default CardFrame;
export { CardFrame };
