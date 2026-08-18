import React from 'react';
import { CombatPhaseDirector } from './CombatPhaseDirector';
import { CombatPhase } from '../../types/PokerCombatTypes';

export interface WagerInfoPanelProps {
	readonly phase: CombatPhase;
	readonly phaseLabel: string;
	readonly headline: string;
	readonly body: string;
	readonly cue: string;
	readonly mode: 'setup' | 'wager' | 'resolution';
	readonly isPlayerTurn: boolean;
	readonly isWaiting: boolean;
	readonly pills?: ReadonlyArray<string>;
}

export const WagerInfoPanel: React.FC<WagerInfoPanelProps> = (props) => {
	return (
		<div
			className="wager-info-panel"
			data-zone="wager-info-panel"
		>
			<CombatPhaseDirector {...props} pills={props.pills ? [...props.pills] : undefined} />
		</div>
	);
};

export default WagerInfoPanel;
