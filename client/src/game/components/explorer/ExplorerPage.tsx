import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '../../../lib/routes';

const API_BASE = '/api/explorer';

interface ExplorerStats {
	totalPlayers: number;
	totalNfts: number;
	totalMatches: number;
	totalListings: number;
	totalOffers: number;
	uniqueOwners: number;
	lastBlock: number;
}

interface NftRecord {
	uid: string;
	cardId: number;
	owner: string;
	rarity: string;
	level: number;
	xp: number;
}

interface PlayerProfile {
	username: string;
	elo: number;
	wins: number;
	losses: number;
	lastMatchAt: number;
	nftCount: number;
	nftsByRarity: Record<string, number>;
	runeBalance: number;
	indexed: boolean;
}

interface MatchRecord {
	matchId: string;
	winner: string;
	loser: string;
	winnerEloBefore: number;
	winnerEloAfter: number;
	loserEloBefore: number;
	loserEloAfter: number;
	timestamp: number;
	blockNum: number;
}

interface LeaderboardEntry {
	username: string;
	elo: number;
	wins: number;
	losses: number;
}

interface ListingRecord {
	listingId: string;
	nftUid: string;
	nftType: 'card' | 'pack';
	seller: string;
	price: number;
	currency: 'HIVE' | 'HBD';
	listedBlock: number;
	active: boolean;
}

interface SupplyCounter {
	key: string;
	pool: string;
	cap: number;
	minted: number;
}

type Tab = 'overview' | 'nfts' | 'users' | 'marketplace' | 'leaderboard' | 'supply';

const RARITY_COLORS: Record<string, string> = {
	common: '#9ca3af',
	rare: '#3b82f6',
	epic: '#a855f7',
	mythic: '#f59e0b',
};

