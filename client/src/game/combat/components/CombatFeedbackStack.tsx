import React, { useLayoutEffect } from 'react';
import { useCombatFeedbackStore } from '../feedback/combatFeedbackStore';
import '../styles/combat-feedback.css';

interface CombatFeedbackStackProps {
	readonly combatId: string | null;
}

export function CombatFeedbackStack({ combatId }: CombatFeedbackStackProps) {
	const chips = useCombatFeedbackStore(state => state.stack);
	const sessionId = useCombatFeedbackStore(state => state.sessionId);
	const visibleChips = combatId && sessionId === combatId ? chips : [];

	useLayoutEffect(() => {
		if (!combatId) return undefined;
		return useCombatFeedbackStore.getState().beginSession(combatId);
	}, [combatId]);

	return (
		<div
			className="combat-feedback-stack"
			data-zone="feedback-stack"
			role="status"
			aria-live="polite"
			aria-label="Combat announcements"
		>
			{visibleChips.map((chip, index) => (
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
