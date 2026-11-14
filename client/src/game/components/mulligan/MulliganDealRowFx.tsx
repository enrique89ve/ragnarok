import React from 'react';
import CardCardBack from '../card/slots/CardCardBack';

interface MulliganDealRowFxProps {
	slotCount: number;
	visible: boolean;
}

/** Fills the hand row before real cards paint — backs + sweep so the lane never feels empty. */
export const MulliganDealRowFx: React.FC<MulliganDealRowFxProps> = ({ slotCount, visible }) => {
	if (!visible || slotCount === 0) return null;

	return (
		<div
			className="mulligan-deal-row__prime"
			aria-hidden="true"
		>
			<div className="mulligan-deal-row__pulse" />
			<div className="mulligan-deal-row__sweep" />
			<div className="mulligan-deal-row__channel" />
			<div className="mulligan-deal-row__ghosts">
				{Array.from({ length: slotCount }, (_, index) => (
					<div
						key={`ghost-${index}`}
						className="mulligan-deal-row__ghost"
						style={{ '--mulligan-ghost-i': index } as React.CSSProperties}
					>
						<CardCardBack />
					</div>
				))}
			</div>
		</div>
	);
};
