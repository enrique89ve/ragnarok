/**
 * <CardRarityMark> — slot: compact rarity symbol.
 *
 * The animated border carries rarity color at full size, but combat
 * cards need a small HUD-like symbol that remains visible when the
 * frame is scaled down.
 */

import React from 'react';
import { useCardFrame } from '../CardFrameContext';
import type { Rarity } from '@shared/schemas/rarity';
import { getRarityChromeFaq } from '../cardChromeFaq';

export type CardRarityMarkProps = {
	readonly className?: string;
};

const CardRarityMark: React.FC<CardRarityMarkProps> = ({ className = '' }) => {
	const { rarity } = useCardFrame();
	const markerShape = getRarityMarkerShape(rarity);
	const faq = getRarityChromeFaq(rarity);

	return (
		<div
			className={['card-frame__rarity-mark', 'card-frame__chrome-faq', className].filter(Boolean).join(' ')}
			data-rarity={rarity}
			data-marker-shape={markerShape}
			data-chrome-faq={faq}
			aria-label={faq}
		>
			<svg viewBox="0 0 44 16" focusable="false" aria-hidden="true">
				<path
					className="card-frame__rarity-marker-socket-shadow"
					d="M2.8 8H11.6L15.8 4.4H28.2L32.4 8H41.2L37.8 10.3H32L28.1 13.1H15.9L12 10.3H6.2Z"
				/>
				<path
					className="card-frame__rarity-marker-socket-wing"
					d="M4.2 8.1H12.6L16.3 5.1H27.7L31.4 8.1H39.8L37.2 9.7H30.9L27.3 12.3H16.7L13.1 9.7H6.8Z"
				/>
				<path
					className="card-frame__rarity-marker-socket-ridge"
					d="M6.2 7.6H12.3L16.1 4.8H27.9L31.7 7.6H37.8M6.2 9.6H12.1L16.1 12.2H27.9L31.9 9.6H37.8"
				/>
				<path
					className="card-frame__rarity-marker-socket-plate"
					d="M16.2 5.2H27.8L31.1 8.1L27.8 11H16.2L12.9 8.1Z"
				/>
				<path
					className="card-frame__rarity-marker-socket-glint"
					d="M16.8 5.8H27.2M16.8 10.4H27.2"
				/>
				{markerShape === 'diamond' && <DiamondShape />}
				{markerShape === 'rhombus' && <RhombusShape />}
				{markerShape === 'triangle' && <TriangleShape />}
				{markerShape === 'hexagon' && <HexagonShape />}
			</svg>
		</div>
	);
};

(CardRarityMark as React.FC & { displayName?: string }).displayName = 'CardRarityMark';

export default CardRarityMark;

function getRarityMarkerShape(rarity: Rarity): 'diamond' | 'rhombus' | 'triangle' | 'hexagon' {
	if (rarity === 'mythic') return 'diamond';
	if (rarity === 'epic') return 'rhombus';
	if (rarity === 'rare') return 'triangle';
	return 'hexagon';
}

function DiamondShape() {
	return (
		<>
			<path className="card-frame__rarity-marker-shape-shadow" d="M22 3 27 7.5 24.6 12.7H19.4L17 7.5Z" />
			<path className="card-frame__rarity-marker-shape-core" d="M22 4.1 25.3 7.8 23.7 11.7H20.3L18.7 7.8Z" />
			<path className="card-frame__rarity-marker-shape-facet" d="M22 4.1 23.4 7.8 22 11.7 20.6 7.8Z" />
			<path className="card-frame__rarity-marker-shape-line" d="M18.7 7.8h6.6M20.6 7.8 20.3 11.7M23.4 7.8 23.7 11.7" />
		</>
	);
}

function RhombusShape() {
	return (
		<>
			<path className="card-frame__rarity-marker-shape-shadow" d="M22 3.5 27.2 8 22 12.5 16.8 8Z" />
			<path className="card-frame__rarity-marker-shape-core" d="M22 4.6 25.4 8 22 11.4 18.6 8Z" />
			<path className="card-frame__rarity-marker-shape-facet" d="M22 4.6 23.2 8 22 11.4 20.8 8Z" />
			<path className="card-frame__rarity-marker-shape-line" d="M18.6 8h6.8M20.8 8 22 11.4M23.2 8 22 11.4" />
		</>
	);
}

function TriangleShape() {
	return (
		<>
			<path className="card-frame__rarity-marker-shape-shadow" d="M22 3.8 27 12.2H17Z" />
			<path className="card-frame__rarity-marker-shape-core" d="M22 5.2 25.4 11H18.6Z" />
			<path className="card-frame__rarity-marker-shape-facet" d="M22 5.2 23 11H21Z" />
			<path className="card-frame__rarity-marker-shape-line" d="M22 5.2v5.8M18.6 11l3.4-2.7 3.4 2.7" />
		</>
	);
}

function HexagonShape() {
	return (
		<>
			<path className="card-frame__rarity-marker-shape-shadow" d="M22 3.8 26.1 5.9V10.1L22 12.2 17.9 10.1V5.9Z" />
			<path className="card-frame__rarity-marker-shape-core" d="M22 5.1 24.7 6.5V9.5L22 10.9 19.3 9.5V6.5Z" />
			<path className="card-frame__rarity-marker-shape-facet" d="M22 5.1 23.1 6.5V9.5L22 10.9 20.9 9.5V6.5Z" />
			<path className="card-frame__rarity-marker-shape-line" d="M19.3 6.5h5.4M19.3 9.5h5.4M22 5.1v5.8" />
		</>
	);
}
