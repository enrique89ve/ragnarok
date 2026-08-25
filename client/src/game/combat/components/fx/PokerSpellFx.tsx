import React from 'react';
import { motion } from 'framer-motion';
import type { AnimationEffect } from '../../../animations/UnifiedAnimationOrchestrator';
import { GameIcon } from '../../../utils/ui/GameIcon';
import type { IconName } from '../../../utils/ui/iconMap';
import './PokerSpellFx.css';

const ICON_BY_SPELL_TYPE: Record<string, IconName> = {
	damage: 'flame',
	heal: 'heart',
	buff: 'arrowDown',
	debuff: 'arrowDown',
	summon: 'sparkles',
	aoe: 'flame',
	draw: 'book',
	quest: 'crown',
	transform: 'refresh',
	void: 'sparkles',
	default: 'sparkles',
};

interface PokerSpellFxProps {
	effect: AnimationEffect;
}

export const PokerSpellFx: React.FC<PokerSpellFxProps> = React.memo(({ effect }) => {
	const spellName = typeof effect.data.spellName === 'string' ? effect.data.spellName : 'Spell';
	const spellType = typeof effect.data.spellType === 'string' ? effect.data.spellType : 'default';
	const iconName = ICON_BY_SPELL_TYPE[spellType] ?? ICON_BY_SPELL_TYPE.default;

	return (
		<motion.div
			className="poker-spell-fx"
			data-spell-type={spellType}
			role="status"
			aria-live="polite"
			aria-label={`${spellName} cast`}
			initial={{ opacity: 0, scale: 0.82, y: 18 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.94, y: -10 }}
			transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
		>
			<div className="poker-spell-fx__plate">
				<motion.div
					className="poker-spell-fx__sigil"
					initial={{ scale: 0, rotate: -18 }}
					animate={{ scale: 1, rotate: 0 }}
					transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
				>
					<GameIcon name={iconName} size={26} />
				</motion.div>
				<span className="poker-spell-fx__rune-line" aria-hidden="true" />
			</div>
		</motion.div>
	);
});

PokerSpellFx.displayName = 'PokerSpellFx';
