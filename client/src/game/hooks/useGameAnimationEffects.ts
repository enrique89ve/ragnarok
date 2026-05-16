import { useState } from 'react';
import { CardData } from '../types';
import { Position } from '../types/Position';

export interface ActiveMythicCard {
	card: CardData;
	position: Position;
}

export interface ActiveEnvironmentalEffect {
	card: CardData;
	duration: number;
	intensity: 'low' | 'medium' | 'high';
}

export function useGameAnimationEffects() {
	const [activeMythicCard, setActiveMythicCard] = useState<ActiveMythicCard | null>(null);
	const [activeEnvironmentalEffect, setActiveEnvironmentalEffect] = useState<ActiveEnvironmentalEffect | null>(null);

	return {
		activeMythicCard,
		setActiveMythicCard,
		activeEnvironmentalEffect,
		setActiveEnvironmentalEffect
	};
}
