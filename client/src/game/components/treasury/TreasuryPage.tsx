import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { routes } from '../../../lib/routes';

interface Signer {
	username: string;
	online: boolean;
	weight: number;
	vouchCount: number;
	joinedAt: string;
}

interface TreasuryStatus {
	frozen: boolean;
	frozenBy?: string;
	unfreezeVotes: number;
	unfreezeThreshold: number;
	threshold: number;
	totalSigners: number;
	onlineSigners: number;
	hbdBalance: string;
	authoritySynced: boolean;
}

interface TreasuryTransaction {
	id: string;
	type: string;
	status: 'pending' | 'delayed' | 'broadcast' | 'expired' | 'vetoed';
	signaturesCollected: number;
	signaturesRequired: number;
	broadcastTxId?: string;
	recipient?: string;
	amount?: string;
	memo?: string;
	timestamp: string;
}

interface WotVouch {
	candidate: string;
	vouches: { username: string; witnessRank: number }[];
	required: number;
}

interface PendingSigning {
	txId: string;
	type: string;
	recipient: string;
	amount: string;
	memo: string;
	digest: string;
	signaturesCollected: number;
	signaturesRequired: number;
}

const API_BASE = '/api/treasury';
const POLL_INTERVAL = 10000;

function getHiveUsername(): string | null {
	try {
		const stored = localStorage.getItem('hive-username');
		return stored || null;
	} catch {
		return null;
	}
}

function signAuthMessage(username: string): Promise<{ signature: string; timestamp: number }> {
	return new Promise((resolve, reject) => {
		const timestamp = Date.now();
		const message = `ragnarok-treasury-auth-${timestamp}`;
		if (!window.hive_keychain) {
			reject(new Error('Hive Keychain not installed'));
			return;
		}
		window.hive_keychain.requestSignBuffer(username, message, 'Active', (response) => {
			if (response.success && response.result) {
				resolve({ signature: response.result.id, timestamp });
			} else {
				reject(new Error(response.error || 'Signing failed'));
			}
		});
	});
}

async function authHeaders(username: string): Promise<Record<string, string>> {
	const { signature, timestamp } = await signAuthMessage(username);
	return {
		'X-Hive-Username': username,
		'X-Hive-Signature': signature,
		'X-Hive-Timestamp': String(timestamp),
		'Content-Type': 'application/json',
	};
}

async function apiPost(path: string, body: Record<string, unknown>, username: string) {
	const headers = await authHeaders(username);
	const res = await fetch(`${API_BASE}${path}`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}

async function apiDelete(path: string, username: string) {
	const headers = await authHeaders(username);
	const res = await fetch(`${API_BASE}${path}`, {
		method: 'DELETE',
		headers,
	});
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}

function StatusBanner({ status }: { status: TreasuryStatus | null }) {
	if (!status) return null;

	return (
		<motion.div
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			className="rounded-lg p-4 border"
			style={{
				background: status.frozen
					? 'linear-gradient(135deg, rgba(127, 29, 29, 0.6), rgba(30, 10, 10, 0.8))'
					: 'linear-gradient(135deg, rgba(20, 40, 20, 0.6), rgba(10, 20, 10, 0.8))',
				borderColor: status.frozen ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)',
			}}
		>
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div className="flex items-center gap-3">
					<div
						className="w-3 h-3 rounded-full"
						style={{ background: status.frozen ? '#ef4444' : '#22c55e' }}
					/>
					<span
						className="text-lg font-bold tracking-wide uppercase"
						style={{ fontFamily: 'Cinzel, serif', color: status.frozen ? '#ef4444' : '#22c55e' }}
					>
						{status.frozen ? 'Treasury Frozen' : 'Operational'}
					</span>
				</div>

				<div className="flex items-center gap-6 text-sm">
					<div className="flex items-center gap-2">
						<span className="text-gray-400">Signers:</span>
						<span className="text-green-400 font-semibold">{status.onlineSigners}</span>
						<span className="text-gray-500">/</span>
						<span className="text-gray-300">{status.totalSigners}</span>
						<span className="text-gray-500">online</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-gray-400">Threshold:</span>
						<span style={{ color: '#DAA520' }} className="font-semibold">{status.threshold}</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-gray-400">Balance:</span>
						<span style={{ color: '#FFD700' }} className="font-bold">{status.hbdBalance} HBD</span>
					</div>
					<div className="flex items-center gap-2">
						<div
							className="w-2 h-2 rounded-full"
							style={{ background: status.authoritySynced ? '#22c55e' : '#f59e0b' }}
						/>
						<span className="text-gray-400 text-xs">
							{status.authoritySynced ? 'Synced' : 'Syncing'}
						</span>
					</div>
				</div>
			</div>
		</motion.div>
	);
}

function AuthorityRing({ status }: { status: TreasuryStatus | null; signers: Signer[] }) {
	if (!status) return null;

	const size = 200;
	const cx = size / 2;
	const cy = size / 2;
	const radius = 75;
	const strokeWidth = 12;

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay: 0.1 }}
			className="flex justify-center"
		>
			<div className="relative" style={{ width: size, height: size }}>
				<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
					<circle
						cx={cx} cy={cy} r={radius}
						fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth}
					/>
					{Array.from({ length: status.totalSigners }).map((_, i) => {
						const total = status.totalSigners;
						const gap = 4;
						const arcLen = (360 - gap * total) / total;
						const startAngle = i * (arcLen + gap) - 90;
						const endAngle = startAngle + arcLen;
						const startRad = (startAngle * Math.PI) / 180;
						const endRad = (endAngle * Math.PI) / 180;
						const x1 = cx + radius * Math.cos(startRad);
						const y1 = cy + radius * Math.sin(startRad);
						const x2 = cx + radius * Math.cos(endRad);
						const y2 = cy + radius * Math.sin(endRad);
						const largeArc = arcLen > 180 ? 1 : 0;
						const isOnline = i < status.onlineSigners;

						return (
							<path
								key={i}
								d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
								fill="none"
								stroke={isOnline ? '#22c55e' : '#4b5563'}
								strokeWidth={strokeWidth}
								strokeLinecap="round"
							/>
						);
					})}
				</svg>
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					<span style={{ color: '#DAA520', fontFamily: 'Cinzel, serif' }} className="text-2xl font-bold">
						{status.threshold}
					</span>
					<span className="text-gray-400 text-xs">of {status.totalSigners} required</span>
				</div>
			</div>
		</motion.div>
	);
}

function SignersTable({ signers, currentUser, onLeave }: {
	signers: Signer[];
	currentUser: string | null;
	onLeave: () => void;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.2 }}
			className="rounded-lg border overflow-hidden"
			style={{ background: 'rgba(10, 14, 26, 0.8)', borderColor: 'rgba(218, 165, 32, 0.3)' }}
		>
			<div className="p-4 border-b" style={{ borderColor: 'rgba(218, 165, 32, 0.2)' }}>
				<h2 style={{ fontFamily: 'Cinzel, serif', color: '#DAA520' }} className="text-lg font-bold">
					Active Signers
				</h2>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="text-gray-400 text-xs uppercase tracking-wider">
							<th className="text-left p-3">Username</th>
							<th className="text-center p-3">Status</th>
							<th className="text-center p-3">Weight</th>
							<th className="text-center p-3">Vouches</th>
							<th className="text-center p-3">Joined</th>
							<th className="text-right p-3">Actions</th>
						</tr>
					</thead>
					<tbody>
						{signers.map((signer) => (
							<tr key={signer.username} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
								<td className="p-3 text-gray-200 font-semibold">@{signer.username}</td>
								<td className="p-3 text-center">
									<span className="inline-flex items-center gap-1.5">
										<span
											className="w-2 h-2 rounded-full"
											style={{ background: signer.online ? '#22c55e' : '#6b7280' }}
										/>
										<span className={signer.online ? 'text-green-400' : 'text-gray-500'}>
											{signer.online ? 'Online' : 'Offline'}
										</span>
									</span>
								</td>
								<td className="p-3 text-center text-gray-300">{signer.weight}</td>
								<td className="p-3 text-center text-gray-300">{signer.vouchCount}</td>
								<td className="p-3 text-center text-gray-400">
									{new Date(signer.joinedAt).toLocaleDateString()}
								</td>
								<td className="p-3 text-right">
									{currentUser === signer.username && (
										<button
											onClick={onLeave}
											className="px-3 py-1 text-xs font-semibold rounded border transition-colors"
											style={{
												borderColor: 'rgba(239, 68, 68, 0.4)',
												color: '#ef4444',
												background: 'rgba(127, 29, 29, 0.3)',
											}}
										>
											Leave Treasury
										</button>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</motion.div>
	);
}

function JoinLeaveActions({ signers, currentUser, onJoin, onLeave }: {
	signers: Signer[];
	currentUser: string | null;
	onJoin: () => void;
	onLeave: () => void;
}) {
	if (!currentUser) return null;
	const isSigner = signers.some(s => s.username === currentUser);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.25 }}
			className="rounded-lg border p-4"
			style={{ background: 'rgba(10, 14, 26, 0.8)', borderColor: 'rgba(218, 165, 32, 0.3)' }}
		>
			{isSigner ? (
				<div className="flex items-center justify-between">
					<div>
						<p className="text-gray-300 text-sm">You are an active signer.</p>
						<p className="text-gray-500 text-xs mt-1">
							Leaving has a 72-hour cooldown before you can rejoin.
						</p>
					</div>
					<button
						onClick={onLeave}
						className="px-4 py-2 text-sm font-semibold rounded border transition-colors"
						style={{
							borderColor: 'rgba(239, 68, 68, 0.4)',
							color: '#ef4444',
							background: 'rgba(127, 29, 29, 0.3)',
						}}
					>
						Leave Treasury
					</button>
				</div>
			) : (
				<div className="flex items-center justify-between">
					<div>
						<p className="text-gray-300 text-sm">Join as a treasury signer.</p>
						<p className="text-gray-500 text-xs mt-1">
							Requires top-100 witness rank or 3 Web of Trust vouches.
						</p>
					</div>
					<button
						onClick={onJoin}
						className="px-4 py-2 text-sm font-bold rounded border transition-colors"
						style={{
							borderColor: 'rgba(218, 165, 32, 0.5)',
							color: '#FFD700',
							background: 'rgba(218, 165, 32, 0.15)',
						}}
					>
						Join as Signer
					</button>
				</div>
			)}
		</motion.div>
	);
}

