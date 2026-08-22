/**
 * CardIconsSVG.tsx — Norse-themed SVG icons for card keywords and stats.
 *
 * Replaces emoji icons with crisp, scalable vector pictograms.
 * All icons render at 1em × 1em and inherit currentColor for tinting.
 * Designed for small sizes (14-32px) with strong silhouettes.
 */

import React from 'react';
import { normalizeCardKeyword } from '../card/cardPresentationContract';

type IconProps = React.SVGProps<SVGSVGElement>;
export type KeywordIconComponent = React.FC<IconProps>;

const svgBase: IconProps = {
	xmlns: 'http://www.w3.org/2000/svg',
	viewBox: '0 0 24 24',
	width: '1em',
	height: '1em',
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: 2,
	strokeLinecap: 'round' as const,
	strokeLinejoin: 'round' as const,
};

const filled: IconProps = { ...svgBase, fill: 'currentColor', stroke: 'none' };

/* ─── KEYWORD ICONS ──────────────────────────────────────── */

export const IconBattlecry: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M14.5 2L12 5l2.5 3L12 11l4 5 2-3.5 3 1-1-3.5 3-2.5-3.5.5L18 5z" fill="currentColor" stroke="none" />
		<path d="M3 21l7-7M7.5 16.5l2 2" strokeWidth={2.5} />
	</svg>
);

export const IconDeathrattle: React.FC<IconProps> = (p) => (
	<svg {...filled} {...p}>
		<circle cx="12" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth={1.5} />
		<circle cx="9" cy="9" r="2" />
		<circle cx="15" cy="9" r="2" />
		<path d="M8 14h8M10 14v3M12 14v3M14 14v3" stroke="currentColor" strokeWidth={1.5} fill="none" />
	</svg>
);

export const IconTaunt: React.FC<IconProps> = (p) => (
	<svg {...filled} {...p}>
		<path d="M12 2C7 2 3 6 3 11v2c0 3 1.5 5.5 4 7.2V22h2v-1.2a10 10 0 006 0V22h2v-1.8c2.5-1.7 4-4.2 4-7.2v-2c0-5-4-9-9-9z" opacity={0.2} />
		<path d="M12 2C7 2 3 6 3 11v2c0 3 1.5 5.5 4 7.2V22h2v-1.2a10 10 0 006 0V22h2v-1.8c2.5-1.7 4-4.2 4-7.2v-2c0-5-4-9-9-9z" fill="none" stroke="currentColor" strokeWidth={1.5} />
		<circle cx="12" cy="11" r="3" fill="none" stroke="currentColor" strokeWidth={1.5} />
		<path d="M12 8v-2M12 16v-2M8 12H6M18 12h-2" stroke="currentColor" strokeWidth={1.5} fill="none" />
	</svg>
);

export const IconDivineShield: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z" fill="currentColor" opacity={0.15} stroke="currentColor" strokeWidth={1.5} />
		<path d="M9 12l2 2 4-4" strokeWidth={2.5} />
	</svg>
);

export const IconCharge: React.FC<IconProps> = (p) => (
	<svg {...filled} {...p}>
		<polygon points="13,2 3,14 11,14 10,22 21,10 14,10" />
	</svg>
);

export const IconRush: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M13 4l-1 4h6l-8 12 1-5H5l8-11z" fill="currentColor" opacity={0.7} stroke="currentColor" strokeWidth={1.5} />
		<line x1="2" y1="12" x2="6" y2="12" strokeWidth={2} />
		<line x1="2" y1="8" x2="5" y2="8" strokeWidth={2} opacity={0.6} />
		<line x1="2" y1="16" x2="5" y2="16" strokeWidth={2} opacity={0.6} />
	</svg>
);

export const IconLifesteal: React.FC<IconProps> = (p) => (
	<svg {...filled} {...p}>
		<path d="M12 21C12 21 4 14.5 4 9.5 4 6.5 6.5 4 9 4c1.5 0 2.5.8 3 1.5C12.5 4.8 13.5 4 15 4c2.5 0 5 2.5 5 5.5 0 5-8 11.5-8 11.5z" />
		<path d="M12 7v7M9 11h6" stroke="white" strokeWidth={2} fill="none" opacity={0.9} />
	</svg>
);

