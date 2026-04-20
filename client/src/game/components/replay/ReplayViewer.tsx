import React, { useEffect, useRef } from 'react';
import { useReplayStore, type MatchRecord, type ReplayMove } from '../../stores/replayStore';

function MoveEntry({ move, index, isActive }: { move: ReplayMove; index: number; isActive: boolean }) {
	const labels: Record<string, string> = {
		playCard: 'Played card',
		attack: 'Attacked',
		endTurn: 'End turn',
		heroPower: 'Hero power',
		mulligan: 'Mulligan',
		draw: 'Drew card',
		summon: 'Summoned',
		spell: 'Cast spell',
	};

	return (
		<div className={`px-3 py-1.5 rounded text-xs transition-colors ${
			isActive ? 'bg-amber-900/40 border border-amber-700/40 text-amber-300' : 'text-gray-400 hover:bg-gray-800/40'
		}`}>
			<span className="text-gray-600 mr-2">T{move.turn}</span>
			<span className={`mr-2 ${move.player === 'player' ? 'text-blue-400' : 'text-red-400'}`}>
				{move.player === 'player' ? 'P1' : 'P2'}
			</span>
			<span>{labels[move.type] || move.type}</span>
			{move.data?.cardName && (
				<span className="ml-1 text-gray-500">({move.data.cardName})</span>
			)}
		</div>
	);
}

export default function ReplayViewer({ match, onClose }: { match: MatchRecord; onClose: () => void }) {
	const playbackIndex = useReplayStore(s => s.playbackIndex);
	const isPlaying = useReplayStore(s => s.isPlaying);
	const playbackSpeed = useReplayStore(s => s.playbackSpeed);
	const setPlaybackIndex = useReplayStore(s => s.setPlaybackIndex);
	const stepForward = useReplayStore(s => s.stepForward);
	const stepBackward = useReplayStore(s => s.stepBackward);
	const togglePlayback = useReplayStore(s => s.togglePlayback);
	const setPlaybackSpeed = useReplayStore(s => s.setPlaybackSpeed);
	const moveListRef = useRef<HTMLDivElement>(null);
	const intervalRef = useRef<number | null>(null);

	useEffect(() => {
		if (isPlaying) {
			intervalRef.current = window.setInterval(() => {
				const { playbackIndex: idx, currentReplay } = useReplayStore.getState();
				if (!currentReplay || idx >= currentReplay.moves.length) {
					useReplayStore.getState().togglePlayback();
					return;
				}
				useReplayStore.getState().stepForward();
			}, 1000 / playbackSpeed);
		}
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [isPlaying, playbackSpeed]);

	useEffect(() => {
		if (moveListRef.current) {
			const activeEl = moveListRef.current.querySelector('[data-active="true"]');
			activeEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}
	}, [playbackIndex]);

	const currentMove = match.moves[playbackIndex - 1];
	const progress = match.moves.length > 0 ? (playbackIndex / match.moves.length) * 100 : 0;

	return (
		<div className="min-h-screen bg-gray-950 text-white">
			<div className="max-w-5xl mx-auto px-4 py-8">
				{/* Header */}
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-xl font-bold text-gray-200">
							{match.player1} vs {match.player2}
						</h2>
						<p className="text-xs text-gray-500 mt-1">
							{match.turns} turns, {match.moves.length} actions
							{match.winner && ` — Winner: ${match.winner}`}
						</p>
					</div>
					<button
						onClick={onClose}
						className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700 transition-colors"
					>
						Close Replay
					</button>
				</div>

				<div className="grid grid-cols-3 gap-6">
					{/* Move Timeline (left 2/3) */}
					<div className="col-span-2 bg-gray-900/60 border border-gray-700/50 rounded-xl p-4">
						<h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
							Timeline — Move {playbackIndex} of {match.moves.length}
						</h3>

						<div
							ref={moveListRef}
							className="max-h-[400px] overflow-y-auto space-y-1 pr-2"
						>
							{match.moves.map((move, i) => (
								<div
									key={i}
									data-active={i === playbackIndex - 1 ? 'true' : 'false'}
									onClick={() => setPlaybackIndex(i + 1)}
									className="cursor-pointer"
								>
									<MoveEntry move={move} index={i} isActive={i === playbackIndex - 1} />
								</div>
							))}
							{match.moves.length === 0 && (
								<p className="text-gray-600 text-sm text-center py-8">No moves recorded</p>
							)}
						</div>
					</div>

					{/* Current State (right 1/3) */}
					<div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-4">
						<h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
							Current Action
						</h3>
						{currentMove ? (
							<div className="space-y-3">
								<div>
									<span className="text-xs text-gray-500">Turn</span>
									<p className="text-lg font-bold text-gray-200">{currentMove.turn}</p>
								</div>
								<div>
									<span className="text-xs text-gray-500">Player</span>
									<p className={`text-sm font-semibold ${
										currentMove.player === 'player' ? 'text-blue-400' : 'text-red-400'
									}`}>
										{currentMove.player === 'player' ? match.player1 : match.player2}
									</p>
								</div>
								<div>
									<span className="text-xs text-gray-500">Action</span>
									<p className="text-sm text-gray-300">{currentMove.type}</p>
								</div>
								{currentMove.data && Object.keys(currentMove.data).length > 0 && (
									<div>
										<span className="text-xs text-gray-500">Details</span>
										<div className="text-xs text-gray-400 mt-1 space-y-0.5">
											{Object.entries(currentMove.data).map(([key, val]) => (
												<p key={key}>{key}: {String(val)}</p>
											))}
										</div>
									</div>
								)}
							</div>
						) : (
							<p className="text-gray-600 text-sm">
								{playbackIndex === 0 ? 'Press play or step forward' : 'End of replay'}
							</p>
						)}
					</div>
				</div>

				{/* Playback Controls */}
				<div className="mt-6 bg-gray-900/60 border border-gray-700/50 rounded-xl p-4">
					{/* Progress Bar */}
					<div className="mb-4">
						<div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden cursor-pointer"
							onClick={(e) => {
								const rect = e.currentTarget.getBoundingClientRect();
								const pct = (e.clientX - rect.left) / rect.width;
								setPlaybackIndex(Math.round(pct * match.moves.length));
							}}
						>
							<div
								className="h-full bg-amber-500 rounded-full transition-all"
								style={{ width: `${progress}%` }}
							/>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<button
								onClick={stepBackward}
								disabled={playbackIndex <= 0}
								className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
							>
								&larr; Prev
							</button>
							<button
								onClick={togglePlayback}
								className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition-colors min-w-[80px]"
							>
								{isPlaying ? 'Pause' : 'Play'}
							</button>
							<button
								onClick={stepForward}
								disabled={playbackIndex >= match.moves.length}
								className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
							>
								Next &rarr;
							</button>
						</div>

						<div className="flex items-center gap-2">
							<span className="text-xs text-gray-500">Speed:</span>
							{[0.5, 1, 2, 4].map(speed => (
								<button
									key={speed}
									onClick={() => setPlaybackSpeed(speed)}
									className={`px-2 py-1 rounded text-xs transition-colors ${
										playbackSpeed === speed
											? 'bg-amber-600 text-white'
											: 'bg-gray-800 text-gray-400 hover:text-gray-200'
									}`}
								>
									{speed}x
								</button>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
