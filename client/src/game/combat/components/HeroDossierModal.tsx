import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GameIcon } from '../../utils/ui/GameIcon';
import { getElementIcon } from '../../components/ui/ElementIconsSVG';
import { type ElementType, ELEMENT_LABELS } from '../../utils/elements';
import { ARENA_VFX_LAYERS, getArenaVfxLayer } from '../arenaVfxTargets';
import './HeroDossierModal.css';

interface HeroPowerDetails {
	readonly name: string;
	readonly cost: number;
	readonly description: string;
}

interface WeaponUpgradeDetails {
	readonly name: string;
	readonly immediateEffect: {
		readonly description: string;
	};
}

interface ElementMatchups {
	readonly weakTo: ElementType[];
	readonly strongVs: ElementType[];
}

export interface HeroDossierModalProps {
	readonly isOpen: boolean;
	readonly isOpponent: boolean;
	readonly heroName: string;
	readonly heroClass: string;
	readonly heroElement: string;
	readonly portraitSrc: string;
	readonly level: number;
	readonly currentHP: number;
	readonly maxHP: number;
	readonly currentStamina: number;
	readonly maxStamina: number;
	readonly currentMana: number;
	readonly maxMana: number;
	readonly pokerPosition?: string;
	readonly armor: number;
	readonly hpCommitted: number;
	readonly secretsCount: number;
	readonly artifact?: { readonly name: string; readonly attack: number };
	readonly heroPower?: HeroPowerDetails;
	readonly weaponUpgrade?: WeaponUpgradeDetails;
	readonly isWeaponUpgraded: boolean;
	readonly canAffordPower: boolean;
	readonly canUpgrade: boolean;
	readonly elementMatchups?: ElementMatchups | null;
	readonly onClose: () => void;
	readonly onHeroPowerClick?: () => void;
	readonly onWeaponUpgradeClick?: () => void;
	readonly onOpenEquipment?: () => void;
}

interface StatMeterProps {
	readonly label: string;
	readonly value: number;
	readonly max: number;
	readonly tone: 'health' | 'stamina' | 'mana';
}

const StatMeter: React.FC<StatMeterProps> = ({ label, value, max, tone }) => {
	const safeMax = Math.max(1, max);
	const percent = Math.max(0, Math.min(100, (value / safeMax) * 100));

	return (
		<div className="hero-dossier-meter-row">
			<div className="hero-dossier-meter-heading">
				<span>{label}</span>
				<strong>{Math.round(value)}/{Math.round(max)}</strong>
			</div>
			<div
				className={`hero-dossier-meter hero-dossier-meter--${tone}`}
				role="meter"
				aria-label={label}
				aria-valuemin={0}
				aria-valuemax={max}
				aria-valuenow={value}
			>
				<span style={{ transform: `scaleX(${percent / 100})` }} />
			</div>
		</div>
	);
};