export const IconPoisonous: React.FC<IconProps> = (p) => (
	<svg {...filled} {...p}>
		<path d="M12 2C9 2 7 5 7 8c0 2 .5 3.5 1.5 4.5L7 22h10l-1.5-9.5c1-1 1.5-2.5 1.5-4.5 0-3-2-6-5-6z" opacity={0.85} />
		<circle cx="10" cy="7" r="1.5" fill="white" opacity={0.9} />
		<circle cx="14" cy="7" r="1.5" fill="white" opacity={0.9} />
	</svg>
);

export const IconWindfury: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M4 12h12a4 4 0 100-4" strokeWidth={2} />
		<path d="M4 18h8a3 3 0 100-3" strokeWidth={2} opacity={0.7} />
		<path d="M4 6h6a2.5 2.5 0 100-2.5" strokeWidth={2} opacity={0.5} />
	</svg>
);

export const IconStealth: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" strokeWidth={1.5} />
		<line x1="4" y1="4" x2="20" y2="20" strokeWidth={2.5} />
	</svg>
);

export const IconFreeze: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<line x1="12" y1="2" x2="12" y2="22" strokeWidth={2} />
		<line x1="2" y1="12" x2="22" y2="12" strokeWidth={2} />
		<line x1="4.9" y1="4.9" x2="19.1" y2="19.1" strokeWidth={1.5} />
		<line x1="19.1" y1="4.9" x2="4.9" y2="19.1" strokeWidth={1.5} />
		<circle cx="12" cy="12" r="3" fill="currentColor" opacity={0.3} />
	</svg>
);

export const IconSilence: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor" opacity={0.3} strokeWidth={1.5} />
		<line x1="18" y1="9" x2="22" y2="15" strokeWidth={2.5} />
		<line x1="22" y1="9" x2="18" y2="15" strokeWidth={2.5} />
	</svg>
);

export const IconSpellDamage: React.FC<IconProps> = (p) => (
	<svg {...filled} {...p}>
		<path d="M12 2C8 6 6 10 6 14a6 6 0 0012 0c0-4-2-8-6-12z" />
		<path d="M12 22a4 4 0 004-4c0-2.5-4-7-4-7s-4 4.5-4 7a4 4 0 004 4z" fill="white" opacity={0.3} />
	</svg>
);

export const IconOverload: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<rect x="5" y="11" width="14" height="10" rx="2" strokeWidth={1.5} fill="currentColor" opacity={0.2} />
		<path d="M8 11V7a4 4 0 018 0v4" strokeWidth={2} />
		<circle cx="12" cy="16" r="1.5" fill="currentColor" />
	</svg>
);

export const IconReborn: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M3 12a9 9 0 019-9 9 9 0 019 9" strokeWidth={2} />
		<path d="M21 12a9 9 0 01-9 9 9 9 0 01-9-9" strokeWidth={2} />
		<polyline points="17,3 21,3 21,7" strokeWidth={2} />
		<polyline points="7,21 3,21 3,17" strokeWidth={2} />
	</svg>
);

export const IconDiscover: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<circle cx="11" cy="11" r="7" strokeWidth={1.5} fill="currentColor" opacity={0.15} />
		<line x1="16.5" y1="16.5" x2="22" y2="22" strokeWidth={2.5} />
		<circle cx="11" cy="11" r="3" fill="currentColor" opacity={0.25} />
	</svg>
);

export const IconCombo: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={1.5} />
		<rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={1.5} />
		<rect x="8.5" y="14" width="7" height="7" rx="1" strokeWidth={1.5} fill="currentColor" opacity={0.3} />
		<line x1="6.5" y1="10" x2="10" y2="14" strokeWidth={1.5} opacity={0.6} />
		<line x1="17.5" y1="10" x2="14" y2="14" strokeWidth={1.5} opacity={0.6} />
	</svg>
);

export const IconInspire: React.FC<IconProps> = (p) => (
	<svg {...filled} {...p}>
		<polygon points="12,2 15,9 22,9 16.5,13.5 18.5,21 12,16.5 5.5,21 7.5,13.5 2,9 9,9" />
	</svg>
);

export const IconAdapt: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<circle cx="12" cy="12" r="9" strokeWidth={1.5} />
		<line x1="12" y1="7" x2="12" y2="17" strokeWidth={2.5} />
		<line x1="7" y1="12" x2="17" y2="12" strokeWidth={2.5} />
	</svg>
);

export const IconEcho: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<rect x="6" y="4" width="12" height="16" rx="2" strokeWidth={1.5} />
		<rect x="3" y="6" width="12" height="16" rx="2" strokeWidth={1.5} opacity={0.4} />
	</svg>
);

