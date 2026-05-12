/**
 * RunicSigils — inline SVG primitives for the Runic Forge layer.
 *
 * Pure presentational components. They map onto CSS classes from
 * `client/src/styles/ornaments.css` and stay aria-hidden because they
 * carry no semantic content.
 */

import React from 'react';

export type Tier = 'standard' | 'premium' | 'mythic' | 'obsidian';

interface SigilBackplateProps {
	tier?: Tier;
	className?: string;
}

/**
 * Runic ring backplate. Place inside a `.sigil-host` next to a hex-frame.
 * The ring rotates slowly (60s) and brightens on host hover.
 */
export function SigilBackplate({ tier = 'obsidian', className }: SigilBackplateProps) {
	const cls = ['sigil-backplate', `sigil-backplate--${tier}`, className].filter(Boolean).join(' ');
	return (
		<svg className={cls} viewBox="0 0 200 200" aria-hidden="true">
			<circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" />
			<circle cx="100" cy="100" r="74" fill="none" stroke="currentColor" strokeWidth="0.5" />
			<g stroke="currentColor" strokeWidth="1" strokeLinecap="round">
				<line x1="100" y1="6" x2="100" y2="20" />
				<line x1="100" y1="180" x2="100" y2="194" />
				<line x1="6" y1="100" x2="20" y2="100" />
				<line x1="180" y1="100" x2="194" y2="100" />
				<line x1="33" y1="33" x2="43" y2="43" />
				<line x1="157" y1="33" x2="167" y2="43" />
				<line x1="33" y1="167" x2="43" y2="157" />
				<line x1="157" y1="167" x2="167" y2="157" />
			</g>
			<circle cx="100" cy="100" r="56" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.6" />
		</svg>
	);
}

/**
 * Single ornate corner mark. The corner SVG is drawn pointing top-left;
 * positional classes (`ornate-corner--tl/tr/bl/br`) rotate it into place.
 */
function OrnateCornerMark({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
	return (
		<svg className={`ornate-corner ornate-corner--${position}`} viewBox="0 0 32 32" aria-hidden="true">
			{/* outer L */}
			<path d="M0 32 L0 0 L32 0" fill="none" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.55" />
			{/* inner L offset 4px */}
			<path d="M4 32 L4 4 L32 4" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.35" />
			{/* apex diamond — rotated square at the corner */}
			<rect x="-3" y="-3" width="6" height="6" transform="rotate(45 0 0)" fill="currentColor" opacity="0.7" />
		</svg>
	);
}

/**
 * Renders all four ornate corners. Drop inside any `.ornate-corners-host`.
 */
export function OrnateCorners() {
	return (
		<>
			<OrnateCornerMark position="tl" />
			<OrnateCornerMark position="tr" />
			<OrnateCornerMark position="bl" />
			<OrnateCornerMark position="br" />
		</>
	);
}

interface NumericRitualProps {
	tier?: 'gold' | 'bifrost' | 'ember';
	className?: string;
	children: React.ReactNode;
}

/**
 * Wraps a numeric value in a ritual frame (thin gold rules left + right).
 * Children should be a `.numeric-display` span (or similar).
 */
export function NumericRitual({ tier = 'gold', className, children }: NumericRitualProps) {
	const cls = ['numeric-ritual', `numeric-ritual--${tier}`, className].filter(Boolean).join(' ');
	return (
		<span className={cls}>
			<span className="numeric-ritual-rule" aria-hidden="true" />
			{children}
			<span className="numeric-ritual-rule" aria-hidden="true" />
		</span>
	);
}