function WebOfTrust({ vouches, currentUser, signers, onVouch, onRevoke }: {
	vouches: WotVouch[];
	currentUser: string | null;
	signers: Signer[];
	onVouch: (candidate: string) => void;
	onRevoke: (candidate: string) => void;
}) {
	const [candidateInput, setCandidateInput] = useState('');
	const isSigner = signers.some(s => s.username === currentUser);

	const handleVouch = () => {
		if (!candidateInput.trim()) return;
		onVouch(candidateInput.trim());
		setCandidateInput('');
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.3 }}
			className="rounded-lg border p-4"
			style={{ background: 'rgba(10, 14, 26, 0.8)', borderColor: 'rgba(218, 165, 32, 0.3)' }}
		>
			<h2 style={{ fontFamily: 'Cinzel, serif', color: '#DAA520' }} className="text-lg font-bold mb-4">
				Web of Trust
			</h2>

			{isSigner && (
				<div className="flex gap-2 mb-4">
					<input
						type="text"
						value={candidateInput}
						onChange={(e) => setCandidateInput(e.target.value)}
						placeholder="Username to vouch for..."
						className="flex-1 px-3 py-2 rounded text-sm text-gray-200"
						style={{
							background: 'rgba(255,255,255,0.05)',
							border: '1px solid rgba(218, 165, 32, 0.2)',
						}}
					/>
					<button
						onClick={handleVouch}
						className="px-4 py-2 text-sm font-semibold rounded transition-colors"
						style={{
							background: 'rgba(218, 165, 32, 0.2)',
							color: '#DAA520',
							border: '1px solid rgba(218, 165, 32, 0.4)',
						}}
					>
						Vouch
					</button>
				</div>
			)}

			{vouches.length === 0 ? (
				<p className="text-gray-500 text-sm">No pending candidates.</p>
			) : (
				<div className="space-y-3">
					{vouches.map((v) => (
						<div
							key={v.candidate}
							className="rounded-lg p-3"
							style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
						>
							<div className="flex items-center justify-between mb-2">
								<span className="text-gray-200 font-semibold text-sm">@{v.candidate}</span>
								<span className="text-gray-400 text-xs">
									{v.vouches.length}/{v.required} vouches
								</span>
							</div>
							<div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
								<motion.div
									className="h-full rounded-full"
									style={{ background: 'linear-gradient(90deg, #DAA520, #FFD700)' }}
									initial={{ width: 0 }}
									animate={{ width: `${(v.vouches.length / v.required) * 100}%` }}
								/>
							</div>
							<div className="mt-2 flex flex-wrap gap-2">
								{v.vouches.map((vouch) => (
									<span
										key={vouch.username}
										className="text-xs px-2 py-0.5 rounded"
										style={{ background: 'rgba(218, 165, 32, 0.15)', color: '#DAA520' }}
									>
										@{vouch.username} (#{vouch.witnessRank})
									</span>
								))}
							</div>
							{isSigner && v.vouches.some(vo => vo.username === currentUser) && (
								<button
									type="button"
									onClick={() => onRevoke(v.candidate)}
									className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors"
								>
									Revoke my vouch
								</button>
							)}
						</div>
					))}
				</div>
			)}
		</motion.div>
	);
}

