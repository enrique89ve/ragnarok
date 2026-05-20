/**
 * PacksPage — personal vault for sealed packs.
 *
 * After the marketplace split (2026-05-10):
 *   - Buying packs lives in /marketplace?tab=packs
 *   - Starter pack is a free per-account claim (NOT a marketplace product) —
 *     it appears here for the player to claim once.
 *   - This page only shows what you can claim or already OWN.
 */

import React, { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { routes } from '../../../lib/routes';
import { getNFTBridge } from '../../nft';
import { useStarterStore } from '../../stores/starterStore';
import { useDuatClaimStore } from '../../stores/duatClaimStore';
import { useNFTUsername } from '../../nft/hooks';
import { NumericRitual, OrnateCorners, SigilBackplate, type Tier } from '../../../components/ornaments/RunicSigils';
import { SplashBackdrop } from '../../../components/ornaments/SplashBackdrop';
import { MetaPageHeader, MetaPageHeaderLink } from '../../../components/navigation/MetaPageHeader';
import { invokeClientWalletAction } from '../../../data/wallet/clientWalletInvocation';
import CeremonyEvidenceButton from '../CeremonyEvidenceButton';
import {
	recordCeremonyFeedbackEvent,
	type CeremonyKind,
} from '../../protocol/ceremonyFeedback';
import { isDuatAcquisitionProvenance } from '@shared/protocol-core/acquisitionProvenance';
import type { PackAsset } from '@shared/protocol-core/types';

// Lazy — the ceremony modal is a one-time-per-account event.
const StarterPackCeremony = lazy(() => import('../StarterPackCeremony'));
// Lazy — pack reveal ceremony only mounts on demand.
const DuatPackCeremony = lazy(() => import('../DuatPackCeremony'));

const PACK_ICON: Record<string, string> = {
	mythic: '龍',
	premium: '冠',
	standard: '盾',
	starter: '石',
};

const PACK_HEX_VARIANT: Record<string, string> = {
	mythic: 'hex-frame--ember',
	premium: 'hex-frame--gold',
	standard: 'hex-frame--bifrost',
	starter: 'hex-frame--obsidian',
};

const PACK_TIER: Record<string, Tier> = {
	mythic: 'mythic',
	premium: 'premium',
	standard: 'standard',
	starter: 'obsidian',
};

const PACK_INSCRIPTION: Record<string, string> = {
	mythic: 'Owned · Mythic',
	premium: 'Owned · Premium',
	standard: 'Owned · Standard',
	starter: 'Owned · Starter',
};

const PACK_NUMERIC_TIER: Record<string, 'gold' | 'bifrost' | 'ember'> = {
	mythic: 'ember',
	premium: 'gold',
	standard: 'bifrost',
	starter: 'gold',
};

const PACK_SURFACE_VAR: Record<string, string> = {
	mythic: 'var(--surface-mystic-mythic)',
	premium: 'var(--surface-mystic-premium)',
	standard: 'var(--surface-mystic-standard)',
	starter: 'var(--surface-mystic-obsidian)',
};

const PACK_GLOW_CLASS: Record<string, string> = {
	mythic: 'mystic-tile--ember',
	premium: 'mystic-tile--gold',
	standard: 'mystic-tile--bifrost',
	starter: 'mystic-tile--gold',
};

function packIconFor(packType: string): string {
	return PACK_ICON[packType] ?? '石';
}

function packHexVariantFor(packType: string): string {
	return PACK_HEX_VARIANT[packType] ?? 'hex-frame--obsidian';
}

function packTierFor(packType: string): Tier {
	return PACK_TIER[packType] ?? 'obsidian';
}

type PackCeremonySource = 'duat_airdrop' | 'rune_exchange' | 'hbd_purchase' | 'vault';

function getPackCeremonySource(pack: PackAsset): PackCeremonySource {
	if (isDuatAcquisitionProvenance(pack.acquisition)) return 'duat_airdrop';
	if (pack.uid.includes(':rune:')) return 'rune_exchange';
	if (pack.uid.includes(':hbd:')) return 'hbd_purchase';
	return 'vault';
}

function getPackSourceLabel(source: PackCeremonySource): string {
	if (source === 'duat_airdrop') return 'DUAT airdrop';
	if (source === 'rune_exchange') return 'RUNE exchange';
	if (source === 'hbd_purchase') return 'HBD purchase';
	return 'Vault';
}

function getPackSourceInscription(source: PackCeremonySource, packType: string): string {
	if (source === 'duat_airdrop') return `DUAT · ${packType}`;
	if (source === 'rune_exchange') return `RUNE · ${packType}`;
	if (source === 'hbd_purchase') return `HBD · ${packType}`;
	return PACK_INSCRIPTION[packType] ?? 'Owned · Sealed';
}

function getPackOpeningCeremony(source: PackCeremonySource): CeremonyKind {
	if (source === 'duat_airdrop') return 'duat_pack_opening';
	if (source === 'rune_exchange') return 'rune_pack_opening';
	return 'vault_pack_opening';
}

export default function PacksPage() {
	// Re-read on every render — sealed pack inventory mutates after burn/send.
	const sealedPacks = getNFTBridge().getPackCollection().filter(p => p.sealed);

	const hiveUsername = useNFTUsername();
	const starterClaimed = useStarterStore(s => s.hasClaimed(hiveUsername));

	// DUAT airdrop awareness — vault is the primary surface for the claim CTA.
	// The claim has one authority: Hive broadcast + replay. While a broadcast
	// is pending, the card stays visible as a confirmation state instead of
	// minting provisional packs.
	const duatEntry = useDuatClaimStore(s => s.currentUserEntry);
	const duatClaiming = useDuatClaimStore(s => s.claiming);
	const duatPendingClaimTrxId = useDuatClaimStore(s => s.pendingClaimTrxId);
	const claimDuatPacks = useDuatClaimStore(s => s.claimPacks);
	const duatPacksEarned = duatEntry?.packsEarned ?? 0;
	const duatEligible = duatEntry?.eligible ?? false;
	const duatClaimed = duatEntry?.claimed ?? false;
	const duatClaimReady = duatEntry?.claimReady ?? false;
	const duatClaimBlockedReason = duatEntry?.claimBlockedReason ?? null;
	const duatConfirming = duatClaimReady && Boolean(duatPendingClaimTrxId && !duatClaimed);
	const showDuatRow = Boolean(duatEntry) && !duatClaimed;

	const [showCeremony, setShowCeremony] = useState(false);
	const [showPackCeremony, setShowPackCeremony] = useState(false);
	const [packCeremonyFilter, setPackCeremonyFilter] = useState<{
		packType: string;
		packSource: PackCeremonySource;
	} | null>(null);
	const [, forceRerender] = useState(0);

	const refresh = () => forceRerender(n => n + 1);

	const handleDuatClaim = async () => {
		if (!duatEntry || !hiveUsername) return;

		const result = await invokeClientWalletAction(
			{
				kind: 'duat_airdrop_claim',
				authority: 'Posting',
				label: 'Claim DUAT airdrop packs',
			},
			claimDuatPacks,
		);

		refresh();
		if (result.error) {
			recordCeremonyFeedbackEvent('duat_airdrop_claim', 'rejected', {
				account: hiveUsername,
				packsEarned: duatPacksEarned,
				error: result.error,
			});
			toast.error(result.error);
		} else if (result.trxId) {
			recordCeremonyFeedbackEvent('duat_airdrop_claim', 'submitted', {
				account: hiveUsername,
				packsEarned: duatPacksEarned,
				claimTrxId: result.trxId,
			});
			toast.success('Claim submitted. Packs appear after chain confirmation.');
		} else if (duatClaimed) {
			recordCeremonyFeedbackEvent('duat_airdrop_claim', 'already_claimed', {
				account: hiveUsername,
				packsEarned: duatPacksEarned,
			});
			toast(`${duatPacksEarned} sealed packs already claimed`);
		} else {
			recordCeremonyFeedbackEvent('duat_airdrop_claim', 'already_confirming', {
				account: hiveUsername,
				packsEarned: duatPacksEarned,
				claimTrxId: duatPendingClaimTrxId,
			});
			toast('Claim is already confirming on-chain.');
		}
	};

	// Opening a tile launches the sequential pack ceremony — same flow as
	// "Open Now" from the DUAT popup. The ceremony handles burn + reveal +
	// card derivation per pack and exposes Next/Skip controls. Direct burn
	// (without the modal) is intentionally not the /packs path; the user
	// expects to see the cards their packs contained.
	const launchPackCeremony = (packType: string, packSource: PackCeremonySource) => {
		recordCeremonyFeedbackEvent(getPackOpeningCeremony(packSource), 'opened_from_vault', {
			account: hiveUsername,
			packType,
			packSource,
		});
		setPackCeremonyFilter({ packType, packSource });
		setShowPackCeremony(true);
	};

	// Group sealed packs by type. DUAT packs only enter this collection after
	// canonical replay writes them, so every listed pack is openable.
	const openableByType = new Map<string, {
		packType: string;
		packSource: PackCeremonySource;
		packs: typeof sealedPacks;
	}>();
	for (const p of sealedPacks) {
		const packSource = getPackCeremonySource(p);
		const key = `${packSource}:${p.packType}`;
		const entry = openableByType.get(key) ?? {
			packType: p.packType,
			packSource,
			packs: [],
		};
		entry.packs.push(p);
		openableByType.set(key, entry);
	}

	const showStarterRow = !starterClaimed;
	const hasOpenable = openableByType.size > 0;
	const showSealedGrid = hasOpenable;
	const showSubtleEmpty = starterClaimed && !showDuatRow && !showSealedGrid;

	return (
		<main className="h-screen w-full overflow-y-auto overflow-x-hidden bg-(image:--bg-home-nav) text-ink-0">
			<MetaPageHeader
				title="Your Packs"
				kicker="Vault"
				username={hiveUsername}
				accountSecondary={`${sealedPacks.length} sealed`}
				actions={
					<MetaPageHeaderLink
						to={`${routes.marketplace}?tab=packs`}
						icon={ArrowRight}
						iconPosition="end"
					>
						Marketplace
					</MetaPageHeaderLink>
				}
			/>

			<div className="max-w-5xl mx-auto px-4 py-8">
				{/* Starter claim card — only when not yet claimed */}
				{showStarterRow && (
					<StarterClaimCard
						account={hiveUsername}
						onClaim={() => setShowCeremony(true)}
					/>
				)}

				{/* DUAT airdrop state — eligible claim or explicit ineligible snapshot state */}
				{showDuatRow && duatEntry && (
					<DuatClaimCard
						account={hiveUsername}
						packsEarned={duatPacksEarned}
						eligible={duatEligible}
						onClaim={handleDuatClaim}
						loading={duatClaiming}
						confirming={duatConfirming}
						blockedReason={duatClaimBlockedReason}
					/>
				)}

				{/* Optional divider when both sections render together */}
				{(showStarterRow || showDuatRow) && showSealedGrid && (
					<div className="my-8" role="separator" aria-hidden="true">
						<div className="ornament-divider">
							<span className="ornament-divider-mark-trio">
								<span className="ornament-divider-mark ornament-divider-mark--small" />
								<span className="ornament-divider-mark" />
								<span className="ornament-divider-mark ornament-divider-mark--small" />
							</span>
						</div>
					</div>
				)}

				{/* Sealed packs grid */}
				{showSealedGrid && (
					<motion.section
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						aria-labelledby="sealed-inventory-heading"
					>
						{(showStarterRow || showDuatRow) && (
							<header className="section-heading mb-6">
								<div id="sealed-inventory-heading" className="section-heading-kicker">
									Sealed inventory
								</div>
							</header>
						)}
						<div className="grid grid-cols-2 md:grid-cols-4 gap-5">
							{[...openableByType.values()].map(({ packType, packSource, packs: typePacks }) => (
								<SealedPackTile
									key={`open-${packSource}-${packType}`}
									packType={packType}
									packSource={packSource}
									count={typePacks.length}
									onOpen={() => launchPackCeremony(packType, packSource)}
									account={hiveUsername}
								/>
							))}
						</div>
					</motion.section>
				)}

				{/* Empty Cave — when nothing to claim and nothing to open */}
				{showSubtleEmpty && <EmptyCave />}

				{/* Footer CTA — quiet forge entry, hidden only in the empty state */}
				{!showSubtleEmpty && <BuyMorePacksFooter />}
			</div>

			{/* Starter ceremony modal */}
			{showCeremony && (
				<Suspense fallback={null}>
					<StarterPackCeremony
						accountId={hiveUsername}
						onComplete={() => { setShowCeremony(false); refresh(); }}
					/>
				</Suspense>
			)}

			{/* Pack reveal ceremony — sequential burn + reveal with Next/Skip */}
			{showPackCeremony && hiveUsername && (
				<Suspense fallback={null}>
					<DuatPackCeremony
						accountId={hiveUsername}
						packType={packCeremonyFilter?.packType}
						packSource={packCeremonyFilter?.packSource}
						onComplete={() => {
							setShowPackCeremony(false);
							setPackCeremonyFilter(null);
							refresh();
						}}
					/>
				</Suspense>
			)}

		</main>
	);
}

/**
 * Sealed pack tile (vault) — Runic Forge.
 * Smaller and denser than catalog tile: ritual count instead of price,
 * sigil backplate at restrained opacity, no description, no odds.
 */
function SealedPackTile({
	packType,
	packSource,
	count,
	onOpen,
	account,
	pending = false,
}: {
	packType: string;
	packSource: PackCeremonySource;
	count: number;
	onOpen: () => void;
	account: string | null;
	pending?: boolean;
}) {
	const hexVariant = packHexVariantFor(packType);
	const icon = packIconFor(packType);
	const tier = packTierFor(packType);
	const inscription = pending
		? 'Confirming · On-chain'
		: getPackSourceInscription(packSource, packType);
	const numericTier = PACK_NUMERIC_TIER[packType] ?? 'gold';
	const surface = PACK_SURFACE_VAR[packType] ?? 'var(--surface-mystic-obsidian)';
	const glowClass = PACK_GLOW_CLASS[packType] ?? 'mystic-tile--gold';
	const isMythic = packType === 'mythic';
	const reducedMotion = useReducedMotion();

	return (
		<motion.article
			initial={reducedMotion ? false : { opacity: 0, y: 12 }}
			animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
			aria-label={pending
				? `${packType} pack — ${count} confirming on chain`
				: `${packType} sealed pack — ${count} owned`}
			className={`runic-panel ornate-corners-host ornate-corners-host--${tier} mystic-tile ${glowClass} relative rounded-xl p-4 overflow-hidden ${pending ? 'opacity-70' : ''}`}
			style={{ background: surface }}
		>
			{!pending && <SplashBackdrop packKey={packType} count={2} intervalMs={9000} />}
			<OrnateCorners />
			{isMythic && !pending && <span className="aura-mystic" aria-hidden="true" />}

			<div className="relative z-10 flex flex-col items-center mb-4">
				<div className="sigil-host mb-3">
					<SigilBackplate tier={tier} />
					<div className={`hex-frame ${hexVariant} hex-frame--md`} aria-hidden="true">
						<div className="hex-frame-inner">
							<span className="text-3xl text-ink-0/95 select-none">{icon}</span>
						</div>
					</div>
				</div>

				<div className={`tier-inscription tier-inscription--${tier} mb-2`}>
					{inscription}
				</div>

				<NumericRitual tier={numericTier}>
					<span className="numeric-display numeric-display--lg">×{count}</span>
				</NumericRitual>
			</div>

			<div className="relative z-10">
				<button
					type="button"
					onClick={onOpen}
					disabled={pending}
					aria-label={pending
						? `${count} ${packType} pack${count === 1 ? '' : 's'} confirming on chain`
						: `Open one ${getPackSourceLabel(packSource)} ${packType} pack`}
					className="btn-runic btn-runic--gold btn-runic--sm w-full disabled:cursor-not-allowed disabled:opacity-60"
				>
					<span className="btn-runic-stud" aria-hidden />
					{pending ? 'Confirming…' : 'Open'}
					<span className="btn-runic-stud" aria-hidden />
				</button>
				<CeremonyEvidenceButton
					ceremony={getPackOpeningCeremony(packSource)}
					account={account}
					context={{
						packType,
						packSource,
						count,
						location: 'packs_vault_tile',
					}}
					className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-obsidian-700 bg-obsidian-900/55 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300 transition-colors hover:border-gold-500/60 hover:text-gold-200"
				/>
			</div>
		</motion.article>
	);
}

/**
 * Starter claim card — Runic Forge warm parchment treatment.
 * The birthright artifact: ornate corners, etched texture, gold sigil
 * backplate behind the seal icon, ritual heading.
 */
function StarterClaimCard({ account, onClaim }: { account: string | null; onClaim: () => void }) {
	return (
		<motion.section
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			aria-labelledby="starter-claim-heading"
			className="runic-panel ornate-corners-host ornate-corners-host--premium mystic-tile mystic-tile--gold texture-etched relative mb-8 flex items-center gap-6 p-6 rounded-xl flex-wrap sm:flex-nowrap overflow-hidden"
			style={{ background: 'var(--surface-mystic-obsidian)' }}
		>
			<SplashBackdrop packKey="starter" count={2} intervalMs={10000} />
			<OrnateCorners />

			<div className="sigil-host shrink-0 relative z-10">
				<SigilBackplate tier="obsidian" />
				<div className="hex-frame hex-frame--gold hex-frame--md" aria-hidden="true">
					<div className="hex-frame-inner">
						<span className="text-2xl text-gold-300/95">石</span>
					</div>
				</div>
			</div>

			<div className="relative z-10 min-w-0 flex-1">
				<div className="tier-inscription tier-inscription--neutral mb-2">
					Birthright · Unclaimed
				</div>
				<h2 id="starter-claim-heading" className="font-display text-xl font-bold text-ink-0 tracking-[0.10em] uppercase mb-2">
					Your starter line awaits
				</h2>
				<p className="text-ink-200 text-sm leading-snug max-w-[44ch]">
					A 45-card starter line, one-time per profile. No cost.
				</p>
			</div>

			<div className="relative z-10 flex shrink-0 flex-col gap-2">
				<button
					type="button"
					onClick={onClaim}
					className="btn-runic btn-runic--gold"
				>
					<span className="btn-runic-stud" aria-hidden />
					Claim
					<span className="btn-runic-stud" aria-hidden />
				</button>
				<CeremonyEvidenceButton
					ceremony="starter_claim"
					account={account}
					context={{
						source: 'starter_entitlement',
						location: 'packs_vault_card',
						state: 'unclaimed',
					}}
					className="inline-flex items-center justify-center gap-1.5 rounded-md border border-obsidian-700 bg-obsidian-900/55 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300 transition-colors hover:border-gold-500/60 hover:text-gold-200"
				/>
			</div>
		</motion.section>
	);
}

/**
 * DUAT airdrop claim card — Runic Forge bifrost variant.
 * Mirrors StarterClaimCard structure but signals "snapshot legacy" with
 * the bifrost palette (vs. the warm gold of the birthright).
 *
 * Temporary surface — visible only during the 90-day claim window.
 */
function DuatClaimCard({
	account,
	packsEarned,
	eligible,
	onClaim,
	loading,
	confirming,
	blockedReason,
}: {
	account: string | null;
	packsEarned: number;
	eligible: boolean;
	onClaim: () => void;
	loading: boolean;
	confirming: boolean;
	blockedReason: string | null;
}) {
	const blocked = Boolean(blockedReason);
	const disabled = loading || confirming || blocked || !eligible;
	const statusLabel = confirming ? 'Confirming' : !eligible ? 'Ineligible' : blocked ? 'Collection pending' : 'Eligible';
	const heading = eligible
		? `${packsEarned} sealed pack${packsEarned === 1 ? '' : 's'} ${confirming ? 'confirming' : 'await'}`
		: 'No DUAT packs assigned';

	return (
		<motion.section
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			aria-labelledby="duat-claim-heading"
			className="runic-panel ornate-corners-host ornate-corners-host--premium mystic-tile mystic-tile--bifrost texture-etched relative mb-8 flex items-center gap-6 p-6 rounded-xl flex-wrap sm:flex-nowrap overflow-hidden"
			style={{ background: 'var(--surface-mystic-obsidian)' }}
		>
			<SplashBackdrop packKey="standard" count={2} intervalMs={10000} />
			<OrnateCorners />

			<div className="sigil-host shrink-0 relative z-10">
				<SigilBackplate tier="standard" />
				<div className="hex-frame hex-frame--bifrost hex-frame--md" aria-hidden="true">
					<div className="hex-frame-inner">
						<span className="text-2xl text-bifrost-100/95">𓂀</span>
					</div>
				</div>
			</div>

			<div className="relative z-10 min-w-0 flex-1">
				<div className="tier-inscription tier-inscription--standard mb-2">
					DUAT Airdrop · {statusLabel}
				</div>
				<h2 id="duat-claim-heading" className="font-display text-xl font-bold text-ink-0 tracking-[0.10em] uppercase mb-2">
					{heading}
				</h2>
				<p className="text-ink-200 text-sm leading-snug max-w-[44ch]">
					{confirming
						? 'Your claim is on-chain. Packs appear here after replay confirms it.'
						: blockedReason ?? 'Claim once during the 90-day window. Unclaimed packs return to the treasury.'}
				</p>
			</div>

			<div className="relative z-10 flex shrink-0 flex-col gap-2">
				<button
					type="button"
					onClick={onClaim}
					disabled={disabled}
					aria-busy={loading || confirming}
					className="btn-runic btn-runic--bifrost disabled:opacity-60"
				>
					<span className="btn-runic-stud" aria-hidden />
					{loading ? 'Claiming...' : confirming ? 'Confirming...' : !eligible ? 'Not Eligible' : blocked ? 'Collection Pending' : 'Claim Packs'}
					<span className="btn-runic-stud" aria-hidden />
				</button>
				<CeremonyEvidenceButton
					ceremony="duat_airdrop_claim"
					account={account}
					context={{
						packsEarned,
						eligible,
						confirming,
						blockedReason,
						location: 'packs_vault_card',
					}}
					className="inline-flex items-center justify-center gap-1.5 rounded-md border border-obsidian-700 bg-obsidian-900/55 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300 transition-colors hover:border-bifrost-300/60 hover:text-bifrost-100"
				/>
			</div>
		</motion.section>
	);
}

/**
 * Buy-more-packs footer — quiet centered CTA at the bottom of the vault.
 * Restrained on purpose: an ornament divider, a single question line, one
 * gold button. Always reachable without competing with the claim/inventory
 * surfaces above.
 */
function BuyMorePacksFooter() {
	return (
		<footer
			aria-labelledby="buy-more-packs-heading"
			className="mt-16 pt-8 flex flex-col items-center text-center gap-4"
		>
			<div className="ornament-divider max-w-[200px]" role="separator" aria-hidden="true">
				<span className="ornament-divider-mark-trio">
					<span className="ornament-divider-mark ornament-divider-mark--small" />
					<span className="ornament-divider-mark" />
					<span className="ornament-divider-mark ornament-divider-mark--small" />
				</span>
			</div>
			<p id="buy-more-packs-heading" className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-300">
				Want more sealed packs?
			</p>
			<Link
				to={`${routes.marketplace}?tab=packs`}
				aria-label="Open marketplace to buy more sealed packs"
				className="btn-runic btn-runic--gold btn-runic--sm"
			>
				<span className="btn-runic-stud" aria-hidden />
				Buy Packs
				<ArrowRight size={12} strokeWidth={2.4} aria-hidden="true" />
				<span className="btn-runic-stud" aria-hidden />
			</Link>
		</footer>
	);
}

/**
 * Empty Cave — atmospheric empty state. The vault as a sleeping forge.
 *
 * Radial vignette inline darkens the center to suggest depth, ornament-divider
 * trios bracket the composition, the central sigil sits at ~30% opacity so the
 * cave reads as dormant rather than absent. CSS/SVG only — no asset.
 */
function EmptyCave() {
	return (
		<motion.section
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 1.2 }}
			aria-labelledby="empty-cave-heading"
			className="runic-panel ornate-corners-host ornate-corners-host--standard relative mt-12 rounded-xl overflow-hidden"
			style={{
				background:
					'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 70%), var(--surface-mystic-obsidian)',
			}}
		>
			<OrnateCorners />

			<div className="relative z-10 flex flex-col items-center justify-center text-center py-20 px-6">
				<div className="ornament-divider mb-10 max-w-[200px]" role="separator" aria-hidden="true">
					<span className="ornament-divider-mark-trio">
						<span className="ornament-divider-mark ornament-divider-mark--small" />
						<span className="ornament-divider-mark" />
						<span className="ornament-divider-mark ornament-divider-mark--small" />
					</span>
				</div>

				<div className="sigil-host mb-8 opacity-30" aria-hidden="true">
					<SigilBackplate tier="obsidian" />
					<div className="hex-frame hex-frame--obsidian hex-frame--md">
						<div className="hex-frame-inner">
							<span className="text-2xl text-ink-300 select-none">穴</span>
						</div>
					</div>
				</div>

				<div className="font-mono text-[10px] tracking-[0.32em] uppercase text-ink-400 mb-3">
					Vault · Sealed
				</div>
				<h2 id="empty-cave-heading" className="font-display text-xl font-bold text-ink-200/80 tracking-[0.18em] uppercase mb-3">
					The forge sleeps
				</h2>
				<p className="text-ink-300 text-sm leading-relaxed max-w-sm mb-7">
					No packs to claim or open. New packs land here after you buy or claim them.
				</p>

				<Link
					to={`${routes.marketplace}?tab=packs`}
					aria-label="Open marketplace to buy sealed packs"
					className="btn-runic btn-runic--gold btn-runic--sm"
				>
					<span className="btn-runic-stud" aria-hidden />
					Visit marketplace
					<ArrowRight size={12} strokeWidth={2.4} aria-hidden="true" />
					<span className="btn-runic-stud" aria-hidden />
				</Link>

				<div className="ornament-divider mt-10 max-w-[200px]" role="separator" aria-hidden="true">
					<span className="ornament-divider-mark-trio">
						<span className="ornament-divider-mark ornament-divider-mark--small" />
						<span className="ornament-divider-mark" />
						<span className="ornament-divider-mark ornament-divider-mark--small" />
					</span>
				</div>
			</div>
		</motion.section>
	);
}
