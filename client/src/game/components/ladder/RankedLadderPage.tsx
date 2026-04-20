import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '../../../lib/routes';
import { useNFTUsername } from '../../nft/hooks';
import { getMatchesByAccount } from '../../../data/blockchain/replayDB';
import type { HiveMatchResult } from '../../../data/schemas/HiveTypes';
import { getSeasonInfo, formatTimeRemaining } from '../../utils/seasonUtils';
import { useSeasonStore } from '../../stores/seasonStore';
import { getYggdrasilRank } from '../../pvp';
import { useFactionStore } from '../../pvp/factionStore';
import './ladder.css';

interface LadderEntry {
	username: string;
	elo: number;
	wins: number;
	losses: number;
	winRate: number;
	lastMatch: number;
}

type Tab = 'leaderboard' | 'history';

function buildLadder(matches: HiveMatchResult[]): LadderEntry[] {
	const stats = new Map<string, { wins: number; losses: number; lastMatch: number }>();

	for (const m of matches) {
		if (m.matchType !== 'ranked') continue;

		const p1 = m.player1.hiveUsername;
		const p2 = m.player2.hiveUsername;
		if (!p1 || !p2) continue;

		for (const username of [p1, p2]) {
			if (!stats.has(username)) stats.set(username, { wins: 0, losses: 0, lastMatch: 0 });
		}

		const winner = stats.get(m.winnerId)!;
		winner.wins += 1;
		winner.lastMatch = Math.max(winner.lastMatch, m.timestamp);

		const loserId = m.winnerId === p1 ? p2 : p1;
		const loser = stats.get(loserId)!;
		loser.losses += 1;
		loser.lastMatch = Math.max(loser.lastMatch, m.timestamp);
	}

	const entries: LadderEntry[] = [];
	for (const [username, s] of stats) {
		const total = s.wins + s.losses;
		const winRate = total > 0 ? (s.wins / total) * 100 : 0;
		const elo = 1000 + (s.wins - s.losses) * 16;
		entries.push({ username, elo, wins: s.wins, losses: s.losses, winRate, lastMatch: s.lastMatch });
	}

	entries.sort((a, b) => b.elo - a.elo);
	return entries;
}

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${s.toString().padStart(2, '0')}`;
}

function timeAgo(ts: number): string {
	const diff = Date.now() - ts;
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function RankBadge({ rank }: { rank: number }) {
	const cls = rank === 1 ? 'ladder-rank-1'
		: rank === 2 ? 'ladder-rank-2'
		: rank === 3 ? 'ladder-rank-3'
		: 'ladder-rank-default';

	return <div className={`ladder-rank-badge ${cls}`}>{rank}</div>;
}

function WinRateBar({ rate }: { rate: number }) {
	const color = rate >= 60 ? '#22c55e' : rate >= 50 ? '#eab308' : '#ef4444';
	return (
		<div className="ladder-winrate-bar" style={{ width: 80 }}>
			<div className="ladder-winrate-fill" style={{ width: `${Math.min(100, rate)}%`, background: color }} />
		</div>
	);
}

export default function RankedLadderPage() {
	const [tab, setTab] = useState<Tab>('leaderboard');
	const [allMatches, setAllMatches] = useState<HiveMatchResult[]>([]);
	const [loading, setLoading] = useState(true);

	const myUsername = useNFTUsername() ?? '';

	useEffect(() => {
		let mounted = true;

		if (!myUsername) {
			setLoading(false);
			return () => { mounted = false; };
		}

		getMatchesByAccount(myUsername)
			.then(matches => {
				if (!mounted) return;
				setAllMatches(matches);
				setLoading(false);
			})
			.catch(() => {
				if (mounted) setLoading(false);
			});

		return () => { mounted = false; };
	}, [myUsername]);

	const ladder = useMemo(() => buildLadder(allMatches), [allMatches]);
	const myEntry = useMemo(() => ladder.find(e => e.username === myUsername), [ladder, myUsername]);
	const myRank = useMemo(() => {
		const idx = ladder.findIndex(e => e.username === myUsername);
		return idx >= 0 ? idx + 1 : null;
	}, [ladder, myUsername]);

	const rankedHistory = useMemo(
		() => allMatches.filter(m => m.matchType === 'ranked').slice(0, 50),
		[allMatches],
	);

	const seasonInfo = useMemo(() => getSeasonInfo(), []);
	const seasonStore = useSeasonStore();

	useEffect(() => {
		if (myEntry) {
			seasonStore.checkAndApplyReset(myEntry.elo);
		}
	}, [myEntry?.elo]);

	// Rank-up celebration — detect when player reaches a new Yggdrasil realm
	const lastSeenRankId = useFactionStore(s => s.lastSeenRankId);
	const setLastSeenRank = useFactionStore(s => s.setLastSeenRank);
	const [rankUpBanner, setRankUpBanner] = useState<{ name: string; flavor: string; color: string } | null>(null);
	useEffect(() => {
		if (!myEntry) return undefined;
		const currentRank = getYggdrasilRank(myEntry.elo);
		if (currentRank.id > lastSeenRankId) {
			setLastSeenRank(currentRank.id);
			setRankUpBanner({ name: currentRank.name, flavor: currentRank.flavor, color: currentRank.color });
			const timer = setTimeout(() => setRankUpBanner(null), 6000);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [myEntry?.elo, lastSeenRankId, setLastSeenRank]);

	if (loading) {
		return (
			<div className="ladder-container flex items-center justify-center">
				<div className="text-gray-500 text-lg">Loading ladder data...</div>
			</div>
		);
	}

	return (
		<div className="ladder-container">
			{/* Rank-up celebration banner */}
			{rankUpBanner && (
				<div
					className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
					style={{ background: 'radial-gradient(ellipse, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.95) 100%)' }}
				>
					<div className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: rankUpBanner.color, fontFamily: "'Cinzel', Georgia, serif" }}>
						You Ascend To
					</div>
					<div className="text-5xl font-black mb-4" style={{ color: rankUpBanner.color, fontFamily: "'Cinzel', Georgia, serif", textShadow: `0 0 30px ${rankUpBanner.color}60, 0 4px 20px rgba(0,0,0,0.9)` }}>
						{rankUpBanner.name}
					</div>
					<div className="text-base italic max-w-md text-center" style={{ color: 'rgba(245,232,198,0.8)', fontFamily: 'Georgia, serif' }}>
						{rankUpBanner.flavor}
					</div>
				</div>
			)}
			{/* Header */}
			<div className="ladder-header px-6 py-4 flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link to={routes.home}>
						<button className="text-gray-400 hover:text-white transition-colors text-sm">
							&larr; Back
						</button>
					</Link>
					<h1 className="ladder-title text-3xl font-bold">Ranked Ladder</h1>
				</div>

				{myEntry && myRank && (
					<div className="flex items-center gap-6 text-sm">
						<div>
							<span className="ladder-stat-label">Your Rank</span>
							<div className="ladder-stat-value text-white text-lg">#{myRank}</div>
						</div>
						<div>
							<span className="ladder-stat-label">Realm</span>
							<div
								className="ladder-stat-value text-lg"
								style={{ color: getYggdrasilRank(myEntry.elo).color }}
								title={getYggdrasilRank(myEntry.elo).flavor}
							>
								{getYggdrasilRank(myEntry.elo).name}
							</div>
						</div>
						<div>
							<span className="ladder-stat-label">ELO</span>
							<div className="ladder-elo text-lg">{myEntry.elo}</div>
						</div>
						<div>
							<span className="ladder-stat-label">Record</span>
							<div className="ladder-stat-value text-white text-lg">
								<span className="text-green-400">{myEntry.wins}W</span>
								{' / '}
								<span className="text-red-400">{myEntry.losses}L</span>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Season Banner */}
			{seasonInfo.seasonNumber > 0 ? (
				<div className="ladder-season-banner">
					<div>
						<div className="ladder-season-name">{seasonInfo.seasonName}</div>
						<div className="ladder-season-number">Season {seasonInfo.seasonNumber}</div>
					</div>
					<div className="ladder-season-stats">
						<div className="ladder-season-stat">
							<div className="ladder-season-stat-label">Season ELO</div>
							<div className="ladder-season-stat-value">{seasonStore.seasonElo}</div>
						</div>
						<div className="ladder-season-stat">
							<div className="ladder-season-stat-label">Record</div>
							<div className="ladder-season-stat-value">
								<span style={{ color: '#22c55e' }}>{seasonStore.seasonWins}W</span>
								{' / '}
								<span style={{ color: '#ef4444' }}>{seasonStore.seasonLosses}L</span>
							</div>
						</div>
						<div className="ladder-season-stat">
							<div className="ladder-season-stat-label">Ends In</div>
							<div className="ladder-season-timer">
								{formatTimeRemaining(seasonInfo.timeRemainingMs)}
							</div>
						</div>
					</div>
				</div>
			) : (
				<div className="ladder-season-banner">
					<div className="ladder-season-preseason">
						Pre-Season &mdash; Season 1 begins {new Date(seasonInfo.endDate).toLocaleDateString()}
					</div>
				</div>
			)}

			{/* Tabs */}
			<div className="px-6 py-3 flex gap-2">
				<button
					className={`ladder-tab ${tab === 'leaderboard' ? 'ladder-tab-active' : ''}`}
					onClick={() => setTab('leaderboard')}
				>
					Leaderboard
				</button>
				<button
					className={`ladder-tab ${tab === 'history' ? 'ladder-tab-active' : ''}`}
					onClick={() => setTab('history')}
				>
					Match History
				</button>
			</div>

			{/* Content */}
			<div className="px-6 py-4">
				{tab === 'leaderboard' && (
					<LeaderboardTab ladder={ladder} myUsername={myUsername} />
				)}
				{tab === 'history' && (
					<MatchHistoryTab matches={rankedHistory} myUsername={myUsername} />
				)}
			</div>
		</div>
	);
}

function LeaderboardTab({ ladder, myUsername }: { ladder: LadderEntry[]; myUsername: string }) {
	if (ladder.length === 0) {
		return (
			<div className="ladder-empty-state">
				<div className="text-4xl mb-4">&#9876;</div>
				<div className="text-lg font-medium mb-2">No ranked matches yet</div>
				<div className="text-sm">Play ranked games to appear on the leaderboard.</div>
				<Link to={routes.multiplayer} className="inline-block mt-6">
					<button className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium transition-colors">
						Play Ranked
					</button>
				</Link>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2 max-w-3xl">
			{/* Header row */}
			<div className="grid grid-cols-[48px_1fr_80px_100px_80px_80px] gap-3 px-4 py-2 text-xs uppercase tracking-wider text-gray-500">
				<div>Rank</div>
				<div>Player</div>
				<div className="text-right">ELO</div>
				<div className="text-center">Record</div>
				<div className="text-center">Win %</div>
				<div className="text-right">Last</div>
			</div>

			{ladder.map((entry, i) => {
				const rank = i + 1;
				const isSelf = entry.username === myUsername;
				return (
					<div
						key={entry.username}
						className={`grid grid-cols-[48px_1fr_80px_100px_80px_80px] gap-3 items-center px-4 py-3 ${isSelf ? 'ladder-row-self' : 'ladder-row'}`}
					>
						<RankBadge rank={rank} />
						<div className={`font-medium truncate ${isSelf ? 'text-purple-300' : 'text-white'}`}>
							{entry.username}
						</div>
						<div className="ladder-elo text-right">{entry.elo}</div>
						<div className="text-center text-sm">
							<span className="text-green-400">{entry.wins}</span>
							<span className="text-gray-600 mx-1">/</span>
							<span className="text-red-400">{entry.losses}</span>
						</div>
						<div className="flex flex-col items-center gap-1">
							<span className="text-xs text-gray-400">{entry.winRate.toFixed(0)}%</span>
							<WinRateBar rate={entry.winRate} />
						</div>
						<div className="text-right text-xs text-gray-500">
							{entry.lastMatch > 0 ? timeAgo(entry.lastMatch) : '-'}
						</div>
					</div>
				);
			})}
		</div>
	);
}

function MatchHistoryTab({ matches, myUsername }: { matches: HiveMatchResult[]; myUsername: string }) {
	if (matches.length === 0) {
		return (
			<div className="ladder-empty-state">
				<div className="text-4xl mb-4">&#128196;</div>
				<div className="text-lg font-medium mb-2">No match history</div>
				<div className="text-sm">Your ranked match results will appear here.</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2 max-w-3xl">
			{matches.map(m => {
				const isWinner = m.winnerId === myUsername;
				const opponent = m.player1.hiveUsername === myUsername
					? m.player2.hiveUsername
					: m.player1.hiveUsername;
				const myStats = m.player1.hiveUsername === myUsername ? m.player1 : m.player2;

				return (
					<div
						key={m.matchId}
						className={`ladder-match-row flex items-center justify-between ${isWinner ? 'ladder-match-win' : 'ladder-match-loss'}`}
					>
						<div className="flex items-center gap-4">
							<div className={`text-sm font-bold ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
								{isWinner ? 'WIN' : 'LOSS'}
							</div>
							<div>
								<div className="text-white font-medium">vs {opponent || 'Unknown'}</div>
								<div className="text-xs text-gray-500">{timeAgo(m.timestamp)}</div>
							</div>
						</div>

						<div className="flex items-center gap-6 text-sm">
							<div className="text-center">
								<div className="ladder-stat-label">Rounds</div>
								<div className="ladder-stat-value text-gray-300">{m.totalRounds}</div>
							</div>
							<div className="text-center">
								<div className="ladder-stat-label">Duration</div>
								<div className="ladder-stat-value text-gray-300">
									{formatDuration(Math.round(m.duration / 1000))}
								</div>
							</div>
							<div className="text-center">
								<div className="ladder-stat-label">Damage</div>
								<div className="ladder-stat-value text-gray-300">{myStats.damageDealt}</div>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
