/**
 * <CardPetStageBadge> — slot: pet-evolution roman numeral badge.
 *
 * Renders I/II/III for stages 1-3. Hidden when stage <= 0.
 */

import React from 'react';
import { CARD_CHROME_ICON_MAP } from '../../ui/CardChromeIconsSVG';
import { CARD_CHROME_FAQ_ATTR, getPetStageChromeFaq } from '../cardChromeFaq';

export interface CardPetStageBadgeProps {
	stage: number;
}

const ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III' };
const StageIcon = CARD_CHROME_ICON_MAP.petStage;

const CardPetStageBadge: React.FC<CardPetStageBadgeProps> = ({ stage }) => {
	if (stage <= 0 || stage > 3) return null;
	const faq = getPetStageChromeFaq(stage);
	return (
		<div
			className="card-frame__pet-stage card-frame__chrome-faq"
			aria-label={faq}
			{...{ [CARD_CHROME_FAQ_ATTR]: faq }}
		>
			<StageIcon className="card-frame__chrome-icon" aria-hidden="true" />
			<span className="card-frame__pet-stage-value">{ROMAN[stage]}</span>
		</div>
	);
};

(CardPetStageBadge as React.FC & { displayName?: string }).displayName = 'CardPetStageBadge';

export default CardPetStageBadge;
