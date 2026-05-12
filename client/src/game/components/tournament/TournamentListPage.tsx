import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '../../../lib/routes';
import { useTournamentStore } from '../../tournament/tournamentStore';
import type { Tournament, TournamentListItem, TournamentMatch } from '../../tournament/tournamentTypes';
import { useNFTUsername } from '../../nft/hooks';
import { AccountSlot } from '../../../components/account/AccountSlot';

function TournamentCard({ item, onSelect }: { item: TournamentListItem; onSelect: () => void }) {
	const formatLabels: Record<string, string> = {
		swiss: 'Swiss',
		single_elimination: 'Single Elim',
		double_elimination: 'Double Elim',
	};

	const statusColors: Record<string, string> = {
		registration: 'text-rune-300 bg-rune-500/20 border-rune-500/40',
		in_progress: 'text-gold-300 bg-gold-600/20 border-gold-500/40',
		completed: 'text-ink-300 bg-obsidian-800/30 border-obsidian-700/40',
		cancelled: 'text-ember-300 bg-ember-600/20 border-ember-400/40',
	};

	return (
		<button
			onClick={onSelect}
			className="w-full text-left bg-obsidian-900/60 border border-obsidian-700/50 rounded-xl p-5 hover:bg-obsidian-800/60 hover:border-gold-600/50 transition-all"
		>
			<div className="flex items-center justify-between mb-2 gap-3">
				<h3 className="font-display text-lg font-bold tracking-[0.08em] text-ink-0 truncate">{item.name}</h3>
				<span className={`shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded border ${statusColors[item.status]}`}>
					{item.status.replace('_', ' ')}
				</span>
			</div>
			<div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-ink-300">
				<span>{formatLabels[item.format] || item.format}</span>
				<span>{item.playerCount}/{item.maxPlayers} players</span>
				{item.entryFee > 0 && <span>{item.entryFee} RUNE entry</span>}
				{item.prizePool > 0 && <span className="text-gold-300">{item.prizePool} RUNE prize</span>}
			</div>
			<div className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-400 mt-2">
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
			<div className="bg-obsidian-900/60 border border-obsidian-700/50 rounded-xl p-5">
				<h3 className="font-display text-xs font-bold text-ink-300 uppercase tracking-[0.22em] mb-3 inline-flex items-center gap-2">
					<span className="w-1 h-3 rounded-sm bg-gold-300" />
					Standings
				</h3>
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
							} ${player.username === username ? 'bg-gold-600/15 border border-gold-500/30' : ''}`}>
								<span className="font-mono text-xs text-ink-400 w-6">{i + 1}.</span>
								<span className="text-sm text-ink-0 flex-1 truncate">{player.username}</span>
								<span className="font-mono text-xs text-rune-300">{player.wins}W</span>
								<span className="font-mono text-xs text-ember-300">{player.losses}L</span>
								<span className="font-mono text-xs text-ink-300">{player.draws}D</span>
							</div>
						))}
				</div>
			</div>

			{/* Rounds */}
			{tournament.rounds.map((round) => (
				<div key={round.number} className="bg-obsidian-900/60 border border-obsidian-700/50 rounded-xl p-5">
					<h3 className="font-display text-xs font-bold text-ink-300 uppercase tracking-[0.22em] mb-3 inline-flex items-center gap-2">
						<span className="w-1 h-3 rounded-sm bg-gold-300" />
						Round {round.number}
						{round.completedAt && <span className="ml-2 font-mono text-[10px] tracking-[0.18em] text-rune-300">(Complete)</span>}
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
		<div className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border ${
			isMyMatch ? 'bg-gold-600/10 border-gold-500/30' : 'bg-obsidian-800/30 border-obsidian-700/40'
		}`}>
			<div className="flex-1 min-w-0 flex items-center gap-2">
				<span className={`text-sm truncate ${match.winner === match.player1 ? 'text-rune-300 font-bold' : 'text-ink-200'}`}>
					{match.player1}
				</span>
				<span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">vs</span>
				<span className={`text-sm truncate ${match.winner === match.player2 ? 'text-rune-300 font-bold' : 'text-ink-200'}`}>
					{match.player2 || 'BYE'}
				</span>
			</div>

			{match.status === 'completed' && match.winner && (
				<span className="font-mono text-[10px] uppercase tracking-[0.18em] text-rune-300">Winner: {match.winner}</span>
			)}

			{match.status === 'pending' && isMyMatch && match.player2 && (
				<div className="flex gap-1">
					<button
						onClick={() => onReport(match.id, match.player1)}
						className="px-2 py-1 bg-obsidian-700 hover:bg-obsidian-600 text-ink-200 rounded font-mono text-[10px] uppercase tracking-[0.14em] transition-colors"
					>
						{match.player1} wins
					</button>
					<button
						onClick={() => onReport(match.id, match.player2!)}
						className="px-2 py-1 bg-obsidian-700 hover:bg-obsidian-600 text-ink-200 rounded font-mono text-[10px] uppercase tracking-[0.14em] transition-colors"
					>
						{match.player2} wins
					</button>
				</div>
			)}

			{match.status === 'pending' && !isMyMatch && (
				<span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Pending</span>
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
		<div className="h-screen w-full overflow-y-auto overflow-x-hidden bg-(image:--bg-cosmos-nav) text-ink-0">
			<div className="border-b border-obsidian-700 bg-obsidian-950/85 backdrop-blur-md sticky top-0 z-40">
				<div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
					<div className="flex items-center gap-4 min-w-0">
						<Link
							to={routes.home}
							className="inline-flex items-center h-8 px-3 rounded-full border border-obsidian-700 bg-obsidian-850 text-ink-200 hover:text-gold-300 hover:border-gold-600 font-display text-[11px] tracking-[0.18em] uppercase font-bold transition-colors"
						>
							Home
						</Link>
						<div>
							<div className="font-mono text-[10px] tracking-[0.32em] uppercase text-ink-300">Compete</div>
							<h1 className="font-display text-xl font-black tracking-[0.10em] uppercase text-gold-300">Tournaments</h1>
						</div>
					</div>
					<AccountSlot
						username={username}
						tier="premium"
						to={routes.settings}
						secondary="Competitor"
						showSettings
					/>
				</div>
			</div>

			<div className="max-w-4xl mx-auto px-4 py-8">

				{error && (
					<div className="mb-4 p-3 bg-ember-600/25 border border-ember-400/40 rounded-lg text-ember-300 text-sm">
						{error}
					</div>
				)}

				{loading && (
					<div className="flex justify-center py-12">
						<div className="w-8 h-8 border-2 border-gold-300 border-t-transparent rounded-full animate-spin" />
					</div>
				)}

				{!loading && viewingId && activeTournament ? (
					<div>
						<button
							onClick={() => setViewingId(null)}
							className="font-mono text-[11px] tracking-[0.22em] uppercase text-ink-300 hover:text-gold-300 mb-4 transition-colors"
						>
							&larr; Back to list
						</button>

						<div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
							<div className="min-w-0">
								<h2 className="font-display text-2xl font-bold tracking-[0.08em] text-ink-0 truncate">{activeTournament.name}</h2>
								<p className="text-sm text-ink-300">
									{activeTournament.format.replace('_', ' ')} &mdash; Round {activeTournament.currentRound}/{activeTournament.totalRounds}
								</p>
							</div>

							{activeTournament.status === 'registration' && (
								<button
									onClick={handleRegister}
									disabled={activeTournament.players.some(p => p.username === username)}
									className="shrink-0 px-5 py-2 bg-linear-to-b from-gold-300 to-gold-500 disabled:from-obsidian-800 disabled:to-obsidian-800 disabled:text-ink-400 border border-gold-200 disabled:border-obsidian-700 text-obsidian-950 rounded-md font-display text-xs font-bold tracking-[0.18em] uppercase transition-all hover:from-gold-200 hover:to-gold-400 disabled:hover:from-obsidian-800 disabled:hover:to-obsidian-800"
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
							<p className="text-center text-ink-400 py-12">No tournaments available</p>
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
