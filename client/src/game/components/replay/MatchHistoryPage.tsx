import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '../../../lib/routes';
import { useReplayStore, type MatchRecord } from '../../stores/replayStore';
import ReplayViewer from './ReplayViewer';

function MatchCard({ match, onView }: { match: MatchRecord; onView: () => void }) {
	const duration = Math.round((match.endedAt - match.startedAt) / 1000);
	const minutes = Math.floor(duration / 60);
	const seconds = duration % 60;

	return (
		<div className="bg-gray-900/60 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/60 transition-colors">
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<span className="text-sm font-semibold text-gray-200">{match.player1}</span>
					<span className="text-xs text-gray-600">vs</span>
					<span className="text-sm font-semibold text-gray-200">{match.player2}</span>
				</div>
				<span className={`text-xs px-2 py-0.5 rounded border ${
					match.matchType === 'ranked'
						? 'text-amber-400 bg-amber-900/30 border-amber-700/40'
						: match.matchType === 'campaign'
						? 'text-green-400 bg-green-900/30 border-green-700/40'
						: 'text-gray-400 bg-gray-800/30 border-gray-700/40'
				}`}>
					{match.matchType}
				</span>
			</div>

			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4 text-xs text-gray-400">
					<span>{match.turns} turns</span>
					<span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
					<span>{match.moves.length} actions</span>
					{match.winner && (
						<span className="text-green-400">Winner: {match.winner}</span>
					)}
				</div>
				<button
					onClick={onView}
					className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold transition-colors"
				>
					Watch Replay
				</button>
			</div>

			<div className="text-xs text-gray-600 mt-2">
				{new Date(match.startedAt).toLocaleString()}
			</div>
		</div>
	);
}

export default function MatchHistoryPage() {
	const matchHistory = useReplayStore(s => s.matchHistory);
	const currentReplay = useReplayStore(s => s.currentReplay);
	const loadReplay = useReplayStore(s => s.loadReplay);
	const closeReplay = useReplayStore(s => s.closeReplay);
	const clearHistory = useReplayStore(s => s.clearHistory);
	const [confirmClear, setConfirmClear] = useState(false);

	if (currentReplay) {
		return <ReplayViewer match={currentReplay} onClose={closeReplay} />;
	}

	return (
		<div className="min-h-screen bg-gray-950 text-white">
			<div className="max-w-4xl mx-auto px-4 py-8">
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-3xl font-bold text-amber-400 tracking-wide">Match History</h1>
					<div className="flex items-center gap-3">
						{matchHistory.length > 0 && (
							confirmClear ? (
								<div className="flex items-center gap-2">
									<span className="text-sm text-red-300">Are you sure?</span>
									<button
										onClick={() => { clearHistory(); setConfirmClear(false); }}
										className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
									>
										Confirm
									</button>
									<button
										onClick={() => setConfirmClear(false)}
										className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
									>
										Cancel
									</button>
								</div>
							) : (
								<button
									onClick={() => setConfirmClear(true)}
									className="px-4 py-2 bg-red-900/40 hover:bg-red-800/50 text-red-300 rounded-lg text-sm border border-red-700/40 transition-colors"
								>
									Clear All
								</button>
							)
						)}
						<Link
							to={routes.home}
							className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700 transition-colors"
						>
							Back to Menu
						</Link>
					</div>
				</div>

				{matchHistory.length === 0 ? (
					<div className="text-center py-20">
						<p className="text-gray-500 text-lg mb-2">No matches recorded yet</p>
						<p className="text-gray-600 text-sm">Play some games to see your match history here</p>
					</div>
				) : (
					<div className="space-y-3">
						{matchHistory.map(match => (
							<MatchCard
								key={match.id}
								match={match}
								onView={() => loadReplay(match.id)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
