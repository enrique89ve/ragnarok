import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { getDefaultArmySelection } from '../../data/ChessPieceConfig';
import type { CampaignChapter, CampaignMission } from '../../campaign';
import type { InitialFlowInput, PostCinematicPlan, RoundFlowState } from '../../flow/round/types';
import type { ArmySelection } from '../../types/ChessTypes';
import type { RealmId } from '../../types/NorseTypes';
import { useGameStore } from '../../stores/gameStore';
import type { SoundEffectType } from '../../../lib/stores/useAudio';

type CampaignData = {
  readonly mission: CampaignMission;
  readonly chapter: CampaignChapter;
} | null;

type ActiveRealmInput = {
  readonly isCampaign: boolean;
  readonly missionRealm: string | undefined;
  readonly visualRealm: RealmId;
  readonly realmDisplayName: string;
};

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
  readonly initializeBoard: (playerArmy: ArmySelection, opponentArmy: ArmySelection) => void;
  readonly resetBossRulesApplied: () => void;
  readonly playSoundEffect: (sound: SoundEffectType) => void;
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

export function useCampaignGameBootstrap(input: CampaignGameBootstrapInput): void {
  useEffect(() => {
    if (!input.isCampaign || !input.missionRealm) return;

    useGameStore.getState().setGameState({
      activeRealm: {
        id: input.visualRealm,
        name: input.realmDisplayName,
        description: '',
        owner: 'player',
        effects: [],
      },
    });
  }, [input.isCampaign, input.missionRealm, input.realmDisplayName, input.visualRealm]);

  useEffect(() => {
    if (input.flowState !== null) return;

    if (input.effectiveInitialArmy && !input.isCampaign) {
      input.startFlow({ kind: 'chess' });
      return;
    }

    if (!input.isCampaign || !input.campaignData) return;

    const intro = input.campaignData.chapter.cinematicIntro;
    const narrative = input.campaignData.mission.narrativeBefore;
    const planAfterCinematic = buildPostCinematicPlan(input.campaignData);

    if (input.hasCinematic && intro) {
      input.startFlow({
        kind: 'cinematic',
        cinematic: { chapterId: input.campaignData.chapter.id, intro },
        then: planAfterCinematic,
      });
      return;
    }

    if (narrative) {
      input.startFlow({
        kind: 'mission_intro',
        mission: {
          missionId: input.campaignData.mission.id,
          narrativeBefore: narrative,
          isChapterFinale: !!input.campaignData.mission.isChapterFinale,
        },
      });
      return;
    }

    input.startFlow({ kind: 'chess' });
  }, [
    input.campaignData,
    input.effectiveInitialArmy,
    input.flowState,
    input.hasCinematic,
    input.isCampaign,
    input.startFlow,
  ]);

  useEffect(() => {
    if (!input.isCampaign || input.playerArmy || input.initialArmy) return;

    const defaultArmy = getDefaultArmySelection();
    input.setPlayerArmy(defaultArmy);
    input.initializeBoard(defaultArmy, input.opponentArmy);
    input.resetBossRulesApplied();

    if (!input.hasCinematic && !input.campaignData?.mission.narrativeBefore) {
      input.playSoundEffect('game_start');
    }
  }, [
    input.campaignData,
    input.hasCinematic,
    input.initialArmy,
    input.initializeBoard,
    input.isCampaign,
    input.opponentArmy,
    input.playSoundEffect,
    input.playerArmy,
    input.resetBossRulesApplied,
    input.setPlayerArmy,
  ]);
}
