import React from 'react';
import {
	COMBAT_STATE_ICON_MAP,
	KEYWORD_ICON_MAP,
	type KeywordIconComponent,
} from '../../components/ui/CardIconsSVG';
import { GameIcon } from '../../utils/ui/GameIcon';
import type { IconName } from '../../utils/ui/iconMap';
import type { RuntimeStateId } from '../runtimeStateContract';

export type BattlefieldIconReference =
	| { readonly source: 'combat'; readonly name: RuntimeStateId }
	| { readonly source: 'keyword'; readonly name: string }
	| { readonly source: 'lucide'; readonly name: IconName };

export interface BattlefieldStateMarkProps {
	readonly className: string;
	readonly label: string;
	readonly icon: BattlefieldIconReference;
	readonly count?: number | string;
	readonly countClassName?: string;
	readonly decorativeSleepMarks?: boolean;
	readonly iconSize?: number;
}

const renderIcon = (icon: BattlefieldIconReference, size: number): React.ReactNode => {
	if (icon.source === 'lucide') {
		return <GameIcon name={icon.name} size={size} aria-hidden="true" />;
	}

	const Icon: KeywordIconComponent | undefined = icon.source === 'combat'
		? COMBAT_STATE_ICON_MAP[icon.name]
		: KEYWORD_ICON_MAP[icon.name];

	return Icon ? (
		<Icon width={size} height={size} focusable="false" aria-hidden="true" />
	) : null;
};

/**
 * One accessible, semantic wrapper for all board state marks. Any Z marks are
 * decorative reinforcement for Dormant; the state label and counter remain
 * the authoritative player-facing signal.
 */
export const BattlefieldStateMark: React.FC<BattlefieldStateMarkProps> = ({
	className,
	label,
	icon,
	count,
	countClassName,
	decorativeSleepMarks = false,
	iconSize = 12,
}) => (
	<span className={className} title={label} role="img" aria-label={label}>
		{renderIcon(icon, iconSize)}
		{decorativeSleepMarks ? (
			<span className="bf-dormant-zs" aria-hidden="true">
				<span className="bf-dormant-z bf-dormant-z--one">z</span>
				<span className="bf-dormant-z bf-dormant-z--two">z</span>
			</span>
		) : null}
		{count !== undefined ? <span className={countClassName}>{count}</span> : null}
		<span className="sr-only">{label}</span>
	</span>
);

export default BattlefieldStateMark;
