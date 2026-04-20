import { useState, useCallback } from 'react';
import { CardInstance, CardData } from '../types';
import { useAudio } from '../../lib/stores/useAudio';

export function useCardDetailModal() {
	const [detailCard, setDetailCard] = useState<CardInstance | CardData | null>(null);
	const { playSoundEffect } = useAudio();

	const handleViewCardDetails = useCallback((card: CardInstance | CardData) => {
		setDetailCard(card);
		playSoundEffect('card_hover');
	}, [playSoundEffect]);

	const handleCloseCardDetails = useCallback(() => {
		setDetailCard(null);
	}, []);

	return {
		detailCard,
		handleViewCardDetails,
		handleCloseCardDetails
	};
}