function RecentTransactions({ transactions, currentUser, signers, onSign, onVeto }: {
	transactions: TreasuryTransaction[];
	currentUser: string | null;
	signers: Signer[];
	onSign: (txId: string) => void;
	onVeto: (txId: string) => void;
}) {
	const isSigner = signers.some(s => s.username === currentUser);

	const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
		pending: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.4)' },
		delayed: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', border: 'rgba(168, 85, 247, 0.4)' },
		broadcast: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.4)' },
		expired: { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280', border: 'rgba(107, 114, 128, 0.4)' },
		vetoed: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.4)' },
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.35 }}
			className="rounded-lg border overflow-hidden"
			style={{ background: 'rgba(10, 14, 26, 0.8)', borderColor: 'rgba(218, 165, 32, 0.3)' }}
		>
			<div className="p-4 border-b" style={{ borderColor: 'rgba(218, 165, 32, 0.2)' }}>
				<h2 style={{ fontFamily: 'Cinzel, serif', color: '#DAA520' }} className="text-lg font-bold">
					Recent Transactions
				</h2>
			</div>
			{transactions.length === 0 ? (
				<div className="p-8 text-center text-gray-500 text-sm">No transactions yet.</div>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-gray-400 text-xs uppercase tracking-wider">
								<th className="text-left p-3">Type</th>
								<th className="text-center p-3">Status</th>
								<th className="text-center p-3">Signatures</th>
								<th className="text-left p-3">Tx ID</th>
								<th className="text-right p-3">Time</th>
								<th className="text-right p-3">Actions</th>
							</tr>
						</thead>
						<tbody>
							{transactions.map((tx) => {
								const style = statusStyles[tx.status] || statusStyles.expired;
								return (
									<tr key={tx.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
										<td className="p-3 text-gray-200 capitalize">{tx.type.replace(/_/g, ' ')}</td>
										<td className="p-3 text-center">
											<span
												className="px-2 py-0.5 rounded text-xs font-semibold border"
												style={{
													background: style.bg,
													color: style.text,
													borderColor: style.border,
												}}
											>
												{tx.status}
											</span>
										</td>
										<td className="p-3 text-center text-gray-300">
											{tx.signaturesCollected}/{tx.signaturesRequired}
										</td>
										<td className="p-3 text-gray-400 font-mono text-xs">
											{tx.broadcastTxId
												? `${tx.broadcastTxId.slice(0, 8)}...`
												: '—'}
										</td>
										<td className="p-3 text-right text-gray-400 text-xs">
											{new Date(tx.timestamp).toLocaleString()}
										</td>
										<td className="p-3 text-right">
											<div className="flex justify-end gap-2">
												{tx.status === 'pending' && isSigner && (
													<button
														onClick={() => onSign(tx.id)}
														className="px-3 py-1 text-xs font-semibold rounded transition-colors"
														style={{
															background: 'rgba(34, 197, 94, 0.2)',
															color: '#22c55e',
															border: '1px solid rgba(34, 197, 94, 0.4)',
														}}
													>
														Sign
													</button>
												)}
												{tx.status === 'delayed' && isSigner && (
													<button
														onClick={() => onVeto(tx.id)}
														className="px-3 py-1 text-xs font-semibold rounded transition-colors"
														style={{
															background: 'rgba(239, 68, 68, 0.2)',
															color: '#ef4444',
															border: '1px solid rgba(239, 68, 68, 0.4)',
														}}
													>
														Veto
													</button>
												)}
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</motion.div>
	);
}

function EmergencyControls({ status, currentUser, signers, onFreeze, onUnfreezeVote }: {
	status: TreasuryStatus | null;
	currentUser: string | null;
	signers: Signer[];
	onFreeze: () => void;
	onUnfreezeVote: () => void;
}) {
	if (!status) return null;
	const isSigner = signers.some(s => s.username === currentUser);
	if (!isSigner) return null;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.4 }}
			className="rounded-lg border p-4"
			style={{
				background: 'rgba(30, 10, 10, 0.6)',
				borderColor: 'rgba(239, 68, 68, 0.3)',
			}}
		>
			<h2 style={{ fontFamily: 'Cinzel, serif' }} className="text-lg font-bold text-red-400 mb-3">
				Emergency Controls
			</h2>

			{status.frozen ? (
				<div className="space-y-3">
					<div className="flex items-center gap-2 text-sm">
						<span className="text-gray-400">Frozen by:</span>
						<span className="text-red-300 font-semibold">@{status.frozenBy}</span>
					</div>
					<div>
						<div className="flex items-center justify-between text-sm mb-1">
							<span className="text-gray-400">Unfreeze votes</span>
							<span className="text-gray-300">
								{status.unfreezeVotes}/{status.unfreezeThreshold}
							</span>
						</div>
						<div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
							<motion.div
								className="h-full rounded-full"
								style={{ background: 'linear-gradient(90deg, #22c55e, #4ade80)' }}
								initial={{ width: 0 }}
								animate={{
									width: `${(status.unfreezeVotes / status.unfreezeThreshold) * 100}%`,
								}}
							/>
						</div>
					</div>
					<button
						onClick={onUnfreezeVote}
						className="px-4 py-2 text-sm font-semibold rounded transition-colors w-full"
						style={{
							background: 'rgba(34, 197, 94, 0.2)',
							color: '#22c55e',
							border: '1px solid rgba(34, 197, 94, 0.4)',
						}}
					>
						Vote to Unfreeze
					</button>
				</div>
			) : (
				<div className="flex items-center justify-between">
					<p className="text-gray-400 text-sm">
						Instantly freeze all treasury operations.
					</p>
					<button
						onClick={onFreeze}
						className="px-4 py-2 text-sm font-bold rounded transition-colors"
						style={{
							background: 'rgba(239, 68, 68, 0.25)',
							color: '#ef4444',
							border: '1px solid rgba(239, 68, 68, 0.5)',
						}}
					>
						Freeze Treasury
					</button>
				</div>
			)}
		</motion.div>
	);
}

function PendingSigningPanel({ pending, username, onApprove, onReject }: {
	pending: PendingSigning[];
	username: string;
	onApprove: (txId: string, digest: string) => void;
	onReject: (txId: string) => void;
}) {
	if (pending.length === 0) return null;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.15 }}
			className="rounded-lg border p-4"
			style={{
				background: 'linear-gradient(135deg, rgba(218, 165, 32, 0.08), rgba(10, 14, 26, 0.9))',
				borderColor: 'rgba(218, 165, 32, 0.5)',
			}}
		>
			<h2 style={{ fontFamily: 'Cinzel, serif', color: '#FFD700' }} className="text-lg font-bold mb-4">
				Awaiting Your Signature ({pending.length})
			</h2>

			<div className="space-y-3">
				{pending.map((tx) => (
					<div
						key={tx.txId}
						className="rounded-lg p-3"
						style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(218, 165, 32, 0.2)' }}
					>
						<div className="flex items-center justify-between mb-2">
							<span className="text-gray-200 font-semibold text-sm capitalize">
								{tx.type.replace(/_/g, ' ')}
							</span>
							<span className="text-gray-400 text-xs">
								{tx.signaturesCollected}/{tx.signaturesRequired} signed
							</span>
						</div>
						<div className="grid grid-cols-3 gap-2 text-xs mb-3">
							<div>
								<span className="text-gray-500">To: </span>
								<span className="text-gray-300">@{tx.recipient}</span>
							</div>
							<div>
								<span className="text-gray-500">Amount: </span>
								<span style={{ color: '#FFD700' }} className="font-semibold">{tx.amount}</span>
							</div>
							<div>
								<span className="text-gray-500">Memo: </span>
								<span className="text-gray-300">{tx.memo || '—'}</span>
							</div>
						</div>
						<div className="flex gap-2">
							<button
								onClick={() => onApprove(tx.txId, tx.digest)}
								className="flex-1 px-3 py-2 text-sm font-bold rounded transition-colors"
								style={{
									background: 'rgba(34, 197, 94, 0.2)',
									color: '#22c55e',
									border: '1px solid rgba(34, 197, 94, 0.5)',
								}}
							>
								Approve & Sign
							</button>
							<button
								onClick={() => onReject(tx.txId)}
								className="px-4 py-2 text-sm font-semibold rounded transition-colors"
								style={{
									background: 'rgba(239, 68, 68, 0.15)',
									color: '#ef4444',
									border: '1px solid rgba(239, 68, 68, 0.4)',
								}}
							>
								Reject
							</button>
						</div>
					</div>
				))}
			</div>
		</motion.div>
	);
}

