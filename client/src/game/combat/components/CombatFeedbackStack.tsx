import React from 'react';
import { useCombatFeedbackStore } from '../feedback/combatFeedbackStore';
import '../styles/combat-feedback.css';

export function CombatFeedbackStack() {
	const chips = useCombatFeedbackStore(state => state.stack);

	return (
		<div
			className="combat-feedback-stack"
			data-zone="feedback-stack"
			role="status"
			aria-live="polite"
			aria-label="Combat announcements"
		>
			{chips.map((chip, index) => (
				<article
					key={chip.id}
					className={`combat-feedback-chip combat-feedback-chip--${chip.tone}`}
					style={{ animationDelay: `${index * 80}ms` }}
				>
					<p className="combat-feedback-chip-copy combat-feedback-chip-title">{chip.title}</p>
					{chip.subtitle ? (
						<p className="combat-feedback-chip-copy combat-feedback-chip-subtitle">{chip.subtitle}</p>
					) : null}
				</article>
			))}
		</div>
	);
}
