import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui-norse';
import { forgeLocalCampaignCommon, getLocalCampaignEitr, type LocalCampaignEitr } from '@/data/blockchain/replayDB';
import { getEitrForgeCost } from '@shared/protocol-core/eitrEconomy';
import { getAllCards, getCardById } from '../../data/cardRegistry';

const COMMON_FORGE_COST = getEitrForgeCost('common');

export function LocalCampaignForge({ account, seasonId }: { account: string; seasonId: string }) {
	const [eitr, setEitr] = useState<LocalCampaignEitr>();
	const [forging, setForging] = useState(false);
	const [error, setError] = useState<string>();

	useEffect(() => {
		let active = true;
		const refresh = () => {
			void getLocalCampaignEitr(account, seasonId).then(value => {
				if (active) setEitr(value);
			}).catch(() => {
				if (active) setError('The local Eitr balance could not be loaded.');
			});
		};
		refresh();
		window.addEventListener('focus', refresh);
		return () => {
			active = false;
			window.removeEventListener('focus', refresh);
		};
	}, [account, seasonId]);

	async function forge() {
		setForging(true);
		setError(undefined);
		try {
			const cards = getAllCards().filter(card =>
				card.category === 'genesis' && card.rarity === 'common' && typeof card.id === 'number',
			);
			const card = cards[Math.floor(Math.random() * cards.length)];
			if (!card || typeof card.id !== 'number') {
				setError('No common cards are available for this Forge preview.');
				return;
			}
			setEitr(await forgeLocalCampaignCommon(account, seasonId, card.id));
		} catch {
			setError('The Forge could not save your result. Try again.');
		} finally {
			setForging(false);
		}
	}

	if (!eitr && !error) return null;
	const forgedCard = eitr?.forgedCardId == null ? undefined : getCardById(eitr.forgedCardId);
	return (
		<section aria-label="Campaign Forge" className="pointer-events-auto flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-gold-300/25 bg-obsidian-850 px-3 py-2">
			<div className="min-w-0">
				<p className="font-display text-sm font-bold text-gold-300">Campaign Forge</p>
				{eitr && (
					<p role="status" className="text-sm text-ink-100">
						<span className="font-mono">{eitr.balance} Eitr</span>
						{forgedCard && <span> · Forged {forgedCard.name} (local preview)</span>}
					</p>
				)}
				{eitr && eitr.forgedCardId === null && <p className="text-xs text-ink-200">Unspent Eitr expires when the season resets.</p>}
				{error && <p role="alert" className="text-sm text-ink-100">{error}</p>}
			</div>
			{eitr && eitr.forgedCardId === null && (
				<Button type="button" variant="primary" size="sm" disabled={forging || eitr.balance < COMMON_FORGE_COST} onClick={() => void forge()}>
					{forging ? 'Forging…' : `Forge a common card · ${COMMON_FORGE_COST} Eitr`}
				</Button>
			)}
		</section>
	);
}
