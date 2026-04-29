/**
 * HiveKeychainLogin.tsx
 *
 * Compact wallet connect widget for Hive Keychain integration.
 * Placed in the top-right corner of the homepage.
 *
 * States:
 *   disconnected → expands to username input → Keychain signs a buffer to verify ownership
 *   connected     → shows @username pill + Logout button
 *
 * On connect: calls HiveAuth login, sets HiveDataLayer user, starts chain replay sync.
 * On logout: stops sync, clears HiveDataLayer state.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHiveDataStore } from '../../data/HiveDataLayer';
import {
	clearActiveHiveSession,
	getDefaultHiveWalletProviderId,
	isHiveWalletAvailable,
	loginWithHiveWallet,
	setActiveHiveSession,
} from '../../data/HiveAuth';
import { getNFTBridge } from '../nft';
import { ensureBridgeRuntime } from '../runtime/bridgeRuntime';
import { Button } from '../../components/ui-norse';

type ConnectStatus = 'idle' | 'connecting' | 'error';

export function HiveKeychainLogin() {
	const user = useHiveDataStore((s) => s.user);
	const setUser = useHiveDataStore((s) => s.setUser);
	const logout = useHiveDataStore((s) => s.logout);

	const [isExpanded, setIsExpanded] = useState(false);
	const [username, setUsername] = useState('');
	const [status, setStatus] = useState<ConnectStatus>('idle');
	const [errorMsg, setErrorMsg] = useState('');

	const keychainAvailable = isHiveWalletAvailable();

	// Re-connect on mount if user was previously logged in
	useEffect(() => {
		let cancelled = false;

		if (user) {
			setActiveHiveSession(user.hiveUsername, getDefaultHiveWalletProviderId());
			void ensureBridgeRuntime().then(() => {
				if (!cancelled) {
					getNFTBridge().startSync(user.hiveUsername);
				}
			});
		}

		return () => {
			cancelled = true;
			getNFTBridge().stopSync();
		};
	}, [user]);

	const handleConnect = async () => {
		const trimmed = username.trim().toLowerCase().replace(/^@/, '');
		if (!trimmed) return;

		setStatus('connecting');
		setErrorMsg('');

		if (!keychainAvailable) {
			setStatus('error');
			setErrorMsg('Hive Keychain not found. Please install the extension.');
			return;
		}

		const result = await loginWithHiveWallet(trimmed);

		if (!result.success) {
			setStatus('error');
			setErrorMsg(result.error ?? 'Login cancelled or failed.');
			return;
		}

		setUser({
			hiveUsername: trimmed,
			displayName: trimmed,
			createdAt: Date.now(),
			lastLogin: Date.now(),
			accountTier: 'free',
		});
		setStatus('idle');
		setIsExpanded(false);
		setUsername('');
	};

	const handleLogout = () => {
		getNFTBridge().stopSync();
		clearActiveHiveSession();
		logout();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') handleConnect();
		if (e.key === 'Escape') setIsExpanded(false);
	};

	// --- Connected state ---
	if (user) {
		return (
			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-linear-to-br from-gold-400 to-gold-700 border border-gold-300/60 flex items-center justify-center font-display text-sm font-bold text-obsidian-950 uppercase shrink-0">
						{user.hiveUsername.slice(0, 2)}
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5">
							<div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)] shrink-0" />
							<span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-300">Online</span>
						</div>
						<div className="text-ink-0 font-semibold text-sm truncate">@{user.hiveUsername}</div>
					</div>
				</div>
				<button
					onClick={handleLogout}
					className="self-start font-mono text-[10px] tracking-[0.18em] uppercase text-ink-300 hover:text-blood-300 transition-colors"
					title="Disconnect wallet"
				>
					Disconnect
				</button>
			</div>
		);
	}

	// --- Disconnected state ---
	return (
		<div className="flex flex-col gap-3">
			<p className="text-ink-200 text-xs leading-[1.6]">
				Sign with Hive Keychain to persist progress, claim NFT cards, and join Warbands.
			</p>
			<Button
				variant="outline"
				size="default"
				onClick={() => { setIsExpanded(!isExpanded); setStatus('idle'); setErrorMsg(''); }}
				className="w-full"
			>
				⛓ Connect Hive
			</Button>

			<AnimatePresence>
				{isExpanded && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.18 }}
						className="overflow-hidden"
					>
						{!keychainAvailable ? (
							<div className="rounded-lg border border-obsidian-700 bg-obsidian-900/60 p-3">
								<p className="text-gold-300 text-xs font-semibold mb-1">Keychain Not Found</p>
								<p className="text-ink-300 text-xs mb-2">
									Install the Hive Keychain browser extension to connect.
								</p>
								<a
									href="https://hive-keychain.com"
									target="_blank"
									rel="noreferrer"
									className="text-gold-300 hover:text-gold-200 text-xs underline"
								>
									Get Hive Keychain →
								</a>
							</div>
						) : (
							<div className="rounded-lg border border-obsidian-700 bg-obsidian-900/60 p-3">
								<p className="text-ink-300 text-[11px] mb-2 leading-relaxed">
									Keychain will ask you to sign a login message — no transaction is posted.
								</p>
								<div className="flex gap-2">
									<input
										type="text"
										placeholder="@username"
										value={username}
										onChange={(e) => { setUsername(e.target.value); setStatus('idle'); setErrorMsg(''); }}
										onKeyDown={handleKeyDown}
										autoFocus
										spellCheck={false}
										autoCapitalize="none"
										className="flex-1 min-w-0 px-3 py-1.5 bg-obsidian-950 border border-obsidian-600/60 rounded-md text-ink-0 text-sm placeholder-ink-400 focus:outline-hidden focus:border-gold-500/60"
									/>
									<Button
										variant="primary"
										size="sm"
										onClick={handleConnect}
										disabled={status === 'connecting' || !username.trim()}
									>
										{status === 'connecting' ? (
											<motion.span
												animate={{ opacity: [1, 0.4, 1] }}
												transition={{ duration: 0.8, repeat: Infinity }}
											>
												···
											</motion.span>
										) : 'Sign'}
									</Button>
								</div>
								{errorMsg && (
									<motion.p
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										className="text-blood-300 text-xs mt-2"
									>
										{errorMsg}
									</motion.p>
								)}
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

export default HiveKeychainLogin;