export const HeroDossierModal: React.FC<HeroDossierModalProps> = ({
	isOpen,
	isOpponent,
	heroName,
	heroClass,
	heroElement,
	portraitSrc,
	level,
	currentHP,
	maxHP,
	currentStamina,
	maxStamina,
	currentMana,
	maxMana,
	pokerPosition,
	armor,
	hpCommitted,
	secretsCount,
	artifact,
	heroPower,
	weaponUpgrade,
	isWeaponUpgraded,
	canAffordPower,
	canUpgrade,
	elementMatchups,
	onClose,
	onHeroPowerClick,
	onWeaponUpgradeClick,
	onOpenEquipment,
}) => {
	useEffect(() => {
		if (!isOpen) return undefined;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const portalTarget = getArenaVfxLayer(ARENA_VFX_LAYERS.modal);
	if (!portalTarget) return null;

	const handleEquipmentClick = () => {
		onClose();
		onOpenEquipment?.();
	};

	return createPortal(
		<div
			className="hero-dossier-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="hero-dossier-title"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<section className="hero-dossier" onMouseDown={(event) => event.stopPropagation()}>
				<header className="hero-dossier-header">
					<div>
						<span className="hero-dossier-kicker">{isOpponent ? 'OPPONENT' : 'YOUR HERO'}</span>
						<h2 id="hero-dossier-title">{heroName}</h2>
						<span className="hero-dossier-subtitle">{heroClass} · Level {level}</span>
					</div>
					<button className="hero-dossier-close" type="button" onClick={onClose} aria-label="Close hero details">
						<GameIcon name="x" size={18} />
					</button>
				</header>

				<div className="hero-dossier-grid">
					<div className="hero-dossier-portrait-wrap">
						<div
							className="hero-dossier-portrait"
							style={{ backgroundImage: `url('${portraitSrc}')` }}
							role="img"
							aria-label={`${heroName} portrait`}
						/>
						<div className="hero-dossier-element">
							{heroElement}
						</div>
					</div>

					<div className="hero-dossier-content">
						<section className="hero-dossier-section" aria-labelledby="hero-dossier-resources">
							<h3 id="hero-dossier-resources">Resources</h3>
							<div className="hero-dossier-meters">
								<StatMeter label="HP" value={currentHP} max={maxHP} tone="health" />
								<StatMeter label="Stamina" value={currentStamina} max={maxStamina} tone="stamina" />
								<StatMeter label="Mana" value={currentMana} max={maxMana} tone="mana" />
							</div>
							<div className="hero-dossier-facts">
								<span>Armor <strong>{armor}</strong></span>
								{hpCommitted > 0 && <span>Risk <strong>{hpCommitted} HP</strong></span>}
								{pokerPosition && <span>Seat <strong>{pokerPosition.replace('_', ' ')}</strong></span>}
							</div>
						</section>

						<section className="hero-dossier-section" aria-labelledby="hero-dossier-abilities">
							<h3 id="hero-dossier-abilities">Abilities</h3>
							{heroPower ? (
								<div className="hero-dossier-ability">
									<div className="hero-dossier-ability-heading">
										<strong>{heroPower.name}</strong>
										<span>{heroPower.cost} mana</span>
									</div>
									<p>{heroPower.description}</p>
									{!isOpponent && onHeroPowerClick && (
										<button
											type="button"
											className="hero-dossier-action"
											disabled={!canAffordPower}
											onClick={onHeroPowerClick}
										>
											{canAffordPower ? 'Use hero power' : `Need ${heroPower.cost - currentMana} more mana`}
										</button>
									)}
								</div>
							) : (
								<p className="hero-dossier-muted">No hero power available.</p>
							)}

							{weaponUpgrade && (
								<div className="hero-dossier-ability hero-dossier-ability--secondary">
									<div className="hero-dossier-ability-heading">
										<strong>{weaponUpgrade.name}</strong>
										<span>{isWeaponUpgraded ? 'Upgraded' : 'Weapon upgrade'}</span>
									</div>
									<p>{weaponUpgrade.immediateEffect.description}</p>
									{!isOpponent && onWeaponUpgradeClick && !isWeaponUpgraded && (
										<button type="button" className="hero-dossier-action" disabled={!canUpgrade} onClick={onWeaponUpgradeClick}>
											{canUpgrade ? 'Upgrade weapon' : 'Not enough mana'}
										</button>
									)}
								</div>
							)}
						</section>
					</div>
				</div>

				<footer className="hero-dossier-footer">
					<div className="hero-dossier-statuses">
						<span className="hero-dossier-status-label">Status</span>
						{artifact ? <span className="hero-dossier-tag hero-dossier-tag--artifact">Artifact · {artifact.name}</span> : null}
						{secretsCount > 0 && <span className="hero-dossier-tag">{secretsCount} rune{secretsCount === 1 ? '' : 's'} active</span>}
						{!artifact && secretsCount === 0 && <span className="hero-dossier-muted">No active status effects.</span>}
					</div>
					<div className="hero-dossier-matchup">
						<span className="hero-dossier-status-label">Element</span>
						<span className="hero-dossier-tag hero-dossier-tag--element">{heroElement}</span>
						{elementMatchups?.weakTo.map((element) => (
							<span key={`weak-${element}`} className="hero-dossier-element-chip hero-dossier-element-chip--weak" title={`Weak against ${ELEMENT_LABELS[element]}`}>
								{React.createElement(getElementIcon(element), { 'aria-hidden': true })}
							</span>
						))}
						{elementMatchups?.strongVs.map((element) => (
							<span key={`strong-${element}`} className="hero-dossier-element-chip hero-dossier-element-chip--strong" title={`Strong against ${ELEMENT_LABELS[element]}`}>
								{React.createElement(getElementIcon(element), { 'aria-hidden': true })}
							</span>
						))}
					</div>
					{onOpenEquipment && (
						<button type="button" className="hero-dossier-equipment" onClick={handleEquipmentClick}>
							<GameIcon name="shield" size={14} /> Equipment
						</button>
					)}
				</footer>
			</section>
		</div>,
		portalTarget,
	);
};

export default HeroDossierModal;
