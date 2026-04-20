/*
  FactionPledgePopup.tsx \u2014 one-time ceremony where the player picks a
  PvP house after completing the Norse chapter.

  Mounting strategy:
    Mount this component once at the root layout (e.g. in App.tsx or in
    the campaign layout). It will:
      - check campaignStore: has the player completed all 9 Norse missions?
      - check factionStore: has the popup been shown before? Have they
        already pledged a faction?
    If the answers are "yes / no / no", it renders. Otherwise it returns
    null. The popup writes `pledgePopupShown=true` once dismissed, so it
    will not re-prompt across sessions even if the player declines.

  Visual: a fullscreen ceremony with five faction cards in a row.
  Each card shows the faction name, tagline, color, and signature god.
  Click a card to select it; click "Pledge" to confirm. There is also
  a small "Decide later" link in the corner that closes the popup
  without pledging (and the popup will return on next launch \u2014 only
  fully pledging marks it as resolved).

  Wait, that's not quite right \u2014 see the comment in the dismiss
  handler. We DO want \u201cDecide later\u201d to actually close the popup
  permanently if the user keeps refusing, otherwise it becomes a nag.
  Pragmatic compromise: \u201cDecide later\u201d marks the popup shown and the
  player can pledge later via the Settings screen. (TODO: settings hook)
*/

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFactionStore } from './factionStore';
import { useCampaignStore } from '../campaign';
import { FACTIONS, type FactionId } from './pvpData';
import { norseChapter } from '../campaign/chapters/norseChapter';
import './FactionPledgePopup.css';

export const FactionPledgePopup: React.FC = () => {
	const pledgedFaction = useFactionStore(s => s.pledgedFaction);
	const pledgePopupShown = useFactionStore(s => s.pledgePopupShown);
	const pledge = useFactionStore(s => s.pledge);
	const markPopupShown = useFactionStore(s => s.markPopupShown);

	const completedMissions = useCampaignStore(s => s.completedMissions);

	// "Has the player completed all 9 Norse missions?" \u2014 the gating
	// condition for the pledge ceremony to fire.
	const norseComplete = useMemo(() => {
		return norseChapter.missions.every(m => !!completedMissions[m.id]);
	}, [completedMissions]);

	const [selected, setSelected] = useState<FactionId | null>(null);

	// Render guard: only show if the player has finished Norse, hasn't
	// pledged yet, and hasn't already dismissed the popup.
	if (pledgedFaction !== null) return null;
	if (pledgePopupShown) return null;
	if (!norseComplete) return null;

	const handlePledge = () => {
		if (!selected) return;
		pledge(selected);
	};

	const handleDecideLater = () => {
		markPopupShown();
	};

	return (
		<AnimatePresence>
			<motion.div
				className="faction-pledge-overlay"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.6 }}
			>
				<div className="faction-pledge-vignette" />
				<motion.div
					className="faction-pledge-content"
					initial={{ y: 30, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
				>
					<h1 className="faction-pledge-title">Pledge a House</h1>
					<p className="faction-pledge-subtitle">
						You have walked the saga of the Aesir from Ginnungagap to the Twilight Omen.
						The Nine Realms have noticed. Choose the house you carry into the field of war.
					</p>

					<div className="faction-pledge-row">
						{FACTIONS.map(faction => {
							const isSelected = selected === faction.id;
							return (
								<motion.button
									key={faction.id}
									type="button"
									className={`faction-card ${isSelected ? 'selected' : ''}`}
									style={{ '--faction-color': faction.color } as React.CSSProperties}
									onClick={() => setSelected(faction.id)}
									whileHover={{ y: -4 }}
									whileTap={{ scale: 0.98 }}
								>
									<div className="faction-card-tagline">{faction.tagline}</div>
									<div className="faction-card-name">{faction.name}</div>
									<div className="faction-card-description">{faction.description}</div>
								</motion.button>
							);
						})}
					</div>

					<div className="faction-pledge-actions">
						<button
							type="button"
							className="faction-pledge-decline"
							onClick={handleDecideLater}
						>
							Decide later
						</button>
						<button
							type="button"
							className="faction-pledge-confirm"
							onClick={handlePledge}
							disabled={!selected}
						>
							{selected ? 'Pledge your sword' : 'Choose a house'}
						</button>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
};

export default FactionPledgePopup;