export const IconMagnetic: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M15 7h4a2 2 0 012 2v6a2 2 0 01-2 2h-4" strokeWidth={1.5} />
		<path d="M9 7H5a2 2 0 00-2 2v6a2 2 0 002 2h4" strokeWidth={1.5} />
		<line x1="9" y1="12" x2="15" y2="12" strokeWidth={2} strokeDasharray="2 2" />
	</svg>
);

export const IconOverkill: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<circle cx="12" cy="12" r="9" strokeWidth={1.5} />
		<circle cx="12" cy="12" r="5" strokeWidth={1.5} />
		<circle cx="12" cy="12" r="1.5" fill="currentColor" />
	</svg>
);

export const IconFrenzy: React.FC<IconProps> = (p) => (
	<svg {...filled} {...p}>
		<path d="M12 2l2 7h7l-5.5 4.5 2 7L12 16l-5.5 4.5 2-7L3 9h7l2-7z" opacity={0.2} />
		<path d="M10 2l1.5 5.5-4.5 3 3.5-.5L12 14l1.5-4 3.5.5-4.5-3L14 2l-1 3h-2L10 2z" />
	</svg>
);

export const IconCorrupt: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 3c-3 3-5 5-5 9s5 9 5 9 5-5 5-9-2-6-5-9z" fill="currentColor" opacity={0.38} strokeWidth={1.8} />
		<path d="M12 8v4M12 16v.01" strokeWidth={2.5} />
	</svg>
);

export const IconDormant: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor" opacity={0.7} strokeWidth={1.8} />
		<path d="M7.3 16.8c1.2 1.1 2.8 1.8 4.7 1.8" stroke="currentColor" strokeWidth={1.5} opacity={0.9} />
		<path d="M16.8 5.6l.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4z" fill="currentColor" stroke="none" />
	</svg>
);

export const IconImmune: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z" fill="currentColor" opacity={0.38} strokeWidth={1.8} />
		<circle cx="12" cy="12" r="3.5" fill="currentColor" opacity={0.74} />
		<path d="M9.5 12h5M12 9.5v5" stroke="currentColor" strokeWidth={1.6} />
	</svg>
);

export const IconColossal: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<rect x="4" y="8" width="16" height="12" rx="1" strokeWidth={1.5} />
		<line x1="4" y1="14" x2="20" y2="14" strokeWidth={1.5} />
		<line x1="12" y1="8" x2="12" y2="20" strokeWidth={1.5} />
		<polyline points="8,8 12,3 16,8" strokeWidth={1.5} />
	</svg>
);

export const IconYggdrasilGolem: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<line x1="12" y1="22" x2="12" y2="6" strokeWidth={2} />
		<path d="M12 6c-3-3-7-2-7 1s4 4 7 3" strokeWidth={1.5} fill="currentColor" opacity={0.3} />
		<path d="M12 10c3-3 7-2 7 1s-4 4-7 3" strokeWidth={1.5} fill="currentColor" opacity={0.3} />
		<path d="M12 6c0-3 2-5 2-5" strokeWidth={1.5} />
		<path d="M9 22c0-3 1.5-5 3-7M15 22c0-3-1.5-5-3-7" strokeWidth={1.5} opacity={0.6} />
	</svg>
);

export const IconEinherjar: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 3l1.5 3.5L17 8l-3 2.5.5 4L12 13l-2.5 1.5.5-4L7 8l3.5-1.5L12 3z" fill="currentColor" opacity={0.3} strokeWidth={1.5} />
		<path d="M12 16v6M8 20l4-4 4 4" strokeWidth={2} />
	</svg>
);

export const IconBloodPrice: React.FC<IconProps> = (p) => (
	<svg {...filled} {...p}>
		<path d="M12 2C9 7 6 11 6 15a6 6 0 0012 0c0-4-3-8-6-13z" />
	</svg>
);

export const IconBloodEcho: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 3C9 7 7 10 7 14a5 5 0 0010 0c0-4-2-7-5-11z" fill="currentColor" opacity={0.32} strokeWidth={1.5} />
		<path d="M12 7c-1.5 2.2-2.4 4-2.4 6a2.4 2.4 0 004.8 0c0-2-.9-3.8-2.4-6z" fill="currentColor" opacity={0.72} stroke="none" />
		<path d="M4 9c-1.5 1.7-1.5 4.3 0 6M20 9c1.5 1.7 1.5 4.3 0 6" strokeWidth={1.7} opacity={0.72} />
		<path d="M2 6c-2 3.5-2 8.5 0 12M22 6c2 3.5 2 8.5 0 12" strokeWidth={1.2} opacity={0.42} />
	</svg>
);

