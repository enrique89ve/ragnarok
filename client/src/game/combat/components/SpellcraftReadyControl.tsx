import React from 'react';
import type { SpellcraftDecisionView } from '../decision/spellcraftDecision';
import { getSpellcraftReadyCopy } from '../decision/spellcraftDecision';

export interface SpellcraftReadyControlProps {
	readonly view: SpellcraftDecisionView;
	readonly onReady: () => void;
}

export const SpellcraftReadyControl: React.FC<SpellcraftReadyControlProps> = ({ view, onReady }) => {
	if (view.status === 'inactive' || view.status === 'mulligan') {
		return null;
	}

	const copy = getSpellcraftReadyCopy(view);
	const ariaLabel = view.canSubmitReady ? 'Ready — finish Spellcraft' : copy.detail;

	return (
		<section
			className="spellcraft-ready-panel"
			data-zone="betting-panel"
			aria-label="Spellcraft controls"
		>
			<div className="spellcraft-ready-layout">
				<button
					type="button"
					className="poker-btn call-btn"
					onClick={onReady}
					disabled={!view.canSubmitReady}
					aria-label={ariaLabel}
					title={copy.detail}
				>
					<span className="btn-icon-frame">
						<span className="btn-action-label">{copy.label}</span>
					</span>
				</button>
				<div className="spellcraft-ready-copy">
					<strong>Spellcraft</strong>
					<p role="status" aria-live="polite">{copy.detail}</p>
				</div>
			</div>
		</section>
	);
};

export default SpellcraftReadyControl;
