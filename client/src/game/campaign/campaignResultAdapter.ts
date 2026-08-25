import { canonicalStringify, sha256Hash } from '@/data/blockchain/hashUtils';
import {
	getCampaignRun,
	putCampaignRun,
	type CampaignRunRecord,
} from '@/data/blockchain/replayDB';
import {
	CAMPAIGN_ID,
	CAMPAIGN_REGISTRY_HASH,
} from '@shared/campaign/constants';
import type { CampaignResultBroadcastPayload, BroadcastResult } from '../nft/INFTBridge';
import { getNFTBridge } from '../nft';
import type { Difficulty } from './campaignTypes';
import type { MatchEndContext } from '../match/onWinDispatch';
import type { MatchContext } from '../match/types';
import { commitProgressAccountId } from '../auth/progressAccount';
import { getRagnarokNetworkConfig } from '../config/networkConfig';

interface CampaignRunStartInput {
	readonly missionId: string;
	readonly difficulty: Difficulty;
	readonly account?: string | null;
}

interface CampaignResultBuildInput {
	readonly run: CampaignRunRecord;
	readonly account: string;
	readonly matchId: string;
	readonly matchSeed: string;
	readonly turnCount: number;
}

interface CampaignResultArtifacts {
	readonly payload: CampaignResultBroadcastPayload;
	readonly transcriptRoot: string;
	readonly finalStateHash: string;
}

function createLocalRunId(): string {
	return globalThis.crypto?.randomUUID?.()
		?? `campaign-run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getRunAccount(account?: string | null): string | null {
	return commitProgressAccountId(account, getRagnarokNetworkConfig().stage);
}

export function createCampaignRunDraft(input: CampaignRunStartInput): CampaignRunRecord | null {
	const account = getRunAccount(input.account);
	if (!account) return null;
	const localStartedAt = Date.now();
	return {
		localRunId: createLocalRunId(),
		account,
		campaignId: CAMPAIGN_ID,
		missionId: input.missionId,
		difficulty: input.difficulty,
		registryHash: CAMPAIGN_REGISTRY_HASH,
		nonce: localStartedAt,
		localStartedAt,
		status: 'started',
		createdAt: localStartedAt,
		updatedAt: localStartedAt,
	};
}

export async function recordCampaignRunStart(input: CampaignRunStartInput): Promise<CampaignRunRecord | null> {
	const run = createCampaignRunDraft(input);
	if (!run) return null;
	await putCampaignRun(run);
	return run;
}

export async function saveCampaignRunDraft(run: CampaignRunRecord): Promise<CampaignRunRecord> {
	await putCampaignRun(run);
	return run;
}

export async function buildCampaignResultArtifacts(
	input: CampaignResultBuildInput,
): Promise<CampaignResultArtifacts> {
	const base = {
		account: input.account,
		campaignId: input.run.campaignId,
		difficulty: input.run.difficulty,
		localRunId: input.run.localRunId,
		localStartedAt: input.run.localStartedAt,
		matchId: input.matchId,
		matchSeed: input.matchSeed,
		missionId: input.run.missionId,
		nonce: input.run.nonce,
		registryHash: input.run.registryHash,
		result: 'win',
		turnCount: input.turnCount,
	};
	const transcriptRoot = await sha256Hash(canonicalStringify({
		...base,
		domain: 'ragnarok:campaign:transcript:v1',
	}));
	const finalStateHash = await sha256Hash(canonicalStringify({
		...base,
		domain: 'ragnarok:campaign:final-state:v1',
	}));

	return {
		transcriptRoot,
		finalStateHash,
		payload: {
			v: 1,
			cid: input.run.campaignId,
			m: input.run.missionId,
			d: input.run.difficulty,
			n: input.run.nonce,
			rid: input.run.localRunId,
			lst: input.run.localStartedAt,
			rh: input.run.registryHash,
			tr: transcriptRoot,
			fh: finalStateHash,
			t: input.turnCount,
		},
	};
}

async function getRunForMatch(ctx: MatchContext): Promise<CampaignRunRecord> {
	if (ctx.opponent.kind !== 'scripted' || ctx.opponent.script.kind !== 'campaign-mission') {
		throw new Error('not a campaign match');
	}

	const localRunId = ctx.opponent.script.localRunId;
	const existing = localRunId ? await getCampaignRun(localRunId) : undefined;
	if (existing) return existing;

	const started = await recordCampaignRunStart({
		account: getNFTBridge().getUsername(),
		missionId: ctx.opponent.script.mission.id,
		difficulty: ctx.opponent.script.difficulty,
	});
	if (!started) throw new Error('campaign run requires a Hive account on shared testnet');
	return started;
}

export async function publishCampaignVictoryResult(
	ctx: MatchContext,
	end: MatchEndContext,
): Promise<BroadcastResult> {
	if (!end.iWon) return { success: false, error: 'campaign result requires a win' };

	const bridge = getNFTBridge();
	const run = await getRunForMatch(ctx);
	const account = getRunAccount(bridge.getUsername() ?? run.account);
	if (!account) return { success: false, error: 'Hive account required to publish a campaign result.' };
	const artifacts = await buildCampaignResultArtifacts({
		run,
		account,
		matchId: ctx.matchId,
		matchSeed: ctx.matchSeed,
		turnCount: end.turnCount,
	});
	const wonRun: CampaignRunRecord = {
		...run,
		account,
		matchId: ctx.matchId,
		matchSeed: ctx.matchSeed,
		turnCount: end.turnCount,
		transcriptRoot: artifacts.transcriptRoot,
		finalStateHash: artifacts.finalStateHash,
		status: 'won',
		updatedAt: Date.now(),
	};
	await putCampaignRun(wonRun);

	const result = await bridge.submitCampaignResult(artifacts.payload);
	await putCampaignRun({
		...wonRun,
		status: result.success ? 'published' : 'rejected',
		publishedTrxId: result.trxId,
		publishedBlockNum: result.blockNum,
		publishedAt: result.success ? Date.now() : undefined,
		lastError: result.error,
		updatedAt: Date.now(),
	});

	return result;
}
