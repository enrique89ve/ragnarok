import { showStatus } from '@/game/combat/feedback/combatFeedbackStore';
import type { GameFeedbackEffectIntent } from '../core/effectIntentTypes';
import { renderGameMessage, type GameMessageRequest } from './gameMessageCatalog';

let textFeedbackSequence = 0;
let messageFeedbackSequence = 0;

export type GameFeedbackRenderer = (effect: GameFeedbackEffectIntent) => void;

const renderFeedbackStack: GameFeedbackRenderer = effect => {
	showStatus(effect.text, effect.tone, effect.durationMs);
};

const feedbackRenderers: Partial<Record<GameFeedbackEffectIntent['presentation'], GameFeedbackRenderer>> = {
	'feedback-stack': renderFeedbackStack,
	toast: renderFeedbackStack,
	banner: renderFeedbackStack,
};

/**
 * Single gameplay-message rendering seam. Gameplay publishers provide an ID
 * and parameters; this adapter owns the current banner/feedback presentation.
 */
export function createGameMessageEffect(request: GameMessageRequest): GameFeedbackEffectIntent {
	const message = renderGameMessage(request);
	messageFeedbackSequence += 1;
	return {
		id: `feedback:${messageFeedbackSequence}:${request.id}`,
		domain: 'shared',
		channel: 'feedback',
		intent: 'state-change',
		kind: 'feedback',
		messageId: request.id,
		text: message.text,
		tone: message.tone,
		presentation: 'feedback-stack',
		durationMs: message.durationMs,
		priority: message.tone === 'error' ? 'high' : 'normal',
		timestamp: Date.now(),
	};
}

/** Current renderer. A future toast/banner renderer can consume the same intent. */
export function renderGameFeedbackEffect(effect: GameFeedbackEffectIntent): void {
	if (effect.presentation === 'silent') return;
	feedbackRenderers[effect.presentation]?.(effect);
}

export function registerGameFeedbackRenderer(
	presentation: Exclude<GameFeedbackEffectIntent['presentation'], 'silent'>,
	renderer: GameFeedbackRenderer,
): () => void {
	const previous = feedbackRenderers[presentation];
	feedbackRenderers[presentation] = renderer;
	return () => {
		if (previous) feedbackRenderers[presentation] = previous;
		else delete feedbackRenderers[presentation];
	};
}

export function createTextFeedbackEffect(
	text: string,
	tone: GameFeedbackEffectIntent['tone'] = 'info',
	durationMs = 2_800,
): GameFeedbackEffectIntent {
	textFeedbackSequence += 1;
	return {
		id: `feedback:text:${textFeedbackSequence}`,
		domain: 'shared',
		channel: 'feedback',
		intent: 'action-result',
		kind: 'feedback',
		messageId: 'feedback.text',
		text,
		tone,
		presentation: 'feedback-stack',
		durationMs,
		priority: tone === 'error' ? 'high' : 'normal',
		timestamp: Date.now(),
	};
}

export function publishTextFeedback(
	text: string,
	tone: GameFeedbackEffectIntent['tone'] = 'info',
	durationMs = 2_800,
): void {
	renderGameFeedbackEffect(createTextFeedbackEffect(text, tone, durationMs));
}

export function publishGameMessage(request: GameMessageRequest): void {
	renderGameFeedbackEffect(createGameMessageEffect(request));
}
