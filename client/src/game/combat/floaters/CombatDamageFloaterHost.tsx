import React from 'react';
import { DamageIndicator } from '../components/DamageIndicator';
import { useDamageAnimations, type DamageAnimation } from '../hooks/useDamageAnimations';
import { useSettingsStore } from '../../stores/settingsStore';

type RendererProps = {
	readonly damageAnimations: DamageAnimation[];
	readonly removeDamageAnimation: (id: string) => void;
};

const CombatDamageFloaterRenderer: React.FC<RendererProps> = ({
	damageAnimations,
	removeDamageAnimation,
}) => {
	const showDamageNumbers = useSettingsStore(s => s.showDamageNumbers);
	if (!showDamageNumbers || damageAnimations.length === 0) return null;

	return (
		<>
			{damageAnimations.map(anim => (
				<DamageIndicator
					id={anim.id}
					key={anim.id}
					damage={anim.damage}
					x={anim.x}
					y={anim.y}
					isHeal={anim.isHeal}
					aside={anim.targetId === 'player-hero' || anim.targetId === 'opponent-hero'}
					variant={anim.variant}
					coordinateSpace={anim.coordinateSpace ?? 'arena'}
					onComplete={() => removeDamageAnimation(anim.id)}
				/>
			))}
		</>
	);
};

const CombatDamageFloaterHostWithHook: React.FC = () => {
	const { damageAnimations, removeDamageAnimation } = useDamageAnimations();
	return (
		<CombatDamageFloaterRenderer
			damageAnimations={damageAnimations}
			removeDamageAnimation={removeDamageAnimation}
		/>
	);
};

type CombatDamageFloaterHostProps = {
	readonly damageAnimations?: DamageAnimation[];
	readonly removeDamageAnimation?: (id: string) => void;
};

/** Renders canonical damage/heal floaters for any mounted game surface. */
export const CombatDamageFloaterHost: React.FC<CombatDamageFloaterHostProps> = ({
	damageAnimations,
	removeDamageAnimation,
}) => {
	if (damageAnimations && removeDamageAnimation) {
		return (
			<CombatDamageFloaterRenderer
				damageAnimations={damageAnimations}
				removeDamageAnimation={removeDamageAnimation}
			/>
		);
	}
	return <CombatDamageFloaterHostWithHook />;
};

export default CombatDamageFloaterHost;