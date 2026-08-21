import React from 'react';

interface ScorchingBurstIconProps extends React.SVGProps<SVGSVGElement> {
	size?: number;
}

const SCORCHING_BURST_POWER_IDS = new Set([
	'erik-flameheart-power',
	'erik-flameheart-power-upgraded',
]);

/**
 * Inline SVG for Erik's Scorching Burst.
 *
 * Construction surface: flat inline SVG on the existing game UI layer.
 * Source authority: Ragnarok's fire/ember tokens through currentColor.
 * Visual job: read as a hot impact (flame silhouette + inner ember) at 16–24px.
 * The geometry is self-contained: no external assets, filters, masks, or IDs.
 */
export const ScorchingBurstIcon: React.FC<ScorchingBurstIconProps> = ({
	size = 20,
	className,
	...props
}) => (
	<svg
		{...props}
		className={className}
		viewBox="0 0 24 24"
		width={size}
		height={size}
		fill="none"
		aria-hidden="true"
		focusable="false"
	>
		{/* Angular sparks establish the burst before the eye lands on the flame. */}
		<path
			d="M4.5 5.5 6 8.5M19.5 5.5 18 8.5M3 13.5l3.5.5M21 13.5l-3.5.5"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			opacity=".72"
		/>
		{/* Dominant flame silhouette: a rising, asymmetric impact rather than a generic bolt. */}
		<path
			d="M12 2.5c.5 2.5-.5 4-2 5.5-1.5 1.5-2.5 3-2.5 5a4.5 4.5 0 0 0 9 0c0-1.5-.5-2.5-1.5-4 0 1.5-.5 2.5-1.5 3.5.5-3-1-5-1-7.5 0-1 0-2 0-2.5Z"
			fill="currentColor"
		/>
		{/* Hot core keeps the fire read legible when the icon is scaled down. */}
		<path
			d="M12 10c1 1.5 2 2.5 2 4a2 2 0 1 1-4 0c0-1 .5-2 2-4Z"
			fill="var(--scorching-core, var(--gold-100, #fff3c4))"
			opacity=".95"
		/>
	</svg>
);

export function isScorchingBurstPower(powerId?: string): boolean {
	return powerId !== undefined && SCORCHING_BURST_POWER_IDS.has(powerId);
}

export default ScorchingBurstIcon;
