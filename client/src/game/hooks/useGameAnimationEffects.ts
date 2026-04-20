import { useState } from 'react';
import { CardData } from '../types';
import { Position } from '../types/Position';

export interface ActiveLegendaryCard {
	card: CardData;
	position: Position;
}

export interface ActiveEnvironmentalEffect {
	card: CardData;
	duration: number;
	intensity: 'low' | 'medium' | 'high';
}

export function useGameAnimationEffects() {
	const [activeLegendaryCard, setActiveLegendaryCard] = useState<ActiveLegendaryCard | null>(null);
	const [activeEnvironmentalEffect, setActiveEnvironmentalEffect] = useState<ActiveEnvironmentalEffect | null>(null);

	return {
		activeLegendaryCard,
		setActiveLegendaryCard,
		activeEnvironmentalEffect,
		setActiveEnvironmentalEffect
	};
}
