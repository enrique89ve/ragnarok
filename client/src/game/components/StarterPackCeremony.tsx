import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../lib/routes';
import { getStarterCards, STARTER_PACK_NAME, buildStarterDecks } from '../data/starterSet';
import { useStarterStore } from '../stores/starterStore';
import { getNFTBridge } from '../nft';
import type { HiveCardAsset } from '../../data/schemas/HiveTypes';
import PackOpeningAnimation from './packs/PackOpeningAnimation';
import TreasureChestSVG from './packs/TreasureChestSVG';

interface StarterPackCeremonyProps {
	onComplete: () => void;
}

export default function StarterPackCeremony({ onComplete }: StarterPackCeremonyProps) {
	const [phase, setPhase] = useState<'welcome' | 'opening' | 'done'>('welcome');
	const markClaimed = useStarterStore(s => s.markClaimed);
	const addCard = (card: HiveCardAsset) => getNFTBridge().addCard(card);
	const navigate = useNavigate();

	const starterCards = getStarterCards();

	const revealCards = starterCards.map(card => ({
		id: card.id as number,
		name: card.name,
		rarity: (card.rarity || 'common') as string,
		type: card.type as string,
		heroClass: 'class' in card ? (card as { class: string }).class : 'Neutral',
	}));

	const handleClaimBirthright = useCallback(() => {
		for (const card of starterCards) {
			const asset: HiveCardAsset = {
				uid: `starter-${card.id}-${Date.now()}`,
				cardId: card.id as number,
				ownerId: 'local',
				edition: 'alpha',
				foil: 'standard',
				rarity: card.rarity || 'common',
				level: 1,
				xp: 0,
				name: card.name,
				type: card.type,
			};
			addCard(asset);
		}
		// Auto-build 4 starter decks (one per hero) so player can immediately play
		buildStarterDecks();
		markClaimed();
		setPhase('opening');
	}, [starterCards, addCard, markClaimed]);

	const handlePackClose = useCallback(() => {
		onComplete();
		navigate(routes.campaign);
	}, [navigate, onComplete]);

	const handlePlayFirstGame = useCallback(() => {
		onComplete();
		navigate(routes.campaign);
	}, [navigate, onComplete]);

	if (phase === 'opening') {
		return (
			<div>
				<PackOpeningAnimation
					packName={STARTER_PACK_NAME}
					cards={revealCards}
					onClose={handlePackClose}
					onOpenAnother={handlePlayFirstGame}
				/>
			</div>
		);
	}

	return (
		<AnimatePresence>
			{phase === 'welcome' && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
				>
					<motion.div
						initial={{ scale: 0.8, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ type: 'spring', stiffness: 200, damping: 20 }}
						className="text-center max-w-lg px-8"
					>
						<motion.div
							animate={{ y: [0, -10, 0] }}
							transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
							className="mb-6 flex justify-center"
						>
							<TreasureChestSVG state="closed" size={200} />
						</motion.div>

						<h1
							className="text-4xl font-bold mb-4 tracking-wider"
							style={{
								fontFamily: "'Cinzel', Georgia, serif",
								background: 'linear-gradient(135deg, #daa520, #ffd700, #daa520)',
								WebkitBackgroundClip: 'text',
								WebkitTextFillColor: 'transparent',
							}}
						>
							Welcome, Warrior
						</h1>

						<p className="text-gray-300 text-lg mb-2 leading-relaxed">
							The Norns have foreseen your arrival.
						</p>
						<p className="text-gray-400 text-base mb-8 leading-relaxed">
							Accept your birthright — a set of {starterCards.length} cards
							to begin your journey across the Nine Realms.
						</p>

						<motion.button
							whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(218, 165, 32, 0.5)' }}
							whileTap={{ scale: 0.95 }}
							onClick={handleClaimBirthright}
							className="px-10 py-5 text-xl font-bold tracking-wider uppercase rounded-xl border-2 transition-all"
							style={{
								fontFamily: "'Cinzel', Georgia, serif",
								background: 'linear-gradient(135deg, #8B6914, #DAA520, #8B6914)',
								borderColor: '#DAA520',
								color: '#fff',
								textShadow: '0 2px 4px rgba(0,0,0,0.5)',
							}}
						>
							Claim Your Birthright
						</motion.button>

						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 1.5 }}
							className="text-gray-500 text-sm mt-6"
						>
							{starterCards.length} cards · Common & Basic · Ready to battle
						</motion.p>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
