import React, { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
	EyeOff,
	ScrollText,
	Trash2,
	X,
} from 'lucide-react';
import { useGameLogStore } from '../stores/gameLogStore';
import {
	buildBattleLogViewModel,
	type BattleLogItem,
} from './gameLogAdapter';
import './GameLog.css';

interface GameLogProps {
	readonly log?: readonly unknown[];
	readonly maxEntries?: number;
}

const cx = (...classes: Array<string | false | null | undefined>): string => classes.filter(Boolean).join(' ');

const LOG_ROW_CLASS = 'relative flex h-auto w-full min-w-0 flex-col rounded-md border px-3 py-2 text-left shadow-sm transition-colors';
const LOG_COPY_CLASS = 'flex min-w-0 flex-col gap-1';
const LOG_TOPLINE_CLASS = 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1';
const LOG_HEADER_CLASS = 'flex items-center justify-between gap-3';
const LOG_TITLE_BUTTON_CLASS = 'flex min-w-0 flex-1 items-center gap-3 text-left';
const LOG_TURN_CLASS = 'log-turn inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-black leading-none tracking-wide';
const LOG_ACTOR_CLASS = 'log-actor shrink-0 text-[12px] font-black uppercase leading-tight tracking-[0.08em]';
const LOG_TITLE_CLASS = 'log-title min-w-0 flex-1 break-words text-[12px] font-black uppercase leading-tight tracking-[0.06em]';
const LOG_MESSAGE_CLASS = 'log-message block whitespace-normal break-words text-[13px] font-normal leading-snug';
const LOG_AMOUNT_CLASS = 'log-amount ml-auto inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-bold leading-none';

const BattleLogRow: React.FC<{ readonly item: BattleLogItem; readonly compact?: boolean }> = React.memo(({
	item,
	compact = false,
}) => {
	return (
		<motion.article
			className={cx(LOG_ROW_CLASS, 'game-log-entry', `tone-${item.tone}`, compact && 'compact')}
			initial={{ opacity: 0, x: -10 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.18 }}
		>
			<div className={cx(LOG_COPY_CLASS, 'log-entry-copy')}>
				<div className={cx(LOG_TOPLINE_CLASS, 'log-entry-topline')}>
					<span className={LOG_TURN_CLASS}>{item.turnLabel}</span>
					<span className={LOG_ACTOR_CLASS}>{item.actorLabel}</span>
					<span className={LOG_TITLE_CLASS}>{item.title}</span>
					{item.amountLabel && (
						<span className={LOG_AMOUNT_CLASS}>
							{item.amountLabel}
						</span>
					)}
				</div>
				<p className={LOG_MESSAGE_CLASS}>{item.message}</p>
				{!compact && item.meta.length > 0 && (
					<div className="log-meta mt-1 flex min-w-0 flex-wrap gap-1.5">
						{item.meta.map(meta => (
							<span key={meta}>{meta}</span>
						))}
					</div>
				)}
			</div>
		</motion.article>
	);
});

BattleLogRow.displayName = 'BattleLogRow';

