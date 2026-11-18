import React, { useState } from 'react';
import { GameViewport } from './GameViewport';
import { ArenaVfxRootContext } from './arenaVfxContext';
import { MulliganScreen } from '../components/MulliganScreen';
import { POKER_VIEWPORT_SAFE_AREA } from '../poker';
import { useGameStore } from '../stores/gameStore';
import { useSettingsStore } from '../stores/settingsStore';

export type OpeningHandMulliganHostProps = {
	readonly chamberActive: boolean;
	readonly onChamberExitSettled?: () => void;
};

/**
 * Lightweight poker_combat shell while opening-hand mulligan runs.
 * Defers the heavy RagnarokCombatArena chunk until the gate clears.
 */
export const OpeningHandMulliganHost: React.FC<OpeningHandMulliganHostProps> = ({
	chamberActive,
	onChamberExitSettled,
}) => {
	const [arenaRoot, setArenaRoot] = useState<HTMLDivElement | null>(null);
	const mulligan = useGameStore(state => state.gameState?.mulligan);
	const playerHand = useGameStore(state => state.gameState?.players?.player?.hand ?? []);
	const animationsEnabled = useSettingsStore(state => state.animationsEnabled);
	const reduceMotion = useSettingsStore(state => state.reduceMotion);
	const mulliganChamberMotion = animationsEnabled && !reduceMotion;

	return (
		<GameViewport
			extraClassName="bg-transparent"
			safeX={POKER_VIEWPORT_SAFE_AREA.safeX}
			safeY={POKER_VIEWPORT_SAFE_AREA.safeY}
			maxScale={POKER_VIEWPORT_SAFE_AREA.maxScale}
			mulliganChamber={chamberActive}
			mulliganChamberMotion={mulliganChamberMotion}
			onMulliganChamberExitSettled={onChamberExitSettled}
		>
			<div
				ref={setArenaRoot}
				className="ragnarok-combat-arena arena-scaled viewport-mode bg-transparent ragnarok-combat-arena--opening-mulligan"
				data-vfx-layer="poker-opening-mulligan"
			>
				<div id="arena-layer-modal" className="layer-modal" />
				<ArenaVfxRootContext.Provider value={arenaRoot}>
					<MulliganScreen mulligan={mulligan} playerHand={playerHand} onMulliganAction={() => {}} snapEntrance />
				</ArenaVfxRootContext.Provider>
			</div>
		</GameViewport>
	);
};

export default OpeningHandMulliganHost;