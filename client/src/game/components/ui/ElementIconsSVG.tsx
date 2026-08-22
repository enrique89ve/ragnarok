import React from 'react';
import type { ElementType } from '../../utils/elements/elementAdvantage';

type ElementIconProps = React.SVGProps<SVGSVGElement>;

const svgBase: ElementIconProps = {
	viewBox: '0 0 24 24',
	width: '1em',
	height: '1em',
	fill: 'currentColor',
	stroke: 'none',
	'aria-hidden': true,
	focusable: false,
};

/** Filled elemental silhouettes for compact gameplay badges and indicators. */
export const ElementFireIcon: React.FC<ElementIconProps> = (props) => (
	<svg {...svgBase} {...props}>
		<path d="M12 2c0 3 5 4 5 9 0 3-2 5-3 6 .5-3-1-5-2-6-1 3-4 4-4 7 0 2 1 3 3 4-5-1-7-4-7-8 0-5 5-7 8-12Z" />
		<path d="M12 20c2-1 3-3 2-5-1 2-3 3-2 5Z" fill="#18090a" opacity=".7" />
	</svg>
);

export const ElementWaterIcon: React.FC<ElementIconProps> = (props) => (
	<svg {...svgBase} {...props}>
		<path d="M3 5c3 0 3 2 6 2s3-2 6-2 3 2 6 2v3c-3 0-3-2-6-2s-3 2-6 2-3-2-6-2V5Z" />
		<path d="M3 12c3 0 3 2 6 2s3-2 6-2 3 2 6 2v3c-3 0-3-2-6-2s-3 2-6 2-3-2-6-2v-3Z" />
	</svg>
);

export const ElementWindIcon: React.FC<ElementIconProps> = (props) => (
	<svg {...svgBase} {...props}>
		<path d="M3 5h11a3 3 0 1 0-3-4l2 1a1 1 0 1 1 1 2H3V5Z" />
		<path d="M3 10h15a3 3 0 1 1-3 4l2 1a1 1 0 1 0 1-2H3v-3Z" />
		<path d="M3 16h9a3 3 0 1 1-3 4l2 1a1 1 0 1 0 1-2H3v-3Z" />
	</svg>
);

export const ElementEarthIcon: React.FC<ElementIconProps> = (props) => (
	<svg {...svgBase} {...props}>
		<path fillRule="evenodd" d="m12 2 10 10-10 10L2 12 12 2Zm0 5-5 5 5 6 5-6-5-5Z" />
		<path d="M8 13h8l-2 2h-4l-2-2Z" fill="#160e08" opacity=".65" />
	</svg>
);

export const ElementHolyIcon: React.FC<ElementIconProps> = (props) => (
	<svg {...svgBase} {...props}>
		<path fillRule="evenodd" d="M10 2h4l1 6 5-3 2 3-5 4 5 4-2 3-5-3-1 6h-4l-1-6-5 3-2-3 5-4-5-4 2-3 5 3 1-6Zm2 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
	</svg>
);

export const ElementShadowIcon: React.FC<ElementIconProps> = (props) => (
	<svg {...svgBase} {...props}>
		<path d="M18 3a9 9 0 1 0 3 15A8 8 0 1 1 18 3Z" />
		<path d="m18 7 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" fill="#0c0615" opacity=".75" />
	</svg>
);

export const ElementNeutralIcon: React.FC<ElementIconProps> = (props) => (
	<svg {...svgBase} {...props}>
		<path fillRule="evenodd" d="m12 2 10 10-10 10L2 12 12 2Zm0 5-5 5 5 5 5-5-5-5Z" />
	</svg>
);

export const ELEMENT_ICON_MAP: Readonly<Record<ElementType, React.FC<ElementIconProps>>> = {
	fire: ElementFireIcon,
	water: ElementWaterIcon,
	wind: ElementWindIcon,
	earth: ElementEarthIcon,
	holy: ElementHolyIcon,
	shadow: ElementShadowIcon,
	neutral: ElementNeutralIcon,
};

export const getElementIcon = (element: ElementType): React.FC<ElementIconProps> =>
	ELEMENT_ICON_MAP[element] ?? ElementNeutralIcon;
