import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { routes } from '../../lib/routes';
import { getWarbandEntryRoute } from '../../lib/warbandRoutes';
import { getStarterCards, STARTER_PACK_NAME } from '../data/starterSet';
import { claimStarterEntitlement } from '../data/starterClaim';
import PackOpeningAnimation from './packs/PackOpeningAnimation';
import TreasureChestSVG from './packs/TreasureChestSVG';
import CeremonyEvidenceButton from './CeremonyEvidenceButton';
import { recordCeremonyFeedbackEvent } from '../protocol/ceremonyFeedback';

interface StarterPackCeremonyProps {
	accountId?: string | null;
	/** Called when the ceremony finishes (claim succeeded or user cancelled). */
	onComplete: () => void;
	/**
	 * Called when the user explicitly cancels (no claim happened).
	 * Defaults to onComplete. Provide separately when "cancel" should not
	 * trigger the same side-effects as a successful completion.
	 */
	onCancel?: () => void;
}

const TITLE_ID = 'starter-ceremony-title';
const DESC_ID = 'starter-ceremony-desc';

type CeremonyPhase = 'welcome' | 'opening' | 'mode-select';

export default function StarterPackCeremony({
	accountId,
	onComplete,
	onCancel,
}: StarterPackCeremonyProps) {
	const [phase, setPhase] = useState<CeremonyPhase>('welcome');
	const [isClaiming, setIsClaiming] = useState(false);
	const [claimError, setClaimError] = useState<string | null>(null);
	const navigate = useNavigate();
	const claimButtonRef = useRef<HTMLButtonElement | null>(null);

	const starterCards = getStarterCards();

	const revealCards = starterCards.map(card => ({
		id: card.id as number,
		name: card.name,
		rarity: (card.rarity || 'common') as string,
		type: card.type as string,
		heroClass: 'class' in card ? (card as { class: string }).class : 'Neutral',
	}));

	const handleCancel = useCallback(() => {
		if (isClaiming) return;
		recordCeremonyFeedbackEvent('starter_claim', 'cancelled', {
			account: accountId ?? null,
			cardCount: starterCards.length,
		});
		(onCancel ?? onComplete)();
	}, [accountId, isClaiming, onCancel, onComplete, starterCards.length]);

	const handleClaimBirthright = useCallback(async () => {
		if (isClaiming) return;

		setIsClaiming(true);
		setClaimError(null);
		recordCeremonyFeedbackEvent('starter_claim', 'started', {
			account: accountId ?? null,
			cardCount: starterCards.length,
		});
		const result = await claimStarterEntitlement({
			accountId,
		});
		setIsClaiming(false);

		if (!result.success) {
			setClaimError(result.error);
			recordCeremonyFeedbackEvent('starter_claim', 'failed', {
				account: accountId ?? null,
				error: result.error,
			});
			return;
		}

		recordCeremonyFeedbackEvent('starter_claim', 'revealed', {
			account: accountId ?? null,
			cardCount: result.cards.length,
			source: 'starter_entitlement',
		});
		setPhase('opening');
	}, [accountId, isClaiming, starterCards.length]);

	// Both the close (X / backdrop / "Done") and the explicit "Continue" path
	// land on the mode-select phase — the player chooses where to play first.
	// No skip: the starter ceremony intentionally forces a decision so the
	// onboarding never dead-ends in a "now what?" state.
	const handlePackClose = useCallback(() => {
		setPhase('mode-select');
	}, []);

	const handlePlayFirstGame = useCallback(() => {
		setPhase('mode-select');
	}, []);

	const handleChooseMode = useCallback(
		(target: string) => {
			onComplete();
			navigate(target);
		},
		[navigate, onComplete],
	);

	// Escape key handler — only active in welcome phase, never while claiming.
	useEffect(() => {
		if (phase !== 'welcome') return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && !isClaiming) {
				event.preventDefault();
				handleCancel();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [phase, isClaiming, handleCancel]);

	// Initial focus moves to the primary action so keyboard users land on it.
	useEffect(() => {
		if (phase === 'welcome') claimButtonRef.current?.focus();
	}, [phase]);

	if (phase === 'opening') {
		return (
			<div>
				<PackOpeningAnimation
					packName={STARTER_PACK_NAME}
					cards={revealCards}
					onClose={handlePackClose}
					onOpenAnother={handlePlayFirstGame}
					oneShot
					evidence={{
						ceremony: 'starter_claim',
						account: accountId ?? null,
						context: {
							cardCount: revealCards.length,
							source: 'starter_entitlement',
							claimState: 'revealed',
						},
					}}
				/>
			</div>
		);
	}

	if (phase === 'mode-select') {
		return <ModeSelect onChoose={handleChooseMode} onClose={onComplete} />;
	}

	return (
		<AnimatePresence>
			{phase === 'welcome' && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					role="dialog"
					aria-modal="true"
					aria-labelledby={TITLE_ID}
					aria-describedby={DESC_ID}
					className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/95 backdrop-blur-sm p-4"
					onClick={(event) => {
						// Backdrop click cancels — only the overlay element itself, not the card.
						if (event.target === event.currentTarget) handleCancel();
					}}
				>
					{/* Close X — always reachable in the corner of the viewport */}
					<button
						type="button"
						onClick={handleCancel}
						disabled={isClaiming}
						aria-label="Cancel and close"
						className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full border border-obsidian-700 bg-obsidian-900/80 text-ink-300 hover:text-gold-300 hover:border-gold-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
					>
						<X size={16} aria-hidden="true" />
					</button>

					<motion.div
						initial={{ scale: 0.85, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ type: 'spring', stiffness: 200, damping: 20 }}
						className="text-center max-w-lg w-full px-6 modal-landscape-safe"
						onClick={(event) => event.stopPropagation()}
					>
						<motion.div
							animate={{ y: [0, -10, 0] }}
							transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
							className="mb-6 flex justify-center"
						>
							<TreasureChestSVG state="closed" size={260} />
						</motion.div>

						<h1
							id={TITLE_ID}
							className="font-display text-4xl font-black tracking-[0.10em] uppercase mb-4 text-transparent bg-clip-text bg-linear-to-b from-gold-100 via-gold-300 to-gold-500"
						>
							Welcome, Warrior
						</h1>

						<p className="text-ink-200 text-lg mb-2 leading-relaxed">
							The Norns have foreseen your arrival.
						</p>
						<p id={DESC_ID} className="text-ink-300 text-base mb-8 leading-relaxed">
							Reveal your birthright — a set of {starterCards.length} starter cards
							to begin your journey across the Nine Realms.
						</p>

						<button
							ref={claimButtonRef}
							type="button"
							onClick={handleClaimBirthright}
							disabled={isClaiming}
							className="btn-runic btn-runic--gold btn-runic--lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-200 focus-visible:outline-offset-2"
						>
							<span className="btn-runic-stud" aria-hidden />
							{isClaiming ? 'Signing...' : 'Reveal Your Birthright'}
							<span className="btn-runic-stud" aria-hidden />
						</button>

						{claimError && (
							<p role="alert" className="text-ember-300 text-sm mt-4">
								{claimError}
							</p>
						)}

						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 1.2 }}
							className="mt-7 max-w-[260px] mx-auto"
							role="separator"
							aria-hidden="true"
						>
							<div className="ornament-divider">
								<span className="ornament-divider-mark ornament-divider-mark--small" />
							</div>
						</motion.div>

						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 1.5 }}
							className="font-mono text-ink-400 text-[11px] tracking-[0.22em] uppercase mt-4"
						>
							{starterCards.length} starter cards · Common rarity · Ready to battle
						</motion.p>

						{/* Secondary cancel — visible escape route below the primary CTA */}
						<button
							type="button"
							onClick={handleCancel}
							disabled={isClaiming}
							className="mt-5 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.22em] uppercase text-ink-400 hover:text-ink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 focus-visible:outline-offset-2 rounded-sm"
						>
							Maybe later
						</button>
						<div className="mt-3">
							<CeremonyEvidenceButton
								ceremony="starter_claim"
								account={accountId ?? null}
								context={{
									cardCount: starterCards.length,
									source: 'starter_entitlement',
									claimState: claimError ? 'error' : 'welcome',
									claimError,
								}}
								className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.22em] uppercase text-ink-400 hover:text-gold-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 focus-visible:outline-offset-2 rounded-sm"
							/>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

