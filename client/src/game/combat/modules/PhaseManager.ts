/**
 * PhaseManager - Pure TypeScript combat phase state machine
 * 
 * Manages poker combat phases and turn flow.
 * No React dependencies.
 */

import { CombatPhase } from '../../types/PokerCombatTypes';
import { BettingRoundType } from './BettingEngine';

export interface PhaseState {
        phase: CombatPhase;
        bettingRound: BettingRoundType;
        isPlayerTurn: boolean;
        turnNumber: number;
        communityCardsRevealed: number;
}

export interface PhaseTransition {
        from: CombatPhase;
        to: CombatPhase;
        trigger: string;
}

const PHASE_ORDER: CombatPhase[] = [
        CombatPhase.FIRST_STRIKE,
        CombatPhase.MULLIGAN,
        CombatPhase.SPELL_PET,
        CombatPhase.PRE_FLOP,
        CombatPhase.FAITH,
        CombatPhase.FORESIGHT,
        CombatPhase.DESTINY,
        CombatPhase.RESOLUTION
];

const BETTING_ROUND_MAP: Record<CombatPhase, BettingRoundType | null> = {
        [CombatPhase.MULLIGAN]: null,
        [CombatPhase.FIRST_STRIKE]: null,
        [CombatPhase.SPELL_PET]: null,
        [CombatPhase.PRE_FLOP]: 'preflop',
        [CombatPhase.FAITH]: 'flop',
        [CombatPhase.FORESIGHT]: 'turn',
        [CombatPhase.DESTINY]: 'river',
        [CombatPhase.RESOLUTION]: null
};

export function getNextPhase(currentPhase: CombatPhase): CombatPhase {
        const currentIndex = PHASE_ORDER.indexOf(currentPhase);
        if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
                return CombatPhase.RESOLUTION;
        }
        return PHASE_ORDER[currentIndex + 1];
}

export function getBettingRound(phase: CombatPhase): BettingRoundType | null {
        return BETTING_ROUND_MAP[phase];
}

export function isBettingPhase(phase: CombatPhase): boolean {
        return phase === CombatPhase.PRE_FLOP ||
               phase === CombatPhase.FAITH ||
               phase === CombatPhase.FORESIGHT ||
               phase === CombatPhase.DESTINY;
}

export function isRevealPhase(phase: CombatPhase): boolean {
        return phase === CombatPhase.FAITH || 
               phase === CombatPhase.FORESIGHT || 
               phase === CombatPhase.DESTINY;
}

export function getCommunityCardsToReveal(phase: CombatPhase): number {
        switch (phase) {
                case CombatPhase.FAITH: return 3;
                case CombatPhase.FORESIGHT: return 1;
                case CombatPhase.DESTINY: return 1;
                default: return 0;
        }
}

export function getTotalCommunityCards(phase: CombatPhase): number {
        const phaseIndex = PHASE_ORDER.indexOf(phase);
        const faithIndex = PHASE_ORDER.indexOf(CombatPhase.FAITH);
        const foresightIndex = PHASE_ORDER.indexOf(CombatPhase.FORESIGHT);
        const destinyIndex = PHASE_ORDER.indexOf(CombatPhase.DESTINY);
        
        if (phaseIndex < faithIndex) return 0;
        if (phaseIndex < foresightIndex) return 3;
        if (phaseIndex < destinyIndex) return 4;
        return 5;
}

export function initializePhaseState(): PhaseState {
        return {
                phase: CombatPhase.MULLIGAN,
                bettingRound: 'preflop',
                isPlayerTurn: true,
                turnNumber: 1,
                communityCardsRevealed: 0
        };
}

export function advancePhase(state: PhaseState): PhaseState {
        const nextPhase = getNextPhase(state.phase);
        const newBettingRound = getBettingRound(nextPhase);
        
        return {
                ...state,
                phase: nextPhase,
                bettingRound: newBettingRound || state.bettingRound,
                communityCardsRevealed: getTotalCommunityCards(nextPhase)
        };
}

export function switchTurn(state: PhaseState): PhaseState {
        return {
                ...state,
                isPlayerTurn: !state.isPlayerTurn,
                turnNumber: state.turnNumber + 1
        };
}

export function canActInPhase(phase: CombatPhase): boolean {
        return isBettingPhase(phase);
}
