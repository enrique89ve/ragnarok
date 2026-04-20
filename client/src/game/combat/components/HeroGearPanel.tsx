import React from 'react';
import type { CardInstance, ArmorPiece } from '../../types';
import { getTotalGearArmor, getActiveSetBonuses } from '../../utils/armorGearUtils';
import './HeroGearPanel.css';

interface HeroGearPanelProps {
	artifact?: CardInstance;
	armorGear?: {
		helm?: ArmorPiece;
		chest?: ArmorPiece;
		greaves?: ArmorPiece;
	};
	artifactState?: {
		souls?: number;
		permanentAttackBonus?: number;
		lethalPrevented?: boolean;
	};
	onClose: () => void;
}

const SLOT_ICONS: Record<string, string> = {
	helm: '🪖',
	chest: '🛡️',
	greaves: '🥾'
};

const SLOT_LABELS: Record<string, string> = {
	helm: 'Helm',
	chest: 'Chest',
	greaves: 'Greaves'
};

const HeroGearPanel: React.FC<HeroGearPanelProps> = ({
	artifact,
	armorGear,
	artifactState,
	onClose
}) => {
	const totalArmor = getTotalGearArmor(armorGear);
	const setBonuses = getActiveSetBonuses(armorGear);
	const artifactEffect = artifact ? (artifact.card as any).artifactEffect : null;
	const artifactAttack = artifact ? ((artifact.card as any).attack || 0) + (artifactState?.permanentAttackBonus || 0) : 0;

	return (
		<div className="hero-gear-panel-overlay" onClick={onClose}>
			<div className="hero-gear-panel" onClick={e => e.stopPropagation()}>
				<div className="gear-panel-header">
					<span className="gear-panel-title">Hero Equipment</span>
					<button className="gear-panel-close" onClick={onClose}>✕</button>
				</div>

				<div className="gear-section artifact-section">
					<div className="section-label">⚔️ Artifact</div>
					{artifact ? (
						<div className="gear-slot artifact-slot filled">
							<div className="slot-name">{artifact.card.name}</div>
							<div className="slot-stats">
								{artifactAttack > 0 && <span className="stat-attack">+{artifactAttack} Attack</span>}
							</div>
							<div className="slot-description">{artifact.card.description}</div>
							{artifactState?.souls !== undefined && (
								<div className="artifact-tracker">Souls: {artifactState.souls}</div>
							)}
							{artifactState?.lethalPrevented && (
								<div className="artifact-tracker spent">Lethal prevention used</div>
							)}
						</div>
					) : (
						<div className="gear-slot empty">No artifact equipped</div>
					)}
				</div>

				<div className="gear-section armor-section">
					<div className="section-label">🛡️ Armor Gear</div>
					{(['helm', 'chest', 'greaves'] as const).map(slot => {
						const piece = armorGear?.[slot];
						return (
							<div key={slot} className={`gear-slot armor-slot ${piece ? 'filled' : 'empty'}`}>
								<div className="slot-header">
									<span className="slot-icon">{SLOT_ICONS[slot]}</span>
									<span className="slot-label">{SLOT_LABELS[slot]}</span>
								</div>
								{piece ? (
									<>
										<div className="slot-name">{piece.name}</div>
										<div className="slot-stats">
											<span className="stat-armor">+{piece.armorValue} Armor</span>
											{piece.setId && <span className="stat-set">{piece.setId}</span>}
										</div>
										{piece.passive && (
											<div className="slot-passive">{getPassiveText(piece.passive)}</div>
										)}
									</>
								) : (
									<div className="slot-empty-text">Empty</div>
								)}
							</div>
						);
					})}
				</div>

				<div className="gear-section totals-section">
					<div className="total-armor">Total Armor: +{totalArmor}</div>
					{setBonuses.length > 0 && (
						<div className="set-bonuses">
							{setBonuses.map(bonus => (
								<div key={bonus.setId} className="set-bonus">
									<div className="set-name">{bonus.setId} ({bonus.piecesEquipped}/3)</div>
									{bonus.isTwoPieceActive && bonus.twoPieceBonus && (
										<div className="bonus-text active">2pc: {bonus.twoPieceBonus}</div>
									)}
									{bonus.isThreePieceActive && bonus.threePieceBonus && (
										<div className="bonus-text active">3pc: {bonus.threePieceBonus}</div>
									)}
									{!bonus.isThreePieceActive && bonus.threePieceBonus && (
										<div className="bonus-text inactive">3pc: {bonus.threePieceBonus}</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

function getPassiveText(passive: { type: string; value?: number }): string {
	switch (passive.type) {
		case 'spell_cost_reduction': return `First spell costs (${passive.value || 1}) less`;
		case 'aoe_damage_reduction': return `AoE damage reduced by ${passive.value || 1}`;
		case 'attack_while_damaged': return `+${passive.value || 1} Attack while damaged`;
		case 'overkill_to_hero': return 'Overkill hits enemy hero';
		case 'on_death_mana': return `On death: +${passive.value || 1} Mana`;
		case 'freeze_extend': return `Freeze lasts +${passive.value || 1} turn`;
		case 'first_summon_buff': return `First summon: +${passive.value || 1}/+${passive.value || 1}`;
		case 'illusion_rush': return 'Illusions gain Rush';
		case 'spell_power': return `Spell Damage +${passive.value || 1}`;
		case 'lifesteal_percent': return `Healing +${passive.value || 1}`;
		case 'status_resistance': return `Status effects -${passive.value || 1} turn`;
		default: return passive.type;
	}
}

export default HeroGearPanel;
