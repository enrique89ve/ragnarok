import React, { useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CardInstance } from '../../types';
import SimpleCardCompat, { type SimpleCardStatView } from '../../components/card/SimpleCardCompat';
import { COMBAT_STATE_ICON_MAP, KEYWORD_ICON_MAP } from '../../components/ui/CardIconsSVG';
import { GameIcon } from '../../utils/ui/GameIcon';
import { ARENA_VFX_LAYERS, getArenaVfxLayer } from '../arenaVfxTargets';
import {
	buildCardInspectorModel,
	type CardInspectorFeature,
	type CardInspectorSource,
} from '../cardInspector/cardInspectorModel';

export interface BattlefieldCardInspectorProps {
	readonly card: CardInstance | null;
	readonly source: CardInspectorSource;
	readonly onClose: () => void;
}

interface FeatureListProps {
	readonly title: string;
	readonly features: readonly CardInspectorFeature[];
	readonly emptyLabel: string;
	readonly className?: string;
	readonly iconMap?: Readonly<Record<string, React.FC<React.SVGProps<SVGSVGElement>>>>;
}

const FeatureList: React.FC<FeatureListProps> = ({ title, features, emptyLabel, className = '', iconMap }) => (
	<section className={`card-inspector-section ${className}`.trim()}>
		<h3>{title}</h3>
		{features.length > 0 ? (
			<ul className="card-inspector-feature-list">
				{features.map(feature => {
					const Icon = iconMap?.[feature.id];
					return (
						<li
							key={feature.id}
							className={`card-inspector-feature ${feature.active ? 'is-active' : 'is-inactive'}`}
						>
							<span className="card-inspector-feature-state" aria-hidden="true" />
							<div>
								<div className="card-inspector-feature-heading">
									<div className="card-inspector-feature-name">
										{Icon ? (
											<span className="card-inspector-feature-icon" aria-hidden="true">
												<Icon focusable="false" />
											</span>
										) : null}
										<strong>{feature.name}</strong>
									</div>
									<span className="card-inspector-feature-status">
										{feature.value ?? (feature.active ? 'Active' : 'Inactive')}
									</span>
								</div>
								<p>{feature.description}</p>
							</div>
						</li>
					);
				})}
			</ul>
		) : (
			<p className="card-inspector-empty">{emptyLabel}</p>
		)}
	</section>
);

export const BattlefieldCardInspector: React.FC<BattlefieldCardInspectorProps> = ({ card, source, onClose }) => {
	const dialogRef = useRef<HTMLElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const titleId = useId();
	const descriptionId = useId();
	const model = useMemo(() => card ? buildCardInspectorModel(card, source) : null, [card, source]);

	useEffect(() => {
		if (!model) return undefined;
		const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		closeButtonRef.current?.focus();

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				onClose();
				return;
			}
			if (event.key !== 'Tab') return;
			const dialog = dialogRef.current;
			if (!dialog) return;
			const focusable = dialog.querySelectorAll<HTMLElement>(
				'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
			);
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};

		document.addEventListener('keydown', handleKeyDown, true);
		return () => {
			document.removeEventListener('keydown', handleKeyDown, true);
			previouslyFocused?.focus();
		};
	}, [model, onClose]);

	if (!model) return null;
	const portalTarget = getArenaVfxLayer(ARENA_VFX_LAYERS.modal);
	if (!portalTarget) return null;

	const attack = model.stats.find(stat => stat.label === 'Attack');
	const health = model.stats.find(stat => stat.label === 'Health');
	const statView: SimpleCardStatView = {
		...(attack ? { attack: { value: attack.current, tone: attack.state } } : {}),
		...(health ? { health: { value: health.current, tone: health.state } } : {}),
	};

	return createPortal(
		<div
			className="card-inspector-overlay"
			onPointerDown={event => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<section
				ref={dialogRef}
				className="card-inspector-dialog"
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
				onPointerDown={event => event.stopPropagation()}
			>
				<header className="card-inspector-header">
					<div>
						<span className="card-inspector-kicker">Card dossier · {model.sourceLabel}</span>
						<h2 id={titleId}>{model.card.name}</h2>
					</div>
					<button
						ref={closeButtonRef}
						type="button"
						className="card-inspector-close hover:brightness-110 focus-visible:outline focus-visible:outline-2"
						onClick={onClose}
						aria-label="Close card details"
					>
						<GameIcon name="x" size={20} />
					</button>
				</header>

				<div className="card-inspector-layout">
					<aside className="card-inspector-preview" aria-label="Card preview">
						<section className="card-inspector-preview-sector" aria-labelledby={`${titleId}-preview`}>
							<h3 id={`${titleId}-preview`}>Card preview</h3>
							<div className="card-inspector-preview-frame">
								<SimpleCardCompat
									card={model.card}
									size="preview"
									shape="portrait"
									surface="preview"
									showDescription={false}
									showName={false}
									keywordLabelMode="compact"
									statView={statView}
									disableTooltips
								/>
							</div>
						</section>
						<section
							className="card-inspector-section card-inspector-overview"
							aria-labelledby={`${titleId}-text`}
						>
							<h3 id={`${titleId}-text`}>Card text</h3>
							<p id={descriptionId}>{model.description}</p>
						</section>
					</aside>

					<div className="card-inspector-details">
						<section className="card-inspector-section card-inspector-facts-sector" aria-labelledby={`${titleId}-facts`}>
							<h3 id={`${titleId}-facts`}>Card details</h3>
							<dl className="card-inspector-facts">
								{model.facts.map(fact => (
									<div key={fact.label}>
										<dt>{fact.label}</dt>
										<dd>{fact.value}</dd>
									</div>
								))}
							</dl>
						</section>

						<FeatureList
							className="card-inspector-abilities"
							title="Abilities"
							features={model.keywords}
							emptyLabel="This card has no keyword abilities."
							iconMap={KEYWORD_ICON_MAP}
						/>
						{model.modifiers.length > 0 && (
							<FeatureList
								className="card-inspector-modifiers"
								title="Applied modifiers"
								features={model.modifiers}
								emptyLabel="No modifiers are applied."
							/>
						)}
						<FeatureList
							className="card-inspector-combat-states"
							title="Combat states"
							features={model.combatStates}
							emptyLabel="No combat states are available."
							iconMap={COMBAT_STATE_ICON_MAP}
						/>
					</div>
				</div>

				<footer className="card-inspector-footer">
					<span><kbd>Esc</kbd> Close</span>
					<span>Hand: double-click to inspect · drag to play</span>
				</footer>
			</section>
		</div>,
		portalTarget,
	);
};

export default BattlefieldCardInspector;
