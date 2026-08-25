import type { ProtocolPhasePolicy } from '@shared/protocolPhase';

export type DailyQuestClaimPresentation = Readonly<{
	mode: 'local' | 'hive';
	buttonLabel: 'Commit' | 'Claim';
	buttonTitle: string;
	icon: 'local' | 'wallet';
	claimableDetail: (count: number, claimedCount: number) => string;
	recordedDetail: string;
	emptyDetail: string;
	infoClaimTiming: string;
	infoReset: string;
}>;

/** Derives quest copy from the active protocol policy; it is not a second capability matrix. */
export function getDailyQuestClaimPresentation(
	policy: ProtocolPhasePolicy,
): DailyQuestClaimPresentation {
	if (policy.localSettlement) {
		return {
			mode: 'local',
			buttonLabel: 'Commit',
			buttonTitle: 'Commit completed daily quests to local IndexedDB replay. No wallet or broadcast.',
			icon: 'local',
			claimableDetail: (count, claimedCount) =>
				`${count} completed slot${count === 1 ? '' : 's'} ready for a local IndexedDB replay commit. ${claimedCount} already recorded.`,
			recordedDetail: 'RUNE is committed to local IndexedDB replay for this reset epoch. Duplicate commits are no-ops.',
			emptyDetail: 'Complete a listed quest, then commit the reward to local IndexedDB replay.',
			infoClaimTiming: 'Completed quests become Pending. In Gameplay Validation, Commit writes the RUNE entry atomically to local IndexedDB/replay; no wallet, Hive broadcast, or prompt is used.',
			infoReset: 'New quests arrive at midnight UTC. Local claims belong to the current reset epoch and are resettable; they are not Hive-canonical.',
		};
	}

	return {
		mode: 'hive',
		buttonLabel: 'Claim',
		buttonTitle: 'Claim completed daily quests through the explicit Hive replay flow.',
		icon: 'wallet',
		claimableDetail: (count, claimedCount) =>
			`${count} completed slot${count === 1 ? '' : 's'} ready for an explicit Hive claim. ${claimedCount} already recorded.`,
		recordedDetail: 'Hive acceptance remains awaiting replay until the signed claim is confirmed; duplicate claims are no-ops.',
		emptyDetail: 'Complete a listed quest, then explicitly claim the reward through Hive replay.',
		infoClaimTiming: 'Completed quests become Pending. In Hive mode, use Claim to open the explicit wallet flow; replay confirms the RUNE after the signed operation is accepted.',
		infoReset: 'New quests arrive at midnight UTC. A completed but unclaimed slot expires with the day; Hive replay uses the UTC day of inclusion.',
	};
}