export const IconProphecy: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<circle cx="12" cy="12" r="9" strokeWidth={1.5} />
		<polyline points="12,6 12,12 16,14" strokeWidth={2} />
	</svg>
);

export const IconSecret: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<circle cx="12" cy="12" r="9" strokeWidth={1.8} fill="currentColor" opacity={0.34} />
		<path d="M12 8a3 3 0 013 3c0 1.5-1.5 2-1.5 3.5M12 17v.01" strokeWidth={2.5} />
	</svg>
);

export const IconPetEvolution: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 20V4" strokeWidth={2} />
		<polyline points="6,10 12,4 18,10" strokeWidth={2} />
		<line x1="8" y1="16" x2="16" y2="16" strokeWidth={1.5} opacity={0.5} />
		<line x1="9" y1="20" x2="15" y2="20" strokeWidth={1.5} opacity={0.3} />
	</svg>
);

export const IconMasterEvolution: React.FC<IconProps> = (p) => (
	<svg {...filled} {...p}>
		<path d="M5 16l3-8 4 5 4-5 3 8H5z" />
		<path d="M4 16h16v2H4z" opacity={0.6} />
	</svg>
);

export const IconChooseOne: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<line x1="12" y1="3" x2="12" y2="12" strokeWidth={2} />
		<line x1="12" y1="12" x2="5" y2="20" strokeWidth={2} />
		<line x1="12" y1="12" x2="19" y2="20" strokeWidth={2} />
		<circle cx="5" cy="20" r="2" fill="currentColor" opacity={0.4} />
		<circle cx="19" cy="20" r="2" fill="currentColor" opacity={0.4} />
	</svg>
);

export const IconOutcast: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<polyline points="4,12 9,7 9,17" strokeWidth={2} />
		<polyline points="20,12 15,7 15,17" strokeWidth={2} />
		<circle cx="12" cy="12" r="2" fill="currentColor" />
	</svg>
);

export const IconQuest: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="currentColor" opacity={0.4} strokeWidth={1.8} />
		<line x1="4" y1="22" x2="4" y2="3" strokeWidth={2.4} />
	</svg>
);

export const IconSidequest: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M5 4h14l-1 16H6L5 4z" fill="currentColor" opacity={0.36} strokeWidth={1.8} />
		<line x1="9" y1="4" x2="9" y2="1" strokeWidth={1.5} />
		<line x1="15" y1="4" x2="15" y2="1" strokeWidth={1.5} />
		<path d="M8 9h8M8 13h5" strokeWidth={1.5} opacity={0.9} />
	</svg>
);

export const IconSpellburst: React.FC<IconProps> = (p) => (
	<svg {...filled} {...p}>
		<path d="M12 2l1.5 5 5-1.5-3.5 4 4 3.5-5.5-.5L12 18l-1.5-5.5-5.5.5 4-3.5-3.5-4 5 1.5L12 2z" />
	</svg>
);

export const IconEnrage: React.FC<IconProps> = (p) => (
	<svg {...filled} {...p}>
		<circle cx="12" cy="12" r="10" opacity={0.15} />
		<path d="M8 9l2 2 2-3 2 3 2-2" stroke="currentColor" strokeWidth={2} fill="none" />
		<path d="M8 16c1.5 1.5 2.5 2 4 2s2.5-.5 4-2" stroke="currentColor" strokeWidth={2} fill="none" />
	</svg>
);

export const IconTradeable: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<polyline points="16,3 21,3 21,8" strokeWidth={2} />
		<line x1="21" y1="3" x2="14" y2="10" strokeWidth={2} />
		<polyline points="8,21 3,21 3,16" strokeWidth={2} />
		<line x1="3" y1="21" x2="10" y2="14" strokeWidth={2} />
	</svg>
);

export const IconRecruit: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<circle cx="12" cy="8" r="4" strokeWidth={1.5} />
		<path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeWidth={1.5} />
		<line x1="18" y1="8" x2="18" y2="14" strokeWidth={2} />
		<line x1="15" y1="11" x2="21" y2="11" strokeWidth={2} />
	</svg>
);

