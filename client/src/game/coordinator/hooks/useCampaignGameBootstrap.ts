import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { getDefaultArmySelection } from '../../data/ChessPieceConfig';
import type { CampaignChapter, CampaignMission } from '../../campaign';
import type { InitialFlowInput, PostCinematicPlan, RoundFlowState } from '../../flow/round/types';
import type { ArmySelection } from '../../types/ChessTypes';
import type { RealmId } from '../../types/NorseTypes';
import type { RealmState } from '../../types';
import { useGameStore } from '../../stores/gameStore';
import { cryptoIdGen } from '../../utils/seededRng';
import type { SoundEffectType } from '../../../lib/stores/useAudio';

type CampaignData = {
  readonly mission: CampaignMission;
  readonly chapter: CampaignChapter;
} | null;

export type CampaignActiveRealmSyncInput = {
  readonly isCampaign: boolean;
  readonly missionRealm: string | undefined;
  readonly visualRealm: RealmId;
  readonly realmDisplayName: string;
};

type ActiveRealmInput = CampaignActiveRealmSyncInput;

type FlowBootstrapInput = {
  readonly flowState: RoundFlowState | null;
  readonly effectiveInitialArmy: ArmySelection | null;
  readonly isCampaign: boolean;
  readonly hasCinematic: boolean;
  readonly campaignData: CampaignData;
  readonly startFlow: (input: InitialFlowInput) => void;
};

type BoardBootstrapInput = {
  readonly isCampaign: boolean;
  readonly campaignData: CampaignData;
  readonly hasCinematic: boolean;
  readonly initialArmy: ArmySelection | null;
  readonly playerArmy: ArmySelection | null;
  readonly opponentArmy: ArmySelection;
  readonly setPlayerArmy: Dispatch<SetStateAction<ArmySelection | null>>;
  readonly initializeBoard: (playerArmy: ArmySelection, opponentArmy: ArmySelection, idGen: () => string) => void;
  readonly resetBossRulesApplied: () => void;
  readonly playSoundEffect: (sound: SoundEffectType) => void;
};

export type CampaignBoardBootstrapGuardInput = {
  readonly isCampaign: boolean;
  readonly playerArmy: ArmySelection | null;
  readonly initialArmy: ArmySelection | null;
  readonly alreadyBootstrapped: boolean;
};

type CampaignGameBootstrapInput =
  & ActiveRealmInput
  & FlowBootstrapInput
  & BoardBootstrapInput;

function buildPostCinematicPlan(campaignData: NonNullable<CampaignData>): PostCinematicPlan {
  const narrative = campaignData.mission.narrativeBefore;

  if (!narrative) {
    return { kind: 'chess' };
  }

  return {
    kind: 'intro',
    mission: {
      missionId: campaignData.mission.id,
      narrativeBefore: narrative,
      isChapterFinale: !!campaignData.mission.isChapterFinale,
    },
  };
}

function isMatchingCampaignRealm(
  activeRealm: RealmState | undefined,
  visualRealm: RealmId,
  realmDisplayName: string,
): boolean {
  return activeRealm?.id === visualRealm && activeRealm.name === realmDisplayName;
}

export function syncCampaignActiveRealm(input: CampaignActiveRealmSyncInput): boolean {
  if (!input.isCampaign || !input.missionRealm) return false;

  const { activeRealm } = useGameStore.getState().gameState;
  if (isMatchingCampaignRealm(activeRealm, input.visualRealm, input.realmDisplayName)) {
    return false;
  }

  useGameStore.getState().setGameState({
    activeRealm: {
      id: input.visualRealm,
      name: input.realmDisplayName,
      description: '',
      owner: 'player',
      effects: [],
    },
  });

  return true;
}

export function shouldBootstrapCampaignBoard(input: CampaignBoardBootstrapGuardInput): boolean {
  return input.isCampaign
    && !input.alreadyBootstrapped
    && !input.playerArmy
    && !input.initialArmy;
}

export function useCampaignGameBootstrap(input: CampaignGameBootstrapInput): void {
  const {
    isCampaign,
    missionRealm,
    realmDisplayName,
    visualRealm,
    flowState,
    effectiveInitialArmy,
    hasCinematic,
    campaignData,
    startFlow,
    initialArmy,
    playerArmy,
    opponentArmy,
    setPlayerArmy,
    initializeBoard,
    resetBossRulesApplied,
    playSoundEffect,
  } = input;
  const boardBootstrappedRef = useRef(false);

  useEffect(() => {
    syncCampaignActiveRealm({ isCampaign, missionRealm, realmDisplayName, visualRealm });
  }, [isCampaign, missionRealm, realmDisplayName, visualRealm]);

  useEffect(() => {
    if (flowState !== null) return;

    if (effectiveInitialArmy && !isCampaign) {
      startFlow({ kind: 'chess' });
      return;
    }

    if (!isCampaign || !campaignData) return;

    const intro = campaignData.chapter.cinematicIntro;
    const narrative = campaignData.mission.narrativeBefore;
    const planAfterCinematic = buildPostCinematicPlan(campaignData);

    if (hasCinematic && intro) {
      startFlow({
        kind: 'cinematic',
        cinematic: { chapterId: campaignData.chapter.id, intro },
        then: planAfterCinematic,
      });
      return;
    }

    if (narrative) {
      startFlow({
        kind: 'mission_intro',
        mission: {
          missionId: campaignData.mission.id,
          narrativeBefore: narrative,
          isChapterFinale: !!campaignData.mission.isChapterFinale,
        },
      });
      return;
    }

    startFlow({ kind: 'chess' });
  }, [
    campaignData,
    effectiveInitialArmy,
    flowState,
    hasCinematic,
    isCampaign,
    startFlow,
  ]);

  useEffect(() => {
    if (!isCampaign) {
      boardBootstrappedRef.current = false;
      return;
    }

    if (!shouldBootstrapCampaignBoard({
      isCampaign,
      playerArmy,
      initialArmy,
      alreadyBootstrapped: boardBootstrappedRef.current,
    })) {
      return;
    }

    boardBootstrappedRef.current = true;
    const defaultArmy = getDefaultArmySelection();
    setPlayerArmy(defaultArmy);
    initializeBoard(defaultArmy, opponentArmy, cryptoIdGen);
    resetBossRulesApplied();

    if (!hasCinematic && !campaignData?.mission.narrativeBefore) {
      playSoundEffect('game_start');
    }
  }, [
    campaignData,
    hasCinematic,
    initialArmy,
    initializeBoard,
    isCampaign,
    opponentArmy,
    playSoundEffect,
    playerArmy,
    resetBossRulesApplied,
    setPlayerArmy,
  ]);
}
