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
 * On connect: calls hiveSync.login(), sets HiveDataLayer user, starts chain replay sync.
 * On logout: stops sync, clears HiveDataLayer state.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHiveDataStore } from '../../data/HiveDataLayer';
import { hiveSync } from '../../data/HiveSync';
import { getNFTBridge } from '../nft';
import { ensureBridgeRuntime } from '../runtime/bridgeRuntime';

type ConnectStatus = 'idle' | 'connecting' | 'error';

export function HiveKeychainLogin() {
	const user = useHiveDataStore((s) => s.user);
	const setUser = useHiveDataStore((s) => s.setUser);
	const logout = useHiveDataStore((s) => s.logout);

	const [isExpanded, setIsExpanded] = useState(false);
	const [username, setUsername] = useState('');
	const [status, setStatus] = useState<ConnectStatus>('idle');
	const [errorMsg, setErrorMsg] = useState('');

	const keychainAvailable = hiveSync.isKeychainAvailable();

	// Re-connect on mount if user was previously logged in
	useEffect(() => {
		let cancelled = false;

		if (user) {
			hiveSync.setUsername(user.hiveUsername);
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

		const result = await hiveSync.login(trimmed);

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
		logout();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') handleConnect();
		if (e.key === 'Escape') setIsExpanded(false);
	};

	// --- Connected state ---
	if (user) {
		return (
			<div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/80 rounded-lg border border-gray-700/60 text-sm backdrop-blur-sm">
				<div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
				<span className="text-white font-medium">@{user.hiveUsername}</span>
				<button
					onClick={handleLogout}
					className="text-gray-500 hover:text-red-400 transition-colors text-xs ml-1"
					title="Disconnect wallet"
				>
					Disconnect
				</button>
			</div>
		);
	}

	// --- Disconnected state ---
	return (
		<div className="flex flex-col items-end gap-2">
			<motion.button
				whileHover={{ scale: 1.03 }}
				whileTap={{ scale: 0.97 }}
				onClick={() => { setIsExpanded(!isExpanded); setStatus('idle'); setErrorMsg(''); }}
				className="px-3 py-1.5 bg-amber-800/70 hover:bg-amber-700/70 text-amber-200 rounded-lg border border-amber-600/50 text-sm font-medium transition-colors flex items-center gap-1.5 backdrop-blur-sm"
			>
				<span className="text-base">⛓</span>
				Connect Hive Wallet
			</motion.button>

			<AnimatePresence>
				{isExpanded && (
					<motion.div
						initial={{ opacity: 0, y: -6, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -6, scale: 0.96 }}
						transition={{ duration: 0.15 }}
						className="bg-gray-950/95 border border-gray-700/70 rounded-xl p-4 w-64 shadow-2xl backdrop-blur-sm"
					>
						{!keychainAvailable ? (
							<div className="text-center">
								<p className="text-amber-400 text-sm font-semibold mb-1">Keychain Not Found</p>
								<p className="text-gray-400 text-xs mb-3">
									Install the Hive Keychain browser extension to connect.
								</p>
								<a
									href="https://hive-keychain.com"
									target="_blank"
									rel="noreferrer"
									className="text-amber-400 hover:text-amber-300 text-sm underline"
								>
									Get Hive Keychain →
								</a>
							</div>
						) : (
							<>
								<p className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">
									Connect Hive Wallet
								</p>
								<p className="text-gray-500 text-xs mb-3">
									Keychain will ask you to sign a login message — no transaction is posted.
								</p>
								<div className="flex gap-2 mb-2">
									<input
										type="text"
										placeholder="@username"
										value={username}
										onChange={(e) => { setUsername(e.target.value); setStatus('idle'); setErrorMsg(''); }}
										onKeyDown={handleKeyDown}
										autoFocus
										spellCheck={false}
										autoCapitalize="none"
										className="flex-1 min-w-0 px-3 py-1.5 bg-gray-800/80 border border-gray-600/60 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/60"
									/>
									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										onClick={handleConnect}
										disabled={status === 'connecting' || !username.trim()}
										className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
									>
										{status === 'connecting' ? (
											<motion.span
												animate={{ opacity: [1, 0.4, 1] }}
												transition={{ duration: 0.8, repeat: Infinity }}
											>
												···
											</motion.span>
										) : 'Connect'}
									</motion.button>
								</div>
								{errorMsg && (
									<motion.p
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										className="text-red-400 text-xs mt-1"
									>
										{errorMsg}
									</motion.p>
								)}
							</>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

export default HiveKeychainLogin;