export const IconCleave: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M18 3l-6 8-6-8" strokeWidth={2.5} />
		<path d="M12 11v10" strokeWidth={2} />
		<line x1="8" y1="18" x2="16" y2="18" strokeWidth={2} opacity={0.5} />
	</svg>
);

export const IconAura: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<circle cx="12" cy="12" r="3" fill="currentColor" opacity={0.72} strokeWidth={1.5} />
		<circle cx="12" cy="12" r="6.5" strokeWidth={1.8} opacity={0.86} strokeDasharray="3 2" />
		<circle cx="12" cy="12" r="9.5" strokeWidth={1.3} opacity={0.58} strokeDasharray="2 3" />
	</svg>
);

export const IconFlying: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M2 12c3-1 6-4 10-4s5 1 10 4c-5 1-6 4-10 4s-7-3-10-4z" fill="currentColor" opacity={0.42} strokeWidth={1.8} />
		<path d="M4 12c3-.4 5.4-2.3 8-2.3s5 1.9 8 2.3c-3 .4-5 2.3-8 2.3S7 12.4 4 12z" fill="currentColor" opacity={0.78} stroke="none" />
		<line x1="12" y1="8" x2="12" y2="16" strokeWidth={1.8} />
	</svg>
);

export const IconWager: React.FC<IconProps> = (p) => (
	<svg {...filled} {...p}>
		<rect x="3" y="3" width="8" height="8" rx="1.5" transform="rotate(45 7 7)" />
		<rect x="13" y="3" width="8" height="8" rx="1.5" transform="rotate(45 17 7)" />
		<circle cx="7" cy="17" r="4" />
		<circle cx="17" cy="17" r="4" />
		<circle cx="7" cy="7" r="1.5" fill="white" opacity={0.8} />
		<circle cx="17" cy="7" r="1.5" fill="white" opacity={0.8} />
		<circle cx="7" cy="17" r="1.5" fill="white" opacity={0.8} />
		<circle cx="17" cy="17" r="1.5" fill="white" opacity={0.8} />
	</svg>
);

export const IconSubmerge: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M2 12c1.5-2 3.5-2 5 0s3.5 2 5 0 3.5-2 5 0 3.5 2 5 0" strokeWidth={2} />
		<line x1="12" y1="12" x2="12" y2="22" strokeWidth={2} />
		<line x1="8" y1="20" x2="16" y2="20" strokeWidth={2} />
		<line x1="9" y1="16" x2="15" y2="16" strokeWidth={1.5} opacity={0.6} />
	</svg>
);

export const IconCoil: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 3c4 0 6 2 6 5s-2 5-6 5-6 2-6 5 2 5 6 5" strokeWidth={2} fill="none" />
		<circle cx="12" cy="3" r="1.5" fill="currentColor" />
	</svg>
);

export const IconElusive: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z" strokeWidth={1.5} />
		<line x1="6" y1="6" x2="18" y2="18" strokeWidth={2} />
	</svg>
);

export const IconAdaptOption: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 3l4 4-4 4-4-4z" fill="currentColor" opacity={0.32} strokeWidth={1.5} />
		<path d="M5 13l3.2 3.2L5 19.4l-3.2-3.2zM19 13l3.2 3.2L19 19.4l-3.2-3.2z" fill="currentColor" opacity={0.18} strokeWidth={1.5} />
		<path d="M12 11v8M8.2 16.2h7.6" strokeWidth={1.6} opacity={0.82} />
	</svg>
);

export const IconArtifact: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 2l6 5-2 13H8L6 7z" fill="currentColor" opacity={0.2} strokeWidth={1.5} />
		<path d="M12 2v18M7 7h10M8.5 20h7" strokeWidth={1.6} opacity={0.72} />
		<path d="M9 11h6M10 15h4" strokeWidth={1.3} opacity={0.52} />
	</svg>
);

export const IconCantAttack: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M6 18l9-13 3 3-9 13z" fill="currentColor" opacity={0.22} strokeWidth={1.5} />
		<path d="M4 4l16 16" strokeWidth={2.7} />
		<circle cx="12" cy="12" r="9" strokeWidth={1.5} opacity={0.72} />
	</svg>
);

