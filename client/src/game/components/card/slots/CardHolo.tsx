/**
 * <CardHolo> — slot: parallax holo marker.
 *
 * Marker child. Presence signals <CardFrame> to render the three
 * foil/glitter/glare layers + attach mouse handlers. Renders null;
 * visible effect lives inside the frame root.
 *
 * `mask` lets the consumer override the art-window mask to `full`
 * (matches deckbuilder hero-tile behavior). Default `art-window`.
 *
 * Why a marker instead of inline frame code: keeps the holo opt-in
 * explicit in the consumer JSX, mirrors the plan agent's slot
 * composition recommendation, and avoids frame knowing about
 * cards the consumer doesn't want holo on.
 */

import React from 'react';
import { useCardFrame } from '../CardFrameContext';

export interface CardHoloProps {
	mask?: 'art-window' | 'full';
}

const CardHolo: React.FC<CardHoloProps> = () => {
	// Reads rarity/rootRef so frame can wire effects when this slot
	// is present. The frame context subscription forces a re-render
	// if rarity changes mid-mount, which keeps tier class live.
	useCardFrame();
	return null;
};

export default CardHolo;
