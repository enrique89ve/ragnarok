/*
 * ChessBattleIntroPhase — presentation barrier before the first chess turn.
 *
 * The board is intentionally not mounted while this phase is active. The
 * authored cue and fixed intro duration own the handoff. Completion
 * advances the FSM, which mounts the board and enables the chess AI on the
 * same state transition. Audio failure must not erase the visual beat.
 */

import React, { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useAudio } from '@/lib/stores/useAudio';
import { useSettingsStore } from '../../../stores/settingsStore';
import './ChessBattleIntroPhase.css';

export type ChessBattleIntroPhaseProps = {
	readonly onComplete: () => void;
};

const CHESS_BATTLE_INTRO_DURATION_MS = 4_700;

const ChessBattleIntroPhase: React.FC<ChessBattleIntroPhaseProps> = ({ onComplete }) => {
	const playAudioCue = useAudio((state) => state.playAudioCue);
	const animationsEnabled = useSettingsStore((state) => state.animationsEnabled);
	const reduceMotionSetting = useSettingsStore((state) => state.reduceMotion);
	const prefersReducedMotion = useReducedMotion();
	const motionEnabled = animationsEnabled && !reduceMotionSetting && prefersReducedMotion !== true;

	useEffect(() => {
		const cancelAudioCue = playAudioCue('chess_battle_intro');
		const completionTimer = globalThis.setTimeout(onComplete, CHESS_BATTLE_INTRO_DURATION_MS);

		return () => {
			cancelAudioCue();
			globalThis.clearTimeout(completionTimer);
		};
	}, [onComplete, playAudioCue]);

	return (
		<div
			className="chess-battle-intro-overlay"
			data-motion={motionEnabled ? 'on' : 'off'}
			role="status"
			aria-live="polite"
			aria-label="War Rune. Preparing the chess battlefield."
		>
			<div className="chess-battle-intro-backdrop" aria-hidden="true" />
			<div className="chess-battle-intro-vignette" aria-hidden="true" />

			<header className="chess-battle-intro-header">
				<span>RAGNAROK // WAR TABLE</span>
			</header>

			<main className="chess-battle-intro-hero">
				<div className="chess-battle-intro-eyebrow">
					<span className="chess-battle-intro-eyebrow__line" aria-hidden="true" />
					<span>THE BATTLEFIELD AWAKENS</span>
					<span className="chess-battle-intro-eyebrow__line" aria-hidden="true" />
				</div>

				<div className="chess-battle-intro-crest" aria-hidden="true">
					<div className="chess-battle-intro-crest__plate" />
					<div className="chess-battle-intro-crest__core" />
					<h1 className="chess-battle-intro-title">
						<span>WAR</span>
						<strong>RUNE</strong>
					</h1>
				</div>

				<p className="chess-battle-intro-subtitle">ENTER THE CHESS FRONT</p>
			</main>

			<footer className="chess-battle-intro-footer">
				<span className="chess-battle-intro-status">
					<span className="chess-battle-intro-status__dot" aria-hidden="true" />
					BATTLEFIELD INITIALIZING
				</span>
			</footer>
		</div>
	);
};

export default ChessBattleIntroPhase;
