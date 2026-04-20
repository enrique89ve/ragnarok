import { useState, useCallback, useEffect } from 'react';
import { CardInstance } from '../types';
import { useAudio } from '../../lib/stores/useAudio';

export function useCardPositioning(
	playCard: (instanceId: string, targetId?: string, targetType?: 'minion' | 'hero', insertionIndex?: number, payWithBlood?: boolean) => void,
	currentTurn: string
) {
	const [pendingPositionalCard, setPendingPositionalCard] = useState<CardInstance | null>(null);
	const { playSoundEffect } = useAudio();

	const handlePositionSelect = useCallback((insertionIndex: number) => {
		if (!pendingPositionalCard) return;
		const card = pendingPositionalCard;
		setPendingPositionalCard(null);
		playCard(card.instanceId, undefined, undefined, insertionIndex);
		playSoundEffect('card_play');
	}, [pendingPositionalCard, playCard, playSoundEffect]);

	const cancelPositionSelection = useCallback(() => {
		setPendingPositionalCard(null);
	}, []);

	useEffect(() => {
		if (!pendingPositionalCard) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setPendingPositionalCard(null);
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [pendingPositionalCard]);

	useEffect(() => {
		if (currentTurn !== 'player') setPendingPositionalCard(null);
	}, [currentTurn]);

	return {
		pendingPositionalCard,
		setPendingPositionalCard,
		handlePositionSelect,
		cancelPositionSelection
	};
}