export const IconDualClass: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M8 4l5 2.5V11c0 3.2-2 5.4-5 6.5-3-1.1-5-3.3-5-6.5V6.5z" fill="currentColor" opacity={0.18} strokeWidth={1.4} />
		<path d="M16 4l5 2.5V11c0 3.2-2 5.4-5 6.5-3-1.1-5-3.3-5-6.5V6.5z" fill="currentColor" opacity={0.26} strokeWidth={1.4} />
		<path d="M12 7v10" strokeWidth={1.5} opacity={0.65} />
	</svg>
);

export const IconFateweave: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M4 7c5 0 5 10 10 10 3 0 4.5-2.2 6-5M20 7c-5 0-5 10-10 10-3 0-4.5-2.2-6-5" strokeWidth={1.8} />
		<circle cx="4" cy="7" r="1.6" fill="currentColor" />
		<circle cx="20" cy="7" r="1.6" fill="currentColor" />
		<circle cx="12" cy="12" r="2" fill="currentColor" opacity={0.35} stroke="none" />
	</svg>
);

export const IconFreezeOnDamage: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M5 19l9-14 3 3-9 14z" fill="currentColor" opacity={0.18} strokeWidth={1.5} />
		<path d="M16 3v8M12.5 5l7 4M19.5 5l-7 4" strokeWidth={1.4} opacity={0.9} />
		<path d="M4 18h8" strokeWidth={2.2} />
	</svg>
);

export const IconFrozenState: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<rect x="5" y="4" width="14" height="16" rx="2" fill="currentColor" opacity={0.18} strokeWidth={1.5} />
		<path d="M12 7v10M7 12h10M8.5 8.5l7 7M15.5 8.5l-7 7" strokeWidth={1.3} opacity={0.78} />
	</svg>
);

export const IconPokerSpell: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<rect x="4" y="5" width="8" height="12" rx="1.2" fill="currentColor" opacity={0.16} strokeWidth={1.4} transform="rotate(-8 8 11)" />
		<rect x="12" y="7" width="8" height="12" rx="1.2" fill="currentColor" opacity={0.22} strokeWidth={1.4} transform="rotate(8 16 13)" />
		<path d="M16 10l1.2 2.2 2.3.4-1.7 1.7.4 2.4-2.2-1.1-2.1 1.1.4-2.4-1.7-1.7 2.3-.4z" fill="currentColor" stroke="none" />
	</svg>
);

export const IconSpellTrigger: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M4 20l7-7M9 15l2 2" strokeWidth={2.3} />
		<path d="M13 3l1.4 4.2L19 8.5l-3.6 2.7.3 4.6L12 13.2l-3.7 2.6.3-4.6L5 8.5l4.6-1.3z" fill="currentColor" opacity={0.3} strokeWidth={1.4} />
		<circle cx="14" cy="9" r="6.5" strokeWidth={1.1} opacity={0.38} />
	</svg>
);

/* ─── COMBAT STATE ICONS ─────────────────────────────────── */

/** Raised blade and target — the unit is ready to attack. */
export const IconReadyState: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<circle cx="16.5" cy="16.5" r="4.5" strokeWidth={1.4} opacity={0.55} />
		<circle cx="16.5" cy="16.5" r="1.3" fill="currentColor" stroke="none" />
		<path d="M4 20L14.5 9.5M11.5 6.5l6 6M13 4l2.5 2.5-3 3L10 7z" strokeWidth={2} />
	</svg>
);

/** Controlled flame — the unit is taking burn damage. */
export const IconBurningState: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 3c1.8 3.3 5.5 5 5.5 9.5A5.5 5.5 0 116.5 12c0-2.5 1.5-4.4 3.2-6.2.1 2 1 3.1 2.3 4.2.5-2.4-.3-4.5 0-7z" fill="currentColor" opacity={0.22} strokeWidth={1.5} />
		<path d="M12 13c1.4 1.2 2.3 2.3 2.3 3.7a2.3 2.3 0 11-4.6 0c0-1.1.8-2.3 2.3-3.7z" fill="currentColor" opacity={0.82} stroke="none" />
	</svg>
);

/** Venom drop — damage over time is active. */
export const IconPoisonedState: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 3c-2.7 3.8-5 6.7-5 10a5 5 0 0010 0c0-3.3-2.3-6.2-5-10z" fill="currentColor" opacity={0.24} strokeWidth={1.5} />
		<circle cx="10" cy="13" r="1.1" fill="currentColor" stroke="none" />
		<circle cx="14" cy="16" r="1.1" fill="currentColor" stroke="none" />
		<path d="M8 21h8" strokeWidth={1.8} opacity={0.72} />
	</svg>
);

