import React from 'react';
import ManaBar from '../../components/ManaBar';

export interface HeroResourceDockProps {
	readonly owner: 'player' | 'opponent';
	readonly currentMana: number;
	readonly maxMana: number;
	readonly label?: string;
	readonly overloadedMana?: number;
	readonly pendingOverload?: number;
}

export const HeroResourceDock: React.FC<HeroResourceDockProps> = ({
	owner,
	currentMana,
	maxMana,
	label = 'Mana',
	overloadedMana = 0,
	pendingOverload = 0,
}) => {
	return (
		<div
			className="hero-resource-dock"
			data-owner={owner}
			aria-label={`${label}: ${currentMana} of ${maxMana}`}
		>
			<ManaBar
				currentMana={currentMana}
				maxMana={maxMana}
				overloadedMana={overloadedMana}
				pendingOverload={pendingOverload}
				variant="hero"
				label={label}
			/>
		</div>
	);
};

export default HeroResourceDock;
