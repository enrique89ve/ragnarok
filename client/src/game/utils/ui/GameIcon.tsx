/**
 * GameIcon.tsx render a semantic game icon as a Lucide component.
 *
 * G4 migration helper. Replaces inline emoji span patterns with
 * `<GameIcon name="skull" />`. The semantic name is resolved via iconMap.
 *
 * Unmapped names fall back to `HelpCircle` so the UI never breaks; the
 * call site should add the name to iconMap if needed.
 */

import React from 'react';
import { HelpCircle } from 'lucide-react';
import { ICON_MAP, type IconName } from './iconMap';

export interface GameIconProps {
	name: IconName;
	size?: number;
	strokeWidth?: number;
	className?: string;
	'aria-label'?: string;
}

export const GameIcon: React.FC<GameIconProps> = ({
	name,
	size = 20,
	strokeWidth = 2,
	className,
	'aria-label': ariaLabel,
}) => {
	const IconComponent = ICON_MAP[name] ?? HelpCircle;
	return (
		<IconComponent
			size={size}
			strokeWidth={strokeWidth}
			className={className}
			aria-label={ariaLabel ?? name}
			role={ariaLabel ? 'img' : undefined}
		/>
	);
};

export default GameIcon;
