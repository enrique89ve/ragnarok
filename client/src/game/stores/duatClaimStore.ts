/**
 * duatClaimStore.ts — DUAT airdrop claim state
 *
 * Single entry point for the claim flow. The browser never statically imports
 * the frozen holder snapshot and never mints provisional packs; it lazy-loads
 * the public snapshot only for the active account lookup, broadcasts one
 * canonical claim, then waits for chain replay to confirm the packs.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { debug } from '../config/debugConfig';
import { getNFTBridge } from '../nft';
import { isHiveMode, isSharedNetworkEnvironment } from '../config/featureFlags';

type DuatClaimError = string | null;

const LOCAL_DEMO_DUAT_PACKS = 3;
const LOCAL_DEMO_CONFIRMATION_MS = 1_200;

interface DuatEligibility {
	account: string;
	packsEarned: number;
	claimed: boolean;
	claimTrxId: string | null;
	claimBlockNum: number | null;
}

export interface DuatClaimResult {
	broadcasted: boolean; // true if the chain broadcast was attempted this call
	trxId: string | null;
	error: DuatClaimError;
}

interface DuatClaimState {
	eligibilityLoaded: boolean;
	eligibilityLoading: boolean;
	dismissed: boolean;
	currentUserEntry: DuatEligibility | null;
	pendingClaimTrxId: string | null;
	claiming: boolean;
	error: DuatClaimError;

	checkAccount: (username: string) => Promise<void>;
	claimPacks: () => Promise<DuatClaimResult>;
	dismiss: () => void;
	reset: () => void;
}

function isSameEligibilityAccount(entry: DuatEligibility | null, username: string): boolean {
	return entry?.account === username.toLowerCase();
}

function isDuatClaimRuntimeEnabled(): boolean {
	return isHiveMode() && isSharedNetworkEnvironment();
}

async function findDuatEligibility(account: string, allowDemoFallback: boolean): Promise<DuatEligibility | null> {
	const [
		{ getDuatPacksFor, lookupDuatSnapshot },
		{ getDuatClaim },
	] = await Promise.all([
		import('@shared/protocol-core/duatSnapshot'),
		import('../../data/blockchain/replayDB'),
	]);

	const entry = lookupDuatSnapshot(account);
	if (!entry && !allowDemoFallback) return null;

	const claim = await getDuatClaim(account);
	return {
		account,
		packsEarned: entry ? getDuatPacksFor(entry) : LOCAL_DEMO_DUAT_PACKS,
		claimed: Boolean(claim),
		claimTrxId: claim?.trxId ?? null,
		claimBlockNum: claim?.blockNum ?? null,
	};
}

function mintLocalDemoDuatPacks(account: string, packsEarned: number, trxId: string): void {
	const bridge = getNFTBridge();
	const prefix = `duat_demo:${account}:`;
	const existing = bridge.getPackCollection().filter(pack => pack.uid.startsWith(prefix)).length;
	if (existing >= packsEarned) return;

	for (let i = existing; i < packsEarned; i++) {
		bridge.addPack({
			uid: `${prefix}${i}`,
			packType: 'standard',
			dna: `demo:${trxId}:${account}:${i}`,
			owner: account,
			sealed: true,
			mintTrxId: trxId,
			mintBlockNum: 0,
			lastTransferBlock: 0,
			cardCount: 5,
			edition: 'alpha',
		});
	}
}

function scheduleClaimRefresh(account: string, checkAccount: (username: string) => Promise<void>): void {
	if (!isDuatClaimRuntimeEnabled() || !getNFTBridge().isHiveMode()) return;

	void (async () => {
		const { forceSync } = await import('../../data/blockchain/replayEngine');
		const tick = (delayMs: number) => setTimeout(() => {
			forceSync(account)
				.then(() => checkAccount(account))
				.catch(err => debug.warn('[DUAT] refresh after claim failed:', err));
		}, delayMs);
		tick(4_000);
		tick(12_000);
	})();
}

export const useDuatClaimStore = create<DuatClaimState>()(
	persist(
		(set, get) => ({
			eligibilityLoaded: false,
			eligibilityLoading: false,
			dismissed: false,
			currentUserEntry: null,
			pendingClaimTrxId: null,
			claiming: false,
			error: null,

			checkAccount: async (username: string) => {
				const normalized = username.toLowerCase();
				if (!normalized) {
					set({
						eligibilityLoaded: false,
						eligibilityLoading: false,
						currentUserEntry: null,
						error: null,
					});
					return;
				}

				if (get().eligibilityLoading && isSameEligibilityAccount(get().currentUserEntry, normalized)) {
					return;
				}

				set({ eligibilityLoading: true, error: null });
				try {
					const eligibility = await findDuatEligibility(normalized, !isDuatClaimRuntimeEnabled());
					set(state => ({
						eligibilityLoaded: true,
						eligibilityLoading: false,
						currentUserEntry: eligibility,
						pendingClaimTrxId: state.pendingClaimTrxId,
						error: null,
					}));
					if (eligibility && !eligibility.claimed) {
						debug.log(`[DUAT] Eligible: @${normalized} -> ${eligibility.packsEarned} packs`);
					}
				} catch (err) {
					const message = err instanceof Error ? err.message : 'DUAT eligibility check failed';
					set({
						eligibilityLoaded: true,
						eligibilityLoading: false,
						currentUserEntry: null,
						error: message,
					});
					debug.warn('[DUAT] Eligibility check failed:', err);
				}
			},

			claimPacks: async () => {
				const { currentUserEntry, claiming, pendingClaimTrxId } = get();
				if (!currentUserEntry || claiming) {
					return { broadcasted: false, trxId: null, error: null };
				}

				if (currentUserEntry.claimed || pendingClaimTrxId) {
					return {
						broadcasted: false,
						trxId: currentUserEntry.claimTrxId ?? pendingClaimTrxId,
						error: null,
					};
				}

				if (!isDuatClaimRuntimeEnabled()) {
					const trxId = `duat-demo-${currentUserEntry.account}-${Date.now()}`;
					set({ pendingClaimTrxId: trxId, claiming: true, error: null });
					window.setTimeout(() => {
						mintLocalDemoDuatPacks(currentUserEntry.account, currentUserEntry.packsEarned, trxId);
						set({
							claiming: false,
							currentUserEntry: {
								...currentUserEntry,
								claimed: true,
								claimTrxId: trxId,
								claimBlockNum: 0,
							},
						});
					}, LOCAL_DEMO_CONFIRMATION_MS);
					return { broadcasted: false, trxId, error: null };
				}

				set({ claiming: true, error: null });
				try {
					const { hiveSync } = await import('../../data/HiveSync');
					const result = await hiveSync.claimDuatAirdrop();
					if (result.success) {
						set({
							pendingClaimTrxId: result.trxId || null,
							claiming: false,
							error: null,
						});
						debug.log(`[DUAT] Claim submitted — trxId: ${result.trxId}`);
						scheduleClaimRefresh(currentUserEntry.account, get().checkAccount);
						return { broadcasted: true, trxId: result.trxId || null, error: null };
					}
					set({ claiming: false, error: result.error ?? 'DUAT claim failed' });
					debug.warn('[DUAT] Claim broadcast failed:', result.error);
					return { broadcasted: true, trxId: null, error: result.error ?? 'DUAT claim failed' };
				} catch (err) {
					const message = err instanceof Error ? err.message : 'DUAT claim failed';
					set({ claiming: false, error: message });
					debug.warn('[DUAT] Claim error:', err);
					return { broadcasted: true, trxId: null, error: message };
				}
			},

			dismiss: () => set(state => ({
				dismissed: true,
				pendingClaimTrxId: state.currentUserEntry?.claimed ? null : state.pendingClaimTrxId,
			})),

			reset: () => set({
				eligibilityLoaded: false,
				eligibilityLoading: false,
				dismissed: false,
				currentUserEntry: null,
				pendingClaimTrxId: null,
				claiming: false,
				error: null,
			}),
		}),
		{
			name: 'ragnarok-duat-claim',
			partialize: (state) => ({
				pendingClaimTrxId: state.pendingClaimTrxId,
				dismissed: state.dismissed,
			}),
		},
	),
);