export default function TreasuryPage() {
	const username = getHiveUsername();
	const [status, setStatus] = useState<TreasuryStatus | null>(null);
	const [signers, setSigners] = useState<Signer[]>([]);
	const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
	const [vouches, setVouches] = useState<WotVouch[]>([]);
	const [pending, setPending] = useState<PendingSigning[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [actionMsg, setActionMsg] = useState<string | null>(null);
	const actionTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

	const showAction = useCallback((msg: string) => {
		setActionMsg(msg);
		if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
		actionTimeoutRef.current = setTimeout(() => setActionMsg(null), 4000);
	}, []);

	const fetchAll = useCallback(async () => {
		const safeJson = async (url: string) => {
			const r = await fetch(url);
			if (!r.ok) throw new Error(`Server unavailable (${r.status})`);
			return r.json();
		};
		try {
			const [statusRes, signersRes, txRes, vouchRes] = await Promise.all([
				safeJson(`${API_BASE}/status`),
				safeJson(`${API_BASE}/signers`),
				safeJson(`${API_BASE}/transactions?limit=20`),
				safeJson(`${API_BASE}/wot/vouches`),
			]);
			setStatus(statusRes);
			setSigners(signersRes);
			setTransactions(txRes);
			setVouches(vouchRes);
			setError(null);
		} catch {
			setError('Treasury requires a running game server. This feature is unavailable on static hosting.');
		}
	}, []);

	const fetchPending = useCallback(async () => {
		if (!username) return;
		try {
			const headers = await authHeaders(username);
			const res = await fetch(`${API_BASE}/pending-signing`, { headers });
			if (res.ok) setPending(await res.json());
		} catch {
			/* pending signing is best-effort */
		}
	}, [username]);

	useEffect(() => {
		fetchAll();
		if (username) fetchPending();
		const interval = setInterval(() => {
			fetchAll();
			if (username) fetchPending();
		}, POLL_INTERVAL);
		return () => clearInterval(interval);
	}, [fetchAll, fetchPending, username]);

	const handleJoin = useCallback(async () => {
		if (!username) return;
		try {
			await apiPost('/join', {}, username);
			showAction('Join request submitted.');
			fetchAll();
		} catch (err) {
			showAction(`Join failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}, [username, showAction, fetchAll]);

	const handleLeave = useCallback(async () => {
		if (!username) return;
		try {
			await apiDelete('/leave', username);
			showAction('Left the treasury.');
			fetchAll();
		} catch (err) {
			showAction(`Leave failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}, [username, showAction, fetchAll]);

	const handleFreeze = useCallback(async () => {
		if (!username) return;
		try {
			await apiPost('/freeze', {}, username);
			showAction('Treasury frozen.');
			fetchAll();
		} catch (err) {
			showAction(`Freeze failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}, [username, showAction, fetchAll]);

	const handleUnfreezeVote = useCallback(async () => {
		if (!username) return;
		try {
			await apiPost('/unfreeze-vote', {}, username);
			showAction('Unfreeze vote cast.');
			fetchAll();
		} catch (err) {
			showAction(`Vote failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}, [username, showAction, fetchAll]);

	const handleVouch = useCallback(async (candidate: string) => {
		if (!username) return;
		try {
			await apiPost('/wot/vouch', { candidate }, username);
			showAction(`Vouched for @${candidate}.`);
			fetchAll();
		} catch (err) {
			showAction(`Vouch failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}, [username, showAction, fetchAll]);

	const handleRevokeVouch = useCallback(async (candidate: string) => {
		if (!username) return;
		try {
			await apiDelete(`/wot/vouch/${candidate}`, username);
			showAction(`Vouch for @${candidate} revoked.`);
			fetchAll();
		} catch (err) {
			showAction(`Revoke failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}, [username, showAction, fetchAll]);

	const handleSignTx = useCallback(async (txId: string, digest?: string) => {
		if (!username || !window.hive_keychain) {
			showAction('Hive Keychain required for signing.');
			return;
		}

		const txDigest = digest || txId;

		try {
			const signature = await new Promise<string>((resolve, reject) => {
				window.hive_keychain!.requestSignBuffer(username, txDigest, 'Active', (response) => {
					if (response.success && response.result) resolve(response.result.id);
					else reject(new Error(response.error || 'Signing cancelled'));
				});
			});

			await apiPost('/submit-signature', { txId, signature }, username);
			showAction('Signature submitted.');
			fetchAll();
			fetchPending();
		} catch (err) {
			showAction(`Signing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}, [username, showAction, fetchAll, fetchPending]);

	const handleRejectTx = useCallback(async (txId: string) => {
		if (!username) return;
		try {
			await apiPost('/reject', { txId }, username);
			showAction('Transaction rejected.');
			fetchPending();
		} catch (err) {
			showAction(`Reject failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}, [username, showAction, fetchPending]);

	const handleVetoTx = useCallback(async (txId: string) => {
		if (!username) return;
		try {
			await apiPost('/veto', { txId }, username);
			showAction('Veto submitted.');
			fetchAll();
		} catch (err) {
			showAction(`Veto failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}, [username, showAction, fetchAll]);

	return (
		<div
			className="min-h-screen w-full"
			style={{ background: 'linear-gradient(180deg, rgba(10, 14, 26, 0.97), rgba(5, 8, 18, 1))' }}
		>
			<div className="max-w-6xl mx-auto px-4 py-8">
				<div className="flex items-center justify-between mb-8">
					<h1
						style={{ fontFamily: 'Cinzel, serif', color: '#DAA520' }}
						className="text-3xl font-bold tracking-wide"
					>
						Treasury
					</h1>
					<Link
						to={routes.home}
						className="px-4 py-2 text-sm font-semibold rounded transition-colors"
						style={{
							background: 'rgba(255,255,255,0.05)',
							color: '#DAA520',
							border: '1px solid rgba(218, 165, 32, 0.3)',
						}}
					>
						Back to Home
					</Link>
				</div>

				<AnimatePresence>
					{actionMsg && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="mb-4 px-4 py-2 rounded text-sm font-semibold"
							style={{
								background: 'rgba(218, 165, 32, 0.15)',
								color: '#DAA520',
								border: '1px solid rgba(218, 165, 32, 0.3)',
							}}
						>
							{actionMsg}
						</motion.div>
					)}
				</AnimatePresence>

				{error && (
					<div
						className="mb-4 px-4 py-2 rounded text-sm"
						style={{
							background: 'rgba(239, 68, 68, 0.15)',
							color: '#ef4444',
							border: '1px solid rgba(239, 68, 68, 0.3)',
						}}
					>
						{error}
					</div>
				)}

				<div className="space-y-6">
					<StatusBanner status={status} />

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<div className="lg:col-span-1">
							<AuthorityRing status={status} signers={signers} />
						</div>
						<div className="lg:col-span-2 space-y-6">
							{username && pending.length > 0 && (
								<PendingSigningPanel
									pending={pending}
									username={username}
									onApprove={handleSignTx}
									onReject={handleRejectTx}
								/>
							)}
							<JoinLeaveActions
								signers={signers}
								currentUser={username}
								onJoin={handleJoin}
								onLeave={handleLeave}
							/>
						</div>
					</div>

					<SignersTable
						signers={signers}
						currentUser={username}
						onLeave={handleLeave}
					/>

					<WebOfTrust
						vouches={vouches}
						currentUser={username}
						signers={signers}
						onVouch={handleVouch}
						onRevoke={handleRevokeVouch}
					/>

					<RecentTransactions
						transactions={transactions}
						currentUser={username}
						signers={signers}
						onSign={(txId) => handleSignTx(txId)}
						onVeto={handleVetoTx}
					/>

					<EmergencyControls
						status={status}
						currentUser={username}
						signers={signers}
						onFreeze={handleFreeze}
						onUnfreezeVote={handleUnfreezeVote}
					/>
				</div>
			</div>
		</div>
	);
}
