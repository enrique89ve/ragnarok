/**
 * CardChromeIconsSVG — filled stave marks for card chrome.
 *
 * Elder Futhark silhouettes, not generic weather icons. Paths stay
 * thick and filled so they hold at 20-28px. currentColor tints them.
 */

import React from 'react';
import type { NorseElement } from '../../types/NorseTypes';
import { NORSE_ELEMENTS } from '../../types/NorseTypes';

type IconProps = React.SVGProps<SVGSVGElement>;

const svgBase: IconProps = {
	xmlns: 'http://www.w3.org/2000/svg',
	viewBox: '0 0 24 24',
	width: '1em',
	height: '1em',
	fill: 'currentColor',
	stroke: 'none',
};

/** Kenaz — torch / fire. Angular open chevron. */
export const IconElementFire: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M6 2.5h4.2L18.8 12 10.2 21.5H6L14.4 12 6 2.5z" />
	</svg>
);

/** Laguz — water / lake. Vertical stave with a falling hook. */
export const IconElementWater: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M8 2h4.4v13.2L18.6 9.8l2.6 3.2-9 6.8V22H8V2z" />
	</svg>
);

/** Othala — inherited land / earth. Lozenge homestead. */
export const IconElementGrass: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 2.2 21 11.2l-3.2 3.2L12 8.6 6.2 14.4 3 11.2 12 2.2zm-5.4 13.2 5.4 5.4 5.4-5.4-2.3-2.3-3.1 3.1-3.1-3.1-2.3 2.3z" />
	</svg>
);

/** Algiz — elk / protection / wind. Forked rising stave. */
export const IconElementElectric: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M10 21.5V10.4L4.2 4.6 7 1.8 12 6.8l5-5 2.8 2.8-5.8 5.8v11.1H10z" />
	</svg>
);

/** Sowilo — sun. Two-stroke lightning sun stave. */
export const IconElementLight: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M8.2 2h8.6L10.4 10.2H17L7.2 22l1.8-8.2H6.4L8.2 2z" />
	</svg>
);

/** Hagalaz — hail / disruption / shadow. Barred H stave. */
export const IconElementDark: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M4 2h4.2v7.2L15.8 2H20v20h-4.2v-7.2L8.2 22H4V2z" />
	</svg>
);

/** Isa — ice. Single ice stave with a locked crossbar. */
export const IconElementIce: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M10 2h4v6.2h4.6v3.6H14V22h-4v-10.2H5.4V8.2H10V2z" />
	</svg>
);

/** Ingwaz — seed / closed diamond. Neutral bind-rune. */
export const IconElementNeutral: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 3.2 20.8 12 12 20.8 3.2 12 12 3.2zm0 5.2L8.4 12 12 15.6 15.6 12 12 8.4z" fillRule="evenodd" />
	</svg>
);

/** Nauthiz over a blood drop — debt paid in life. */
export const IconChromeBloodPrice: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 1.6C9.2 6.4 6 11 6 15.2a6 6 0 0012 0C18 11 14.8 6.4 12 1.6z" />
		<path d="M10.6 8.4h2.8v3.2H16v2.4h-2.6V18h-2.8v-4h-2.6v-2.4h2.6V8.4z" fill="#1a0606" />
	</svg>
);

/** Three rising staves — pet / evolution stage. */
export const IconChromeEvolution: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M3.4 19.8h4.2V11H3.4v8.8zm6.5 0h4.2V6.4h-4.2v13.4zm6.5 0H20.6V2.4h-4.2v17.4z" />
	</svg>
);

export const ELEMENT_ICON_MAP: Record<NorseElement, React.FC<IconProps>> = {
	fire: IconElementFire,
	water: IconElementWater,
	grass: IconElementGrass,
	electric: IconElementElectric,
	light: IconElementLight,
	dark: IconElementDark,
	ice: IconElementIce,
	neutral: IconElementNeutral,
};

export const CARD_CHROME_ICON_MAP = {
	bloodPrice: IconChromeBloodPrice,
	evolution: IconChromeEvolution,
	masterEvolution: IconChromeEvolution,
	petStage: IconChromeEvolution,
} as const;

export const NORSE_ELEMENT_ICON_IDS = NORSE_ELEMENTS;
