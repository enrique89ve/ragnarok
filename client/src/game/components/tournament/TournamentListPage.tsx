import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '../../../lib/routes';
import { useTournamentStore } from '../../tournament/tournamentStore';
import type { Tournament, TournamentListItem, TournamentMatch } from '../../tournament/tournamentTypes';
import { useNFTUsername } from '../../nft/hooks';

function TournamentCard({ item, onSelect }: { item: TournamentListItem; onSelect: () => void }) {
	const formatLabels: Record<string, string> = {
		swiss: 'Swiss',
		single_elimination: 'Single Elim',
		double_elimination: 'Double Elim',
	};

	const statusColors: Record<string, string> = {
		registration: 'text-green-400 bg-green-900/30 border-green-700/40',
		in_progress: 'text-amber-400 bg-amber-900/30 border-amber-700/40',
		completed: 'text-gray-400 bg-gray-800/30 border-gray-700/40',
		cancelled: 'text-red-400 bg-red-900/30 border-red-700/40',
	};

	return (
		<button
			onClick={onSelect}
			className="w-full text-left bg-gray-900/60 border border-gray-700/50 rounded-xl p-5 hover:bg-gray-800/60 hover:border-gray-600/60 transition-all"
		>
			<div className="flex items-center justify-between mb-2">
				<h3 className="text-lg font-bold text-gray-200">{item.name}</h3>
				<span className={`text-xs px-2 py-0.5 rounded border ${statusColors[item.status]}`}>
					{item.status.replace('_', ' ')}
				</span>
			</div>
			<div className="flex items-center gap-4 text-sm text-gray-400">
				<span>{formatLabels[item.format] || item.format}</span>
				<span>{item.playerCount}/{item.maxPlayers} players</span>
				{item.entryFee > 0 && <span>{item.entryFee} RUNE entry</span>}
				{item.prizePool > 0 && <span className="text-amber-400">{item.prizePool} RUNE prize</span>}
			</div>
			<div className="text-xs text-gray-500 mt-2">
				Starts: {new Date(item.startsAt).toLocaleString()}
			</div>
		</button>
	);
}

