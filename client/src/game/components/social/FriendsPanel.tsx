import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Crosshair, UserPlus, Users, Wifi, WifiOff } from 'lucide-react';
import { useFriendStore, type Friend, type FriendPresence } from '../../stores/friendStore';
import { useNFTUsername } from '../../nft/hooks';
import { routes } from '../../../lib/routes';

function AddFriendDialog({ onAdd, onClose }: { onAdd: (name: string) => void; onClose: () => void }) {
	const [name, setName] = useState('');

	return (
		<div className="bg-gray-800/90 border border-gray-600 rounded-lg p-3 space-y-2">
			<p className="text-xs text-gray-400">Enter Hive username</p>
			<div className="flex gap-2">
				<input
					type="text"
					value={name}
					onChange={e => setName(e.target.value)}
					onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onAdd(name.trim()); }}
					placeholder="@username"
					autoFocus
					className="flex-1 min-w-0 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
				/>
				<button
					onClick={() => { if (name.trim()) onAdd(name.trim()); }}
					disabled={!name.trim()}
					className="px-2 py-1 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 text-white rounded text-xs font-semibold transition-colors"
				>
					Add
				</button>
				<button onClick={onClose} className="px-2 py-1 text-gray-500 hover:text-gray-300 text-xs">
					Cancel
				</button>
			</div>
		</div>
	);
}

function FriendCard({ friend, presence, onChallenge }: { friend: Friend; presence?: FriendPresence; onChallenge: (username: string) => void }) {
	const removeFriend = useFriendStore(s => s.removeFriend);
	const isOnline = presence?.online ?? false;

		return (
			<div className="flex items-center justify-between rounded-xl border border-white/5 bg-gray-900/35 px-3 py-2.5 transition-colors hover:bg-gray-800/40 group">
				<div className="flex items-center gap-2">
					<div className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${isOnline ? 'bg-green-500/12 text-green-300' : 'bg-slate-500/12 text-slate-400'}`}>
						{isOnline ? <Wifi size={14} strokeWidth={2} /> : <WifiOff size={14} strokeWidth={2} />}
					</div>
					<span className="text-sm font-medium text-gray-200">
						{friend.nickname || `@${friend.hiveUsername}`}
					</span>
				</div>
				<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
					{isOnline && (
						<button
							type="button"
							onClick={() => onChallenge(friend.hiveUsername)}
							className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-amber-100"
						>
							<Crosshair size={13} strokeWidth={2} />
							Challenge
						</button>
					)}
					<button
						type="button"
						onClick={() => removeFriend(friend.hiveUsername)}
						className="text-xs text-gray-500 hover:text-red-300"
					>
						Remove
					</button>
			</div>
		</div>
	);
}

export default function FriendsPanel() {
	const hiveUsername = useNFTUsername();
	const friends = useFriendStore(s => s.friends);
	const onlineStatus = useFriendStore(s => s.onlineStatus);
	const addFriend = useFriendStore(s => s.addFriend);
	const updatePresence = useFriendStore(s => s.updatePresence);
	const navigate = useNavigate();
	const [showAdd, setShowAdd] = useState(false);
	const [expanded, setExpanded] = useState(true);

	const handleChallenge = useCallback((username: string) => {
		navigate(`${routes.multiplayer}?challenge=${encodeURIComponent(username)}`);
	}, [navigate]);

	const pollPresence = useCallback(async (signal?: AbortSignal) => {
		if (!hiveUsername || friends.length === 0) return;
		try {
			const res = await fetch('/api/friends/heartbeat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: hiveUsername,
					friends: friends.map(f => f.hiveUsername),
				}),
				signal,
			});
			if (res.ok) {
				const data = await res.json();
				updatePresence(data.statuses ?? {});
			}
		} catch (e) {
			if (e instanceof Error && e.name === 'AbortError') return;
		}
	}, [hiveUsername, friends, updatePresence]);

	useEffect(() => {
		const controller = new AbortController();
		pollPresence(controller.signal);
		const interval = setInterval(() => pollPresence(controller.signal), 30000);
		return () => {
			controller.abort();
			clearInterval(interval);
		};
	}, [pollPresence]);

	const onlineFriends = friends.filter(f => onlineStatus[f.hiveUsername]?.online);
	const offlineFriends = friends.filter(f => !onlineStatus[f.hiveUsername]?.online);

	return (
		<div className="w-64 space-y-3">
			<button
				onClick={() => setExpanded(!expanded)}
				className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-left"
			>
				<div className="flex items-center gap-2">
					<Users size={15} strokeWidth={2} className="text-amber-300" />
					<h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200/80">
						Warband ({friends.length})
					</h3>
				</div>
				<span className="text-gray-500 text-xs">
					{expanded ? <ChevronUp size={15} strokeWidth={2} /> : <ChevronDown size={15} strokeWidth={2} />}
				</span>
			</button>

			{expanded && (
				<div className="space-y-2">
					{onlineFriends.length > 0 && (
						<>
							<p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-green-400/75">Online</p>
							{onlineFriends.map(f => (
								<FriendCard key={f.hiveUsername} friend={f} presence={onlineStatus[f.hiveUsername]} onChallenge={handleChallenge} />
							))}
						</>
					)}
					{offlineFriends.length > 0 && (
						<>
							<p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400/75">Offline</p>
							{offlineFriends.map(f => (
								<FriendCard key={f.hiveUsername} friend={f} presence={onlineStatus[f.hiveUsername]} onChallenge={handleChallenge} />
							))}
						</>
					)}
					{friends.length === 0 && (
						<div className="rounded-xl border border-dashed border-white/8 bg-black/10 px-3 py-3">
							<p className="text-sm font-medium text-gray-300">No warband contacts yet.</p>
							<p className="mt-1 text-xs leading-relaxed text-gray-500">
								Add a Hive player here and challenge them directly from the multiplayer lobby when they are online.
							</p>
						</div>
					)}

					{showAdd ? (
						<AddFriendDialog
							onAdd={(name) => { addFriend(name); setShowAdd(false); }}
							onClose={() => setShowAdd(false)}
						/>
						) : (
							<button
								onClick={() => setShowAdd(true)}
								className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-amber-400/20 hover:bg-gray-800/40 hover:text-amber-100"
							>
								<UserPlus size={15} strokeWidth={2} />
								Add Contact
							</button>
						)}
					</div>
			)}
		</div>
	);
}