// Three-mode chooser shown after the starter pack ceremony. Replaces the
// hard-coded redirect to /campaign so the player picks the entry point — no
// skip, the decision is part of onboarding.
type GameMode = {
	key: 'campaign' | 'single' | 'multiplayer';
	title: string;
	kicker: string;
	description: string;
	route: string;
	glyph: string;
	tier: 'premium' | 'standard' | 'mythic';
};

const GAME_MODES: readonly GameMode[] = [
	{
		key: 'campaign',
		title: 'Campaign',
		kicker: 'Story · 9 Realms',
		description: 'Travel the Nine Realms and unlock missions one by one.',
		route: routes.campaign,
		glyph: '盾',
		tier: 'premium',
	},
	{
		key: 'single',
		title: 'Quick Match',
		kicker: 'Practice · vs AI',
		description: 'Muster a warband, then test it against an AI opponent.',
		route: getWarbandEntryRoute('single'),
		glyph: '剣',
		tier: 'standard',
	},
	{
		key: 'multiplayer',
		title: 'Multiplayer',
		kicker: 'PvP · Live opponents',
		description: 'Muster a warband, then match against another warrior.',
		route: getWarbandEntryRoute('multiplayer'),
		glyph: '龍',
		tier: 'mythic',
	},
];

function ModeSelect({ onChoose, onClose }: { onChoose: (target: string) => void; onClose: () => void }) {
	// Escape closes the modal in mode-select; the player has already claimed,
	// so dismissing here is safe — they can pick a mode later from any page.
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onClose();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onClose]);

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="mode-select-title"
			className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/95 backdrop-blur-sm p-4 overflow-y-auto"
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			{/* Close X — top-right escape route, matches welcome phase */}
			<button
				type="button"
				onClick={onClose}
				aria-label="Close and pick a mode later"
				className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full border border-obsidian-700 bg-obsidian-900/80 text-ink-300 hover:text-gold-300 hover:border-gold-600 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
			>
				<X size={16} aria-hidden="true" />
			</button>
			<motion.div
				initial={{ scale: 0.92, opacity: 0, y: 16 }}
				animate={{ scale: 1, opacity: 1, y: 0 }}
				transition={{ type: 'spring', stiffness: 200, damping: 22 }}
				className="text-center max-w-4xl w-full px-6 py-10 modal-landscape-safe"
			>
				<div className="font-mono text-[10px] tracking-[0.32em] uppercase text-ink-400 mb-3">
					Cards equipped · Choose your first battle
				</div>
				<h1
					id="mode-select-title"
					className="font-display text-3xl sm:text-4xl font-black tracking-[0.12em] uppercase mb-3 text-transparent bg-clip-text bg-linear-to-b from-gold-100 via-gold-300 to-gold-500"
				>
					Start Playing
				</h1>
				<p className="text-ink-200 text-base mb-10 leading-relaxed max-w-xl mx-auto">
					Pick the mode that fits how you want to start. You can switch later from the menu.
				</p>

				<div className="grid gap-5 md:grid-cols-3">
					{GAME_MODES.map(mode => (
						<button
							key={mode.key}
							type="button"
							onClick={() => onChoose(mode.route)}
							aria-label={`Start ${mode.title}`}
							className={`runic-panel ornate-corners-host ornate-corners-host--${mode.tier} mystic-tile mystic-tile--${mode.tier === 'mythic' ? 'ember' : mode.tier === 'premium' ? 'gold' : 'bifrost'} relative rounded-xl p-6 text-left overflow-hidden hover:-translate-y-1 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300`}
							style={{ background: 'var(--surface-mystic-obsidian)' }}
						>
							<div className="relative z-10 flex flex-col items-center text-center gap-3">
								<div className={`hex-frame hex-frame--${mode.tier === 'mythic' ? 'ember' : mode.tier === 'premium' ? 'gold' : 'bifrost'} hex-frame--md`} aria-hidden="true">
									<div className="hex-frame-inner">
										<span className="text-3xl text-ink-0/95 select-none">{mode.glyph}</span>
									</div>
								</div>
								<div className={`tier-inscription tier-inscription--${mode.tier}`}>
									{mode.kicker}
								</div>
								<h2 className="font-display text-xl font-bold text-ink-0 tracking-[0.10em] uppercase">
									{mode.title}
								</h2>
								<p className="text-ink-200 text-sm leading-snug">
									{mode.description}
								</p>
							</div>
						</button>
					))}
				</div>

				{/* Secondary escape — visible exit below the mode grid for players
				    who'd rather pick later. Mirrors the welcome phase's "Maybe later". */}
				<button
					type="button"
					onClick={onClose}
					className="mt-8 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.22em] uppercase text-ink-400 hover:text-ink-0 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 focus-visible:outline-offset-2 rounded-sm"
				>
					Choose later
				</button>
			</motion.div>
		</motion.div>
	);
}