function BracketView({ tournament, username, onReport }: {
	tournament: Tournament;
	username: string;
	onReport: (matchId: string, winner: string) => void;
}) {
	return (
		<div className="space-y-6">
			{/* Standings */}
			<div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-5">
				<h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Standings</h3>
				<div className="space-y-1">
					{[...tournament.players]
						.sort((a, b) => {
							const aScore = a.wins * 3 + a.draws;
							const bScore = b.wins * 3 + b.draws;
							if (bScore !== aScore) return bScore - aScore;
							return b.buchholz - a.buchholz;
						})
						.map((player, i) => (
							<div key={player.username} className={`flex items-center gap-3 px-3 py-2 rounded ${
								player.dropped ? 'opacity-40' : ''
							} ${player.username === username ? 'bg-amber-900/20 border border-amber-700/30' : ''}`}>
								<span className="text-xs text-gray-500 w-6">{i + 1}.</span>
								<span className="text-sm text-gray-200 flex-1">{player.username}</span>
								<span className="text-xs text-green-400">{player.wins}W</span>
								<span className="text-xs text-red-400">{player.losses}L</span>
								<span className="text-xs text-gray-500">{player.draws}D</span>
							</div>
						))}
				</div>
			</div>

			{/* Rounds */}
			{tournament.rounds.map((round) => (
				<div key={round.number} className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-5">
					<h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
						Round {round.number}
						{round.completedAt && <span className="ml-2 text-green-500 text-xs">(Complete)</span>}
					</h3>
					<div className="space-y-2">
						{round.matches.map((match) => (
							<MatchRow
								key={match.id}
								match={match}
								username={username}
								onReport={onReport}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function MatchRow({ match, username, onReport }: {
	match: TournamentMatch;
	username: string;
	onReport: (matchId: string, winner: string) => void;
}) {
	const isMyMatch = match.player1 === username || match.player2 === username;

	return (
		<div className={`flex items-center gap-3 p-3 rounded-lg border ${
			isMyMatch ? 'bg-amber-900/10 border-amber-700/30' : 'bg-gray-800/30 border-gray-800/30'
		}`}>
			<div className="flex-1 flex items-center gap-2">
				<span className={`text-sm ${match.winner === match.player1 ? 'text-green-400 font-bold' : 'text-gray-300'}`}>
					{match.player1}
				</span>
				<span className="text-xs text-gray-600">vs</span>
				<span className={`text-sm ${match.winner === match.player2 ? 'text-green-400 font-bold' : 'text-gray-300'}`}>
					{match.player2 || 'BYE'}
				</span>
			</div>

			{match.status === 'completed' && match.winner && (
				<span className="text-xs text-green-400">Winner: {match.winner}</span>
			)}

			{match.status === 'pending' && isMyMatch && match.player2 && (
				<div className="flex gap-1">
					<button
						onClick={() => onReport(match.id, match.player1)}
						className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors"
					>
						{match.player1} wins
					</button>
					<button
						onClick={() => onReport(match.id, match.player2!)}
						className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors"
					>
						{match.player2} wins
					</button>
				</div>
			)}

			{match.status === 'pending' && !isMyMatch && (
				<span className="text-xs text-gray-500">Pending</span>
			)}
		</div>
	);
}

export default function TournamentListPage() {
	const username = useNFTUsername() || 'guest';
	const tournaments = useTournamentStore(s => s.tournaments);
	const activeTournament = useTournamentStore(s => s.activeTournament);
	const loading = useTournamentStore(s => s.loading);
	const error = useTournamentStore(s => s.error);
	const fetchTournaments = useTournamentStore(s => s.fetchTournaments);
	const fetchTournament = useTournamentStore(s => s.fetchTournament);
	const register = useTournamentStore(s => s.register);
	const reportResult = useTournamentStore(s => s.reportResult);
	const [viewingId, setViewingId] = useState<string | null>(null);

	useEffect(() => {
		fetchTournaments();
	}, [fetchTournaments]);

	const handleSelectTournament = (id: string) => {
		setViewingId(id);
		fetchTournament(id);
	};

	const handleRegister = async () => {
		if (viewingId) {
			await register(viewingId, username);
		}
	};

	const handleReport = async (matchId: string, winner: string) => {
		if (viewingId) {
			await reportResult(viewingId, matchId, winner);
		}
	};

	return (
		<div className="min-h-screen bg-gray-950 text-white">
			<div className="max-w-4xl mx-auto px-4 py-8">
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-3xl font-bold text-amber-400 tracking-wide">Tournaments</h1>
					<Link
						to={routes.home}
						className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700 transition-colors"
					>
						Back to Menu
					</Link>
				</div>

				{error && (
					<div className="mb-4 p-3 bg-red-900/30 border border-red-700/40 rounded-lg text-red-300 text-sm">
						{error}
					</div>
				)}

				{loading && (
					<div className="flex justify-center py-12">
						<div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
					</div>
				)}

				{!loading && viewingId && activeTournament ? (
					<div>
						<button
							onClick={() => setViewingId(null)}
							className="text-gray-500 hover:text-gray-300 text-sm mb-4 transition-colors"
						>
							&larr; Back to list
						</button>

						<div className="flex items-center justify-between mb-6">
							<div>
								<h2 className="text-2xl font-bold text-gray-200">{activeTournament.name}</h2>
								<p className="text-sm text-gray-400">
									{activeTournament.format.replace('_', ' ')} — Round {activeTournament.currentRound}/{activeTournament.totalRounds}
								</p>
							</div>

							{activeTournament.status === 'registration' && (
								<button
									onClick={handleRegister}
									disabled={activeTournament.players.some(p => p.username === username)}
									className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg text-sm font-semibold transition-colors"
								>
									{activeTournament.players.some(p => p.username === username) ? 'Registered' : 'Register'}
								</button>
							)}
						</div>

						<BracketView
							tournament={activeTournament}
							username={username}
							onReport={handleReport}
						/>
					</div>
				) : !loading && (
					<div className="space-y-3">
						{tournaments.length === 0 ? (
							<p className="text-center text-gray-500 py-12">No tournaments available</p>
						) : (
							tournaments.map(t => (
								<TournamentCard
									key={t.id}
									item={t}
									onSelect={() => handleSelectTournament(t.id)}
								/>
							))
						)}
					</div>
				)}
			</div>
		</div>
	);
}