async function apiFetch<T>(path: string): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`);
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	return res.json();
}

function formatNumber(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString();
}

function timeAgo(ts: number): string {
	if (!ts) return 'Never';
	const diff = Date.now() - ts;
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'Just now';
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
	return (
		<div style={{
			background: 'linear-gradient(135deg, rgba(30,30,40,0.9), rgba(20,20,30,0.95))',
			border: '1px solid rgba(212,175,55,0.2)',
			borderRadius: 8,
			padding: '16px 20px',
			textAlign: 'center',
			minWidth: 140,
		}}>
			<div style={{ fontSize: '1.6rem', fontWeight: 700, color: color ?? '#d4af37', fontFamily: 'monospace' }}>
				{typeof value === 'number' ? formatNumber(value) : value}
			</div>
			<div style={{ fontSize: '0.75rem', color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
				{label}
			</div>
		</div>
	);
}

function RarityBadge({ rarity }: { rarity: string }) {
	const color = RARITY_COLORS[rarity] ?? '#666';
	return (
		<span style={{
			display: 'inline-block',
			padding: '2px 8px',
			borderRadius: 4,
			fontSize: '0.7rem',
			fontWeight: 600,
			textTransform: 'uppercase',
			color: '#fff',
			background: color,
			letterSpacing: 0.5,
		}}>
			{rarity}
		</span>
	);
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab() {
	const [stats, setStats] = useState<ExplorerStats | null>(null);
	const [health, setHealth] = useState<{ status: string; lastBlock: number; secondsSinceUpdate: number } | null>(null);
	const mounted = useRef(true);

	useEffect(() => {
		mounted.current = true;
		Promise.all([
			apiFetch<ExplorerStats>('/stats'),
			apiFetch<{ status: string; lastBlock: number; secondsSinceUpdate: number }>('/health'),
		]).then(([s, h]) => {
			if (!mounted.current) return;
			setStats(s);
			setHealth(h);
		}).catch(() => {});
		return () => { mounted.current = false; };
	}, []);

	if (!stats) return <div style={{ color: '#8a8a9a', textAlign: 'center', padding: 40 }}>Loading protocol data...</div>;

	return (
		<div>
			<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
				<StatCard label="Total NFTs" value={stats.totalNfts} />
				<StatCard label="Unique Owners" value={stats.uniqueOwners} />
				<StatCard label="Players" value={stats.totalPlayers} />
				<StatCard label="Matches" value={stats.totalMatches} />
				<StatCard label="Active Listings" value={stats.totalListings} />
				<StatCard label="Pending Offers" value={stats.totalOffers} />
			</div>

			<div style={{
				background: 'rgba(20,20,30,0.8)',
				border: '1px solid rgba(212,175,55,0.15)',
				borderRadius: 8,
				padding: 20,
			}}>
				<h3 style={{ color: '#d4af37', fontSize: '1rem', marginBottom: 12 }}>Indexer Status</h3>
				<div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: '0.85rem' }}>
					<span style={{ color: '#8a8a9a' }}>Status:</span>
					<span style={{ color: health?.status === 'healthy' ? '#4ade80' : '#f87171' }}>
						{health?.status ?? 'unknown'}
					</span>
					<span style={{ color: '#8a8a9a' }}>Last Block:</span>
					<span style={{ color: '#e0e0e0', fontFamily: 'monospace' }}>{formatNumber(stats.lastBlock)}</span>
					<span style={{ color: '#8a8a9a' }}>Last Update:</span>
					<span style={{ color: '#e0e0e0' }}>{health ? `${health.secondsSinceUpdate}s ago` : 'unknown'}</span>
					<span style={{ color: '#8a8a9a' }}>Protocol:</span>
					<span style={{ color: '#e0e0e0' }}>Ragnarok v1.2</span>
				</div>
			</div>
		</div>
	);
}

// ─── NFTs Tab ────────────────────────────────────────────────────────────────

function NftsTab() {
	const [nfts, setNfts] = useState<NftRecord[]>([]);
	const [total, setTotal] = useState(0);
	const [rarity, setRarity] = useState('');
	const [offset, setOffset] = useState(0);
	const LIMIT = 50;
	const mounted = useRef(true);

	const loadNfts = useCallback((r: string, o: number) => {
		const params = new URLSearchParams({ limit: String(LIMIT), offset: String(o) });
		if (r) params.set('rarity', r);
		apiFetch<{ nfts: NftRecord[]; total: number }>(`/nfts?${params}`)
			.then(data => { if (mounted.current) { setNfts(data.nfts); setTotal(data.total); } })
			.catch(() => {});
	}, []);

	useEffect(() => {
		mounted.current = true;
		loadNfts(rarity, offset);
		return () => { mounted.current = false; };
	}, [rarity, offset, loadNfts]);

	return (
		<div>
			<div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
				<span style={{ color: '#8a8a9a', fontSize: '0.85rem' }}>Filter:</span>
				{['', 'common', 'rare', 'epic', 'mythic'].map(r => (
					<button
						key={r}
						onClick={() => { setRarity(r); setOffset(0); }}
						style={{
							padding: '4px 12px',
							borderRadius: 4,
							border: `1px solid ${rarity === r ? '#d4af37' : 'rgba(255,255,255,0.1)'}`,
							background: rarity === r ? 'rgba(212,175,55,0.2)' : 'rgba(30,30,40,0.6)',
							color: rarity === r ? '#d4af37' : '#ccc',
							cursor: 'pointer',
							fontSize: '0.8rem',
							textTransform: 'capitalize',
						}}
					>
						{r || 'All'}
					</button>
				))}
				<span style={{ marginLeft: 'auto', color: '#8a8a9a', fontSize: '0.8rem' }}>
					{formatNumber(total)} total
				</span>
			</div>

			<div style={{
				background: 'rgba(20,20,30,0.8)',
				border: '1px solid rgba(212,175,55,0.15)',
				borderRadius: 8,
				overflow: 'hidden',
			}}>
				<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
					<thead>
						<tr style={{ borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
							{['UID', 'Card ID', 'Rarity', 'Level', 'Owner'].map(h => (
								<th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#d4af37', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{nfts.length === 0 ? (
							<tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#8a8a9a' }}>No NFTs found</td></tr>
						) : nfts.map(nft => (
							<tr key={nft.uid} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
								<td style={{ padding: '8px 12px', color: '#e0e0e0', fontFamily: 'monospace', fontSize: '0.8rem' }}>{nft.uid.slice(0, 12)}...</td>
								<td style={{ padding: '8px 12px', color: '#e0e0e0' }}>#{nft.cardId}</td>
								<td style={{ padding: '8px 12px' }}><RarityBadge rarity={nft.rarity} /></td>
								<td style={{ padding: '8px 12px', color: '#e0e0e0' }}>Lv.{nft.level}</td>
								<td style={{ padding: '8px 12px', color: '#93c5fd', fontFamily: 'monospace' }}>@{nft.owner}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{total > LIMIT && (
				<div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
					<button
						disabled={offset === 0}
						onClick={() => setOffset(Math.max(0, offset - LIMIT))}
						style={{ ...paginationBtnStyle, opacity: offset === 0 ? 0.4 : 1 }}
					>
						Previous
					</button>
					<span style={{ color: '#8a8a9a', fontSize: '0.8rem', padding: '6px 12px' }}>
						{offset + 1}-{Math.min(offset + LIMIT, total)} of {total}
					</span>
					<button
						disabled={offset + LIMIT >= total}
						onClick={() => setOffset(offset + LIMIT)}
						style={{ ...paginationBtnStyle, opacity: offset + LIMIT >= total ? 0.4 : 1 }}
					>
						Next
					</button>
				</div>
			)}
		</div>
	);
}

// ─── User Lookup Tab ─────────────────────────────────────────────────────────

function UsersTab() {
	const [search, setSearch] = useState('');
	const [profile, setProfile] = useState<PlayerProfile | null>(null);
	const [matches, setMatches] = useState<MatchRecord[]>([]);
	const [nfts, setNfts] = useState<NftRecord[]>([]);
	const [nftTotal, setNftTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const mounted = useRef(true);

	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; };
	}, []);

	const lookupUser = useCallback(async () => {
		const username = search.trim().toLowerCase().replace(/^@/, '');
		if (!username) return;
		setLoading(true);
		setError('');
		try {
			const [p, m, n] = await Promise.all([
				apiFetch<PlayerProfile>(`/users/${username}`),
				apiFetch<{ matches: MatchRecord[] }>(`/users/${username}/matches?limit=10`),
				apiFetch<{ nfts: NftRecord[]; total: number }>(`/users/${username}/nfts?limit=20`),
			]);
			if (!mounted.current) return;
			setProfile(p);
			setMatches(m.matches);
			setNfts(n.nfts);
			setNftTotal(n.total);
		} catch {
			if (mounted.current) setError('Player not found or server unavailable');
		} finally {
			if (mounted.current) setLoading(false);
		}
	}, [search]);

	return (
		<div>
			<div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
				<input
					type="text"
					value={search}
					onChange={e => setSearch(e.target.value)}
					onKeyDown={e => e.key === 'Enter' && lookupUser()}
					placeholder="Enter Hive username..."
					style={{
						flex: 1,
						padding: '10px 14px',
						borderRadius: 6,
						border: '1px solid rgba(212,175,55,0.3)',
						background: 'rgba(20,20,30,0.8)',
						color: '#e0e0e0',
						fontSize: '0.9rem',
						outline: 'none',
					}}
				/>
				<button onClick={lookupUser} disabled={loading} style={{
					...goldBtnStyle,
					opacity: loading ? 0.5 : 1,
				}}>
					{loading ? 'Searching...' : 'Lookup'}
				</button>
			</div>

			{error && <div style={{ color: '#f87171', marginBottom: 12 }}>{error}</div>}

			{profile && (
				<div>
					<div style={{
						background: 'linear-gradient(135deg, rgba(30,30,40,0.9), rgba(20,20,30,0.95))',
						border: '1px solid rgba(212,175,55,0.2)',
						borderRadius: 8,
						padding: 20,
						marginBottom: 16,
					}}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
							<div style={{
								width: 48, height: 48, borderRadius: '50%',
								background: 'linear-gradient(135deg, #d4af37, #8b6914)',
								display: 'flex', alignItems: 'center', justifyContent: 'center',
								fontSize: '1.2rem', fontWeight: 700, color: '#1a1a2e',
							}}>
								{profile.username[0]?.toUpperCase()}
							</div>
							<div>
								<div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#e0e0e0' }}>@{profile.username}</div>
								<div style={{ fontSize: '0.8rem', color: '#8a8a9a' }}>
									{profile.indexed ? 'Indexed' : 'Not yet indexed'}
								</div>
							</div>
						</div>

						<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
							<StatCard label="ELO Rating" value={profile.elo} />
							<StatCard label="Wins" value={profile.wins} color="#4ade80" />
							<StatCard label="Losses" value={profile.losses} color="#f87171" />
							<StatCard label="NFTs Owned" value={profile.nftCount} />
							<StatCard label="RUNE Balance" value={profile.runeBalance} />
						</div>
					</div>

					{Object.keys(profile.nftsByRarity).length > 0 && (
						<div style={{
							background: 'rgba(20,20,30,0.8)',
							border: '1px solid rgba(212,175,55,0.15)',
							borderRadius: 8,
							padding: 16,
							marginBottom: 16,
						}}>
							<h4 style={{ color: '#d4af37', fontSize: '0.85rem', marginBottom: 10 }}>NFT Breakdown</h4>
							<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
								{Object.entries(profile.nftsByRarity).map(([r, count]) => (
									<div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
										<RarityBadge rarity={r} />
										<span style={{ color: '#e0e0e0', fontSize: '0.85rem', fontFamily: 'monospace' }}>x{count}</span>
									</div>
								))}
							</div>
						</div>
					)}

					{nfts.length > 0 && (
						<div style={{
							background: 'rgba(20,20,30,0.8)',
							border: '1px solid rgba(212,175,55,0.15)',
							borderRadius: 8,
							padding: 16,
							marginBottom: 16,
						}}>
							<h4 style={{ color: '#d4af37', fontSize: '0.85rem', marginBottom: 10 }}>
								Collection ({nftTotal} total)
							</h4>
							<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
								{nfts.map(nft => (
									<div key={nft.uid} style={{
										background: 'rgba(30,30,40,0.6)',
										border: '1px solid rgba(255,255,255,0.05)',
										borderRadius: 6,
										padding: '8px 10px',
										fontSize: '0.8rem',
									}}>
										<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
											<span style={{ color: '#e0e0e0' }}>#{nft.cardId}</span>
											<RarityBadge rarity={nft.rarity} />
										</div>
										<div style={{ color: '#8a8a9a', fontSize: '0.7rem', marginTop: 4, fontFamily: 'monospace' }}>
											Lv.{nft.level} | XP:{nft.xp}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{matches.length > 0 && (
						<div style={{
							background: 'rgba(20,20,30,0.8)',
							border: '1px solid rgba(212,175,55,0.15)',
							borderRadius: 8,
							padding: 16,
						}}>
							<h4 style={{ color: '#d4af37', fontSize: '0.85rem', marginBottom: 10 }}>Recent Matches</h4>
							{matches.map(m => {
								const isWin = m.winner === profile.username;
								return (
									<div key={m.matchId} style={{
										display: 'flex', justifyContent: 'space-between', alignItems: 'center',
										padding: '8px 0',
										borderBottom: '1px solid rgba(255,255,255,0.05)',
										fontSize: '0.8rem',
									}}>
										<div>
											<span style={{ color: isWin ? '#4ade80' : '#f87171', fontWeight: 600 }}>
												{isWin ? 'WIN' : 'LOSS'}
											</span>
											<span style={{ color: '#8a8a9a', marginLeft: 8 }}>
												vs @{isWin ? m.loser : m.winner}
											</span>
										</div>
										<div style={{ color: '#8a8a9a', fontSize: '0.75rem' }}>
											{timeAgo(m.timestamp)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ─── Marketplace Tab ─────────────────────────────────────────────────────────

function MarketplaceTab() {
	const [listings, setListings] = useState<ListingRecord[]>([]);
	const [total, setTotal] = useState(0);
	const [sort, setSort] = useState('recent');
	const mounted = useRef(true);

	useEffect(() => {
		mounted.current = true;
		apiFetch<{ listings: ListingRecord[]; total: number }>(`/marketplace/listings?sort=${sort}&limit=50`)
			.then(data => { if (mounted.current) { setListings(data.listings); setTotal(data.total); } })
			.catch(() => {});
		return () => { mounted.current = false; };
	}, [sort]);

	return (
		<div>
			<div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
				<span style={{ color: '#8a8a9a', fontSize: '0.85rem' }}>Sort:</span>
				{[['recent', 'Recent'], ['price_asc', 'Price Low'], ['price_desc', 'Price High']].map(([key, label]) => (
					<button
						key={key}
						onClick={() => setSort(key)}
						style={{
							padding: '4px 12px',
							borderRadius: 4,
							border: `1px solid ${sort === key ? '#d4af37' : 'rgba(255,255,255,0.1)'}`,
							background: sort === key ? 'rgba(212,175,55,0.2)' : 'rgba(30,30,40,0.6)',
							color: sort === key ? '#d4af37' : '#ccc',
							cursor: 'pointer',
							fontSize: '0.8rem',
						}}
					>
						{label}
					</button>
				))}
				<span style={{ marginLeft: 'auto', color: '#8a8a9a', fontSize: '0.8rem' }}>
					{total} listings
				</span>
			</div>

			{listings.length === 0 ? (
				<div style={{
					background: 'rgba(20,20,30,0.8)',
					border: '1px solid rgba(212,175,55,0.15)',
					borderRadius: 8,
					padding: 40,
					textAlign: 'center',
					color: '#8a8a9a',
				}}>
					No active listings. The marketplace awaits its first traders.
				</div>
			) : (
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
					{listings.map(l => (
						<div key={l.listingId} style={{
							background: 'linear-gradient(135deg, rgba(30,30,40,0.9), rgba(20,20,30,0.95))',
							border: '1px solid rgba(212,175,55,0.2)',
							borderRadius: 8,
							padding: 16,
						}}>
							<div style={{ fontSize: '0.75rem', color: '#8a8a9a', marginBottom: 4 }}>
								{l.nftType.toUpperCase()}
							</div>
							<div style={{ color: '#e0e0e0', fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: 8 }}>
								{l.nftUid.slice(0, 16)}...
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ color: '#d4af37', fontWeight: 700, fontSize: '1.1rem' }}>
									{l.price} {l.currency}
								</span>
								<span style={{ color: '#93c5fd', fontSize: '0.75rem' }}>@{l.seller}</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ─── Leaderboard Tab ─────────────────────────────────────────────────────────

function LeaderboardTab() {
	const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
	const [total, setTotal] = useState(0);
	const [offset, setOffset] = useState(0);
	const LIMIT = 50;
	const mounted = useRef(true);

	useEffect(() => {
		mounted.current = true;
		apiFetch<{ players: LeaderboardEntry[]; total: number }>(`/leaderboard?limit=${LIMIT}&offset=${offset}`)
			.then(data => { if (mounted.current) { setPlayers(data.players); setTotal(data.total); } })
			.catch(() => {});
		return () => { mounted.current = false; };
	}, [offset]);

	return (
		<div>
			<div style={{
				background: 'rgba(20,20,30,0.8)',
				border: '1px solid rgba(212,175,55,0.15)',
				borderRadius: 8,
				overflow: 'hidden',
			}}>
				<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
					<thead>
						<tr style={{ borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
							{['Rank', 'Player', 'ELO', 'W', 'L', 'Win Rate'].map(h => (
								<th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#d4af37', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{players.length === 0 ? (
							<tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#8a8a9a' }}>No ranked players yet</td></tr>
						) : players.map((p, i) => {
							const rank = offset + i + 1;
							const total = p.wins + p.losses;
							const winRate = total > 0 ? Math.round((p.wins / total) * 100) : 0;
							const rankColor = rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#e0e0e0';
							return (
								<tr key={p.username} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
									<td style={{ padding: '8px 12px', color: rankColor, fontWeight: rank <= 3 ? 700 : 400 }}>#{rank}</td>
									<td style={{ padding: '8px 12px', color: '#93c5fd', fontFamily: 'monospace' }}>@{p.username}</td>
									<td style={{ padding: '8px 12px', color: '#d4af37', fontWeight: 600, fontFamily: 'monospace' }}>{p.elo}</td>
									<td style={{ padding: '8px 12px', color: '#4ade80' }}>{p.wins}</td>
									<td style={{ padding: '8px 12px', color: '#f87171' }}>{p.losses}</td>
									<td style={{ padding: '8px 12px', color: '#e0e0e0' }}>{winRate}%</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{total > LIMIT && (
				<div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
					<button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))} style={{ ...paginationBtnStyle, opacity: offset === 0 ? 0.4 : 1 }}>Previous</button>
					<span style={{ color: '#8a8a9a', fontSize: '0.8rem', padding: '6px 12px' }}>{offset + 1}-{Math.min(offset + LIMIT, total)} of {total}</span>
					<button disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)} style={{ ...paginationBtnStyle, opacity: offset + LIMIT >= total ? 0.4 : 1 }}>Next</button>
				</div>
			)}
		</div>
	);
}

// ─── Supply Tab ──────────────────────────────────────────────────────────────

function SupplyTab() {
	const [supply, setSupply] = useState<SupplyCounter[]>([]);
	const mounted = useRef(true);

	useEffect(() => {
		mounted.current = true;
		apiFetch<{ supply: SupplyCounter[] }>('/supply')
			.then(data => { if (mounted.current) setSupply(data.supply); })
			.catch(() => {});
		return () => { mounted.current = false; };
	}, []);

	const RARITY_CAPS: Record<string, number> = {
		mythic: 250,
		epic: 500,
		rare: 1000,
		common: 2000,
	};

	return (
		<div>
			<div style={{
				background: 'rgba(20,20,30,0.8)',
				border: '1px solid rgba(212,175,55,0.15)',
				borderRadius: 8,
				padding: 20,
				marginBottom: 20,
			}}>
				<h3 style={{ color: '#d4af37', fontSize: '1rem', marginBottom: 16 }}>Per-Rarity Supply Caps</h3>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
					{Object.entries(RARITY_CAPS).map(([rarity, cap]) => (
						<div key={rarity} style={{
							background: 'rgba(30,30,40,0.6)',
							borderRadius: 6,
							padding: 16,
							textAlign: 'center',
						}}>
							<RarityBadge rarity={rarity} />
							<div style={{ color: '#e0e0e0', fontSize: '1.4rem', fontWeight: 700, marginTop: 8, fontFamily: 'monospace' }}>
								{cap.toLocaleString()}
							</div>
							<div style={{ color: '#8a8a9a', fontSize: '0.7rem' }}>per card max</div>
						</div>
					))}
				</div>
			</div>

			{supply.length > 0 && (
				<div style={{
					background: 'rgba(20,20,30,0.8)',
					border: '1px solid rgba(212,175,55,0.15)',
					borderRadius: 8,
					overflow: 'hidden',
				}}>
					<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
						<thead>
							<tr style={{ borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
								{['Pool', 'Cap', 'Minted', 'Remaining'].map(h => (
									<th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#d4af37', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{supply.map(s => (
								<tr key={s.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
									<td style={{ padding: '8px 12px', color: '#e0e0e0' }}>{s.key}</td>
									<td style={{ padding: '8px 12px', color: '#e0e0e0', fontFamily: 'monospace' }}>{s.cap.toLocaleString()}</td>
									<td style={{ padding: '8px 12px', color: '#d4af37', fontFamily: 'monospace' }}>{s.minted.toLocaleString()}</td>
									<td style={{ padding: '8px 12px', color: '#4ade80', fontFamily: 'monospace' }}>{(s.cap - s.minted).toLocaleString()}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

// ─── Shared Styles ───────────────────────────────────────────────────────────

const paginationBtnStyle: React.CSSProperties = {
	padding: '6px 16px',
	borderRadius: 4,
	border: '1px solid rgba(212,175,55,0.3)',
	background: 'rgba(30,30,40,0.6)',
	color: '#d4af37',
	cursor: 'pointer',
	fontSize: '0.8rem',
};

const goldBtnStyle: React.CSSProperties = {
	padding: '10px 20px',
	borderRadius: 6,
	border: '1px solid rgba(212,175,55,0.5)',
	background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(139,105,20,0.3))',
	color: '#d4af37',
	cursor: 'pointer',
	fontSize: '0.9rem',
	fontWeight: 600,
};

// ─── Main Explorer Page ──────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
	{ key: 'overview', label: 'Overview' },
	{ key: 'nfts', label: 'NFTs' },
	{ key: 'users', label: 'Players' },
	{ key: 'marketplace', label: 'Marketplace' },
	{ key: 'leaderboard', label: 'Leaderboard' },
	{ key: 'supply', label: 'Supply' },
];

export default function ExplorerPage() {
	const [tab, setTab] = useState<Tab>('overview');

	return (
		<div style={{
			minHeight: '100vh',
			background: 'linear-gradient(180deg, #0a0a14 0%, #12121e 50%, #0a0a14 100%)',
			color: '#e0e0e0',
			fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
		}}>
			{/* Header */}
			<div style={{
				background: 'linear-gradient(180deg, rgba(212,175,55,0.08), transparent)',
				borderBottom: '1px solid rgba(212,175,55,0.15)',
				padding: '20px 24px',
			}}>
				<div style={{ maxWidth: 1200, margin: '0 auto' }}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
						<div>
							<h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d4af37', margin: 0 }}>
								Ragnarok NFT Explorer
							</h1>
							<p style={{ fontSize: '0.8rem', color: '#8a8a9a', margin: '4px 0 0' }}>
								Browse cards, players, marketplace listings, and protocol statistics
							</p>
						</div>
						<Link to={routes.home} style={{
							padding: '8px 16px',
							borderRadius: 6,
							border: '1px solid rgba(255,255,255,0.1)',
							background: 'rgba(30,30,40,0.6)',
							color: '#ccc',
							textDecoration: 'none',
							fontSize: '0.85rem',
						}}>
							Back to Game
						</Link>
					</div>

					{/* Tab bar */}
					<div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
						{TABS.map(t => (
							<button
								key={t.key}
								onClick={() => setTab(t.key)}
								style={{
									padding: '8px 18px',
									borderRadius: '6px 6px 0 0',
									border: 'none',
									borderBottom: tab === t.key ? '2px solid #d4af37' : '2px solid transparent',
									background: tab === t.key ? 'rgba(212,175,55,0.1)' : 'transparent',
									color: tab === t.key ? '#d4af37' : '#8a8a9a',
									cursor: 'pointer',
									fontSize: '0.85rem',
									fontWeight: tab === t.key ? 600 : 400,
									transition: 'color 0.15s, border-color 0.15s',
									whiteSpace: 'nowrap',
								}}
							>
								{t.label}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Content */}
			<div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
				{tab === 'overview' && <OverviewTab />}
				{tab === 'nfts' && <NftsTab />}
				{tab === 'users' && <UsersTab />}
				{tab === 'marketplace' && <MarketplaceTab />}
				{tab === 'leaderboard' && <LeaderboardTab />}
				{tab === 'supply' && <SupplyTab />}
			</div>

			{/* Footer */}
			<div style={{
				borderTop: '1px solid rgba(212,175,55,0.1)',
				padding: '16px 24px',
				textAlign: 'center',
				fontSize: '0.75rem',
				color: '#555',
			}}>
				Ragnarok Protocol v1.2 — All data derived from Hive L1 chain replay
			</div>
		</div>
	);
}
