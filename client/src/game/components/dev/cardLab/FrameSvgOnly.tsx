/**
 * Direction 1 — SVG only.
 *
 * Pure vector frame around the art. No CSS animations, no PixiJS, no
 * keyframes. This is the baseline we A/B everything else against.
 *
 * Geometry: 5:7 portrait (280x400 internal), inner art container 90%.
 * Rarity color drives the outer stroke + corner ornaments; element
 * drives the inner gradient band.
 */

import React, { useMemo } from 'react';
import { getRarityColor } from '../../../utils/rarityUtils';
import type { Rarity } from '@shared/schemas/rarity';
import type { NorseElement } from '../../../types/NorseTypes';
import type { SimpleCardType } from '../../SimpleCard';
import { ELEMENT_BAND } from '../../../utils/art/elementBand';

interface Props {
	card: { id: number; name: string; manaCost?: number; attack?: number; health?: number };
	rarity: Rarity;
	element: NorseElement;
	cardType: SimpleCardType;
	artPath: string;
}

const FRAME_W = 280;
const FRAME_H = 400;
const STROKE_W = 4;

export const FrameSvgOnly: React.FC<Props> = ({ card, rarity, element, cardType, artPath }) => {
	const stroke = getRarityColor(rarity);
	const band = ELEMENT_BAND[element];

	const cornerPath = useMemo(() => {
		const r = 14;
		const s = STROKE_W;
		// Right-angle corner ornament paths (top-left, top-right, bottom-right, bottom-left)
		return [
			`M ${s + r} ${s} H ${s + r * 2} V ${s + r}`,
			`M ${FRAME_W - s - r * 2} ${s} H ${FRAME_W - s - r} V ${s + r}`,
			`M ${FRAME_W - s - r} ${FRAME_H - s - r} H ${FRAME_W - s - r * 2} V ${FRAME_H - s - r * 2 + r}`,
			`M ${s + r} ${FRAME_H - s} H ${s + r * 2} V ${FRAME_H - s - r}`,
		];
	}, []);

	return (
		<svg
			viewBox={`0 0 ${FRAME_W} ${FRAME_H}`}
			width={FRAME_W}
			height={FRAME_H}
			role="img"
			aria-label={`${card.name} — ${rarity} ${cardType}, ${element} variant, SVG-only frame`}
			className="cardlab-frame"
		>
			<defs>
				<linearGradient id={`band-${element}-${rarity}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={band.from} stopOpacity="0.0" />
					<stop offset="0.7" stopColor={band.from} stopOpacity="0.55" />
					<stop offset="1" stopColor={band.to} stopOpacity="0.95" />
				</linearGradient>
				<linearGradient id={`stroke-${rarity}`} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor={stroke} />
					<stop offset="1" stopColor={stroke} stopOpacity="0.55" />
				</linearGradient>
				<clipPath id={`clip-${element}-${rarity}`}>
					<rect x={STROKE_W + 6} y={STROKE_W + 6} width={FRAME_W - (STROKE_W + 6) * 2} height={FRAME_H - (STROKE_W + 6) * 2} rx="10" />
				</clipPath>
			</defs>

			{/* Outer rarity-tinted frame */}
			<rect
				x={STROKE_W / 2}
				y={STROKE_W / 2}
				width={FRAME_W - STROKE_W}
				height={FRAME_H - STROKE_W}
				rx="14"
				fill="var(--rarity-common-bg)"
				stroke={`url(#stroke-${rarity})`}
				strokeWidth={STROKE_W}
			/>

			{/* Element-tinted bottom band */}
			<rect
				x={STROKE_W + 4}
				y={FRAME_H - 80}
				width={FRAME_W - (STROKE_W + 4) * 2}
				height="74"
				fill={`url(#band-${element}-${rarity})`}
			/>

			{/* Art — clipped to inner rect */}
			<image
				href={artPath}
				x={STROKE_W + 6}
				y={STROKE_W + 6}
				width={FRAME_W - (STROKE_W + 6) * 2}
				height={FRAME_H - (STROKE_W + 6) * 2}
				preserveAspectRatio="xMidYMid slice"
				clipPath={`url(#clip-${element}-${rarity})`}
			/>

			{/* Corner ornaments */}
			{cornerPath.map((d, i) => (
				<path
					key={i}
					d={d}
					stroke={stroke}
					strokeWidth="2"
					fill="none"
					strokeLinecap="round"
				/>
			))}

			{/* Mana gem (top-left) */}
			<g transform={`translate(${STROKE_W + 14}, ${STROKE_W + 14})`}>
				<circle r="14" fill="var(--obsidian-900)" stroke={stroke} strokeWidth="2" />
				<text
					textAnchor="middle"
					dominantBaseline="central"
					fontSize="16"
					fontFamily="var(--font-display)"
					fill="var(--rarity-mythic-bright)"
				>
					{card.manaCost ?? 0}
				</text>
			</g>

			{/* Type + name strip (bottom) */}
			<g transform={`translate(0, ${FRAME_H - 64})`}>
				<rect
					x={STROKE_W + 10}
					y="0"
					width={FRAME_W - (STROKE_W + 10) * 2}
					height="54"
					rx="6"
					fill="var(--surface-overlay-deep)"
				/>
				<text
					x={FRAME_W / 2}
					y="20"
					textAnchor="middle"
					fontFamily="var(--font-display)"
					fontSize="14"
					letterSpacing="0.18em"
					fill={stroke}
				>
					{cardType.toUpperCase()}
				</text>
				<text
					x={FRAME_W / 2}
					y="42"
					textAnchor="middle"
					fontFamily="var(--font-sans)"
					fontSize="13"
					fill="var(--text-near-white)"
				>
					{card.name}
				</text>
			</g>

			{/* Attack / Health (top-right) for minion-like cards */}
			{(cardType === 'minion' || cardType === 'hero' || cardType === 'armor') && (
				<g transform={`translate(${FRAME_W - STROKE_W - 28}, ${STROKE_W + 14})`}>
					<polygon points="0,-12 12,0 0,12 -12,0" fill="var(--rarity-rare-deep)" stroke={stroke} strokeWidth="1.5" />
					<text textAnchor="middle" dominantBaseline="central" fontSize="14" fontFamily="var(--font-display)" fill="var(--rarity-rare-bright)">
						{card.attack ?? 0}
					</text>
				</g>
			)}
		</svg>
	);
};
