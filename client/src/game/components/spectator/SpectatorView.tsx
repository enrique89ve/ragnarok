import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { routes } from '../../../lib/routes';
import { useSpectatorSync } from '../../spectator/useSpectatorSync';

function MiniCard({ name, hidden }: { name: string; hidden?: boolean }) {
	return (
		<div className={`w-12 h-16 rounded border text-[8px] flex items-center justify-center p-1 text-center leading-tight ${
			hidden
				? 'bg-blue-950/60 border-blue-800/40 text-blue-400'
				: 'bg-gray-800/60 border-gray-700/40 text-gray-300'
		}`}>
			{hidden ? '?' : name}
		</div>
	);
}

function PlayerBoard({ player, label }: { player: any; label: string }) {
	return (
		<div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-4">
			<div className="flex items-center justify-between mb-3">
				<span className="text-sm font-bold text-gray-300">{label}</span>
				<div className="flex items-center gap-3">
					<span className="text-xs text-blue-400">{player.mana}/{player.maxMana} Mana</span>
					<span className="text-xs text-red-400">{player.heroHealth ?? player.health} HP</span>
					{(player.heroArmor || 0) > 0 && (
						<span className="text-xs text-gray-400">{player.heroArmor} Armor</span>
					)}
				</div>
			</div>

			{/* Hand */}
			<div className="mb-3">
				<span className="text-xs text-gray-500 mb-1 block">Hand ({player.hand.length})</span>
				<div className="flex gap-1 flex-wrap">
					{player.hand.map((card: any, i: number) => (
						<MiniCard key={i} name={card.name} hidden={card.name === '???'} />
					))}
				</div>
			</div>

			{/* Battlefield */}
			<div>
				<span className="text-xs text-gray-500 mb-1 block">Battlefield ({player.battlefield.length})</span>
				<div className="flex gap-2 flex-wrap">
					{player.battlefield.map((minion: any, i: number) => (
						<div key={i} className="bg-gray-800/80 border border-gray-600/50 rounded-lg px-3 py-2 text-center">
							<p className="text-xs font-semibold text-gray-200 truncate max-w-[80px]">{minion.name}</p>
							<div className="flex gap-2 justify-center mt-1">
								<span className="text-xs text-amber-400">{minion.attack}</span>
								<span className="text-xs text-red-400">{minion.currentHealth ?? minion.health}</span>
							</div>
						</div>
					))}
					{player.battlefield.length === 0 && (
						<span className="text-xs text-gray-600 italic">Empty</span>
					)}
				</div>
			</div>
		</div>
	);
}

export default function SpectatorView() {
	const { peerId } = useParams<{ peerId: string }>();
	const { gameState, status, error } = useSpectatorSync(peerId || null);

	return (
		<div className="min-h-screen bg-gray-950 text-white">
			<div className="max-w-4xl mx-auto px-4 py-8">
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-2xl font-bold text-amber-400">Spectator Mode</h1>
						<p className="text-xs text-gray-500 mt-1">Watching: {peerId || 'none'}</p>
					</div>
					<Link
						to={routes.home}
						className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700 transition-colors"
					>
						Leave
					</Link>
				</div>

				{/* Status Bar */}
				<div className={`mb-6 px-4 py-2 rounded-lg text-sm border ${
					status === 'connected' ? 'bg-green-900/20 border-green-700/40 text-green-400' :
					status === 'connecting' ? 'bg-amber-900/20 border-amber-700/40 text-amber-400' :
					status === 'error' ? 'bg-red-900/20 border-red-700/40 text-red-400' :
					'bg-gray-800/40 border-gray-700/40 text-gray-400'
				}`}>
					{status === 'connected' && 'Connected — Live spectating'}
					{status === 'connecting' && 'Connecting to match...'}
					{status === 'error' && `Error: ${error || 'Connection failed'}`}
					{status === 'disconnected' && 'Disconnected'}
				</div>

				{status === 'connecting' && (
					<div className="flex justify-center py-20">
						<div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
					</div>
				)}

				{status === 'connected' && gameState && (
					<div className="space-y-4">
						{/* Turn Indicator */}
						<div className="text-center">
							<span className="text-sm text-gray-400">
								Turn {gameState.turnNumber} — {gameState.currentTurn === 'player' ? 'Player 1' : 'Player 2'}
							</span>
							{gameState.gamePhase && (
								<span className="ml-3 text-xs text-gray-600">({gameState.gamePhase})</span>
							)}
						</div>

						<PlayerBoard player={gameState.players.opponent} label="Player 2" />

						<div className="flex justify-center py-2">
							<div className="w-16 h-0.5 bg-gray-700 rounded" />
						</div>

						<PlayerBoard player={gameState.players.player} label="Player 1" />
					</div>
				)}

				{status === 'connected' && !gameState && (
					<div className="text-center py-20">
						<p className="text-gray-500">Waiting for game state...</p>
					</div>
				)}

				{status === 'disconnected' && (
					<div className="text-center py-20">
						<p className="text-gray-500 mb-4">Not connected to any match</p>
						<Link
							to={routes.home}
							className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition-colors inline-block"
						>
							Back to Menu
						</Link>
					</div>
				)}
			</div>
		</div>
	);
}