/** Split blood drop — the unit is bleeding. */
export const IconBleedingState: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 3c-2.7 3.8-5 6.7-5 10a5 5 0 0010 0c0-3.3-2.3-6.2-5-10z" fill="currentColor" opacity={0.24} strokeWidth={1.5} />
		<path d="M9 17l6-8" strokeWidth={2.2} />
		<circle cx="8" cy="20" r="1.2" fill="currentColor" stroke="none" />
	</svg>
);

/** Interrupted lightning — actions can fail. */
export const IconParalyzedState: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M13.5 2L5 13h5l-1.5 9L17 11h-5z" fill="currentColor" opacity={0.2} strokeWidth={1.5} />
		<path d="M4 5l3 3M20 5l-3 3M4 19l3-3M20 19l-3-3" strokeWidth={1.8} opacity={0.78} />
		<path d="M11 13h2" strokeWidth={2} />
	</svg>
);

/** Dented blade — current attack is reduced. */
export const IconWeakenedState: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M5 5l5 5M14 14l5 5M8 3l13 13-3 3L5 6z" fill="currentColor" opacity={0.2} strokeWidth={1.5} />
		<path d="M8 17l-4 4M16 12l4-4" strokeWidth={1.8} opacity={0.72} />
		<path d="M12 4v7M9 8l3 3 3-3" strokeWidth={1.7} />
	</svg>
);

/** Cracked shield — damage taken from all sources is increased. */
export const IconVulnerableState: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7z" fill="currentColor" opacity={0.18} strokeWidth={1.5} />
		<path d="M13 5l-2 6 3 1-3 7M4 8l4 2M20 8l-4 2" strokeWidth={1.8} />
	</svg>
);

/** Rune crosshair — the unit is exposed to targeting. */
export const IconMarkedState: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<circle cx="12" cy="12" r="5.5" strokeWidth={1.5} opacity={0.82} />
		<circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
		<path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeWidth={2} />
	</svg>
);

/** Ascending rune — the evolution condition is complete. */
export const IconEvolutionReadyState: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<path d="M6 17a7 7 0 0111.5-5.4M18 7v5h-5" strokeWidth={1.8} />
		<path d="M18 7a7 7 0 01-11.5 5.4M6 17v-5h5" strokeWidth={1.8} opacity={0.62} />
		<path d="M12 4l1.2 2.6L16 8l-2.8 1.4L12 12l-1.2-2.6L8 8l2.8-1.4z" fill="currentColor" stroke="none" />
	</svg>
);

/** Linked runes — a partner chain is active. */
export const IconRagnarokChainState: React.FC<IconProps> = (p) => (
	<svg {...svgBase} {...p}>
		<rect x="3" y="7" width="10" height="6" rx="3" transform="rotate(-28 8 10)" strokeWidth={1.8} />
		<rect x="11" y="11" width="10" height="6" rx="3" transform="rotate(-28 16 14)" strokeWidth={1.8} />
		<path d="M9 13l6-2" strokeWidth={1.8} />
	</svg>
);

/* ─── STAT SHAPE ICONS (for mana/attack/health) ──────────── */

/** Runic crystal — mana cost emblem */
export const ManaGem: React.FC<IconProps> = (p) => (
	<svg {...svgBase} viewBox="0 0 40 40" {...p}>
		<polygon points="20,2 38,20 20,38 2,20" fill="url(#mana-grad)" stroke="#93C5FD" strokeWidth={2} />
		<polygon points="20,8 32,20 20,32 8,20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
		<defs>
			<linearGradient id="mana-grad" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#60A5FA" />
				<stop offset="40%" stopColor="#2563EB" />
				<stop offset="100%" stopColor="#1E3A8A" />
			</linearGradient>
		</defs>
	</svg>
);

/** Viking axe — attack emblem */
export const AttackBlade: React.FC<IconProps> = (p) => (
	<svg {...svgBase} viewBox="0 0 40 40" {...p}>
		<path d="M20 2l12 10-4 2 4 8-12 16-12-16 4-8-4-2L20 2z" fill="url(#atk-grad)" stroke="#FDE68A" strokeWidth={1.5} />
		<path d="M20 8l6 5-2 1 2 4-6 8-6-8 2-4-2-1L20 8z" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={0.8} />
		<defs>
			<linearGradient id="atk-grad" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#FBBF24" />
				<stop offset="40%" stopColor="#D97706" />
				<stop offset="100%" stopColor="#92400E" />
			</linearGradient>
		</defs>
	</svg>
);