export const GameLog: React.FC<GameLogProps> = ({ log: legacyLog, maxEntries }) => {
	void legacyLog;
	const entries = useGameLogStore(state => state.entries);
	const isOpen = useGameLogStore(state => state.isOpen);
	const isDockHidden = useGameLogStore(state => state.isDockHidden);
	const toggleLog = useGameLogStore(state => state.toggleLog);
	const hideDock = useGameLogStore(state => state.hideDock);
	const showDock = useGameLogStore(state => state.showDock);
	const clearLog = useGameLogStore(state => state.clearLog);
	const scrollRef = useRef<HTMLDivElement>(null);
	const viewModel = useMemo(
		() => buildBattleLogViewModel(entries, { dockLimit: 8, panelLimit: maxEntries ?? 40 }),
		[entries, maxEntries],
	);

	useEffect(() => {
		if (!scrollRef.current || !isOpen) return;
		scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
	}, [viewModel.panelItems.length, isOpen]);

	const expandDockWithKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		toggleLog();
	};

	if (isDockHidden) {
		return (
			<div className="game-log-container hidden-dock">
				<button
					type="button"
					className="game-log-reveal"
					onClick={showDock}
					title="Show battle log"
					aria-label="Show battle log"
				>
					<ScrollText size={17} strokeWidth={2.2} />
					{viewModel.total > 0 && (
						<span className="log-badge">{Math.min(viewModel.total, 99)}</span>
					)}
				</button>
			</div>
		);
	}

	return (
		<div className={`game-log-container ${isOpen ? 'is-open' : 'is-docked'}`}>
			<AnimatePresence initial={false}>
				{!isOpen && (
					<motion.section
						key="battle-log-dock"
						className="game-log-dock relative flex w-full min-w-0 flex-col overflow-hidden rounded-md"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 8 }}
						transition={{ duration: 0.18 }}
						aria-label="Battle log summary"
					>
						<div className={cx(LOG_HEADER_CLASS, 'game-log-dock-header')}>
							<button
								type="button"
								className={cx(LOG_TITLE_BUTTON_CLASS, 'game-log-title-button')}
								onClick={toggleLog}
								title="Expand battle log"
								aria-label="Expand battle log"
							>
								<span className="game-log-title-block">
									<span className="game-log-kicker">Battle Log</span>
									<span className="game-log-count">{viewModel.total} events</span>
								</span>
							</button>
							<div className="game-log-dock-actions">
								<button
									type="button"
									className="game-log-icon-button"
									onClick={hideDock}
									title="Hide battle log"
									aria-label="Hide battle log"
								>
									<EyeOff size={15} strokeWidth={2.2} />
								</button>
							</div>
						</div>

						<div
							className="game-log-dock-list flex min-h-0 flex-col gap-2 overflow-y-auto"
							onClick={toggleLog}
							onKeyDown={expandDockWithKeyboard}
							role="button"
							tabIndex={0}
							aria-label="Expand battle log"
						>
							{viewModel.dockItems.length === 0 ? (
								<div className="game-log-empty">No actions yet</div>
							) : (
								viewModel.dockItems.map(item => (
									<BattleLogRow key={item.id} item={item} compact />
								))
							)}
						</div>
					</motion.section>
				)}

				{isOpen && (
					<motion.section
						key="battle-log-panel"
						className="game-log-panel relative flex w-full min-w-0 flex-col overflow-hidden rounded-md"
						initial={{ opacity: 0, y: 10, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 10, scale: 0.98 }}
						transition={{ duration: 0.18 }}
						aria-label="Battle log"
					>
						<div className={cx(LOG_HEADER_CLASS, 'game-log-header')}>
							<div className="game-log-title-block">
								<span className="game-log-kicker">Battle Log</span>
								<span className="game-log-count">{viewModel.total} events tracked</span>
							</div>
							<div className="game-log-header-actions">
								{viewModel.total > 0 && (
									<button
										type="button"
										className="game-log-icon-button"
										onClick={clearLog}
										title="Clear battle log"
										aria-label="Clear battle log"
									>
										<Trash2 size={15} strokeWidth={2.2} />
									</button>
								)}
								<button
									type="button"
									className="game-log-icon-button"
									onClick={hideDock}
									title="Hide battle log"
									aria-label="Hide battle log"
								>
									<EyeOff size={15} strokeWidth={2.2} />
								</button>
								<button
									type="button"
									className="game-log-icon-button"
									onClick={toggleLog}
									title="Close battle log"
									aria-label="Close battle log"
								>
									<X size={16} strokeWidth={2.2} />
								</button>
							</div>
						</div>
						<div className="game-log-entries flex min-h-0 flex-col gap-2 overflow-y-auto" ref={scrollRef}>
							{viewModel.panelItems.length === 0 ? (
								<div className="game-log-empty">No actions yet</div>
							) : (
								viewModel.panelItems.map(item => (
									<BattleLogRow key={item.id} item={item} />
								))
							)}
						</div>
					</motion.section>
				)}
			</AnimatePresence>
		</div>
	);
};

export default GameLog;