/** Viking shield — health emblem */
export const HealthShield: React.FC<IconProps> = (p) => (
	<svg {...svgBase} viewBox="0 0 40 40" {...p}>
		<path d="M20 2C12 2 4 6 4 6v14c0 8 7 14 16 18 9-4 16-10 16-18V6s-8-4-16-4z" fill="url(#hp-grad)" stroke="#FCA5A5" strokeWidth={1.5} />
		<path d="M20 8c-5 0-10 2.5-10 2.5v9c0 5.5 4.5 9.5 10 12 5.5-2.5 10-6.5 10-12v-9S25 8 20 8z" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} />
		<defs>
			<linearGradient id="hp-grad" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stopColor="#EF4444" />
				<stop offset="40%" stopColor="#DC2626" />
				<stop offset="100%" stopColor="#7F1D1D" />
			</linearGradient>
		</defs>
	</svg>
);

/* ─── ICON LOOKUP TABLE ──────────────────────────────────── */

export const KEYWORD_ICON_MAP: Record<string, React.FC<IconProps>> = {
	battlecry: IconBattlecry,
	deathrattle: IconDeathrattle,
	taunt: IconTaunt,
	divine_shield: IconDivineShield,
	adapt_option: IconAdaptOption,
	artifact: IconArtifact,
	charge: IconCharge,
	rush: IconRush,
	lifesteal: IconLifesteal,
	poisonous: IconPoisonous,
	windfury: IconWindfury,
	stealth: IconStealth,
	freeze: IconFreeze,
	silence: IconSilence,
	spell_damage: IconSpellDamage,
	overload: IconOverload,
	reborn: IconReborn,
	discover: IconDiscover,
	combo: IconCombo,
	inspire: IconInspire,
	adapt: IconAdapt,
	echo: IconEcho,
	blood_echo: IconBloodEcho,
	magnetic: IconMagnetic,
	overkill: IconOverkill,
	frenzy: IconFrenzy,
	corrupt: IconCorrupt,
	dormant: IconDormant,
	immune: IconImmune,
	mega_windfury: IconWindfury,
	colossal: IconColossal,
	yggdrasil_golem: IconYggdrasilGolem,
	einherjar: IconEinherjar,
	blood_price: IconBloodPrice,
	prophecy: IconProphecy,
	secret: IconSecret,
	pet_evolution: IconPetEvolution,
	master_evolution: IconMasterEvolution,
	choose_one: IconChooseOne,
	outcast: IconOutcast,
	quest: IconQuest,
	sidequest: IconSidequest,
	spellburst: IconSpellburst,
	enrage: IconEnrage,
	tradeable: IconTradeable,
	recruit: IconRecruit,
	cleave: IconCleave,
	aura: IconAura,
	flying: IconFlying,
	wager: IconWager,
	submerge: IconSubmerge,
	coil: IconCoil,
	elusive: IconElusive,
	cant_attack: IconCantAttack,
	dual_class: IconDualClass,
	fateweave: IconFateweave,
	freeze_on_damage: IconFreezeOnDamage,
	frozen: IconFrozenState,
	poker_spell: IconPokerSpell,
	spell_trigger: IconSpellTrigger,
};

/** Resolve the single visual authority for a canonical card keyword. */
export const getKeywordIcon = (keyword: string): KeywordIconComponent | null =>
	KEYWORD_ICON_MAP[normalizeCardKeyword(keyword)] ?? null;

/** Runtime combat states use their own semantic map so they do not pollute keyword chrome. */
export const COMBAT_STATE_ICON_MAP: Record<string, React.FC<IconProps>> = {
	ready: IconReadyState,
	divine_shield: IconDivineShield,
	stealth: IconStealth,
	taunt: IconTaunt,
	frozen: IconFrozenState,
	burning: IconBurningState,
	poisoned: IconPoisonedState,
	bleeding: IconBleedingState,
	paralyzed: IconParalyzedState,
	weakened: IconWeakenedState,
	vulnerable: IconVulnerableState,
	marked: IconMarkedState,
	dormant: IconDormant,
	submerged: IconSubmerge,
	coiled: IconCoil,
	evolution_ready: IconEvolutionReadyState,
	ragnarok_chain: IconRagnarokChainState,
};
