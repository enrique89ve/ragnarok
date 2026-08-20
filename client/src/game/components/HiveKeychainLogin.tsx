/**
 * HiveKeychainLogin.tsx
 *
 * Hive Keychain login: username + Sign. No extra expand step.
 */

import React, { useEffect, useState } from 'react';
import { useHiveDataStore } from '../../data/HiveDataLayer';
import {
	clearActiveHiveSession,
	getAuthenticatedHiveUsername,
	isHiveWalletAvailable,
	loginWithHiveWallet,
} from '../../data/HiveAuth';
import { getNFTBridge } from '../nft';
import { Button } from '../../components/ui-norse';
import { ensureBridgeRuntime } from '../runtime/bridgeRuntime';

type ConnectStatus = 'idle' | 'connecting' | 'error';

interface HiveKeychainLoginProps {
	/** Kept for callers; the form is always visible when signed out. */
	initiallyExpanded?: boolean;
	onConnected?: () => void;
}

function normalizeHiveUsername(username: string | null | undefined): string | null {
	const normalized = username?.trim().toLowerCase().replace(/^@/, '') ?? '';
	return normalized.length > 0 ? normalized : null;
}

async function loadHiveBridgeRuntime() {
	await ensureBridgeRuntime();
	return getNFTBridge();
}

async function stopHiveBridgeSync(): Promise<void> {
	getNFTBridge().stopSync();
}

export function HiveKeychainLogin({ onConnected }: HiveKeychainLoginProps = {}) {
	const user = useHiveDataStore((s) => s.user);
	const setUser = useHiveDataStore((s) => s.setUser);
	const logout = useHiveDataStore((s) => s.logout);

	const [username, setUsername] = useState('');
	const [status, setStatus] = useState<ConnectStatus>('idle');
	const [errorMsg, setErrorMsg] = useState('');

	const keychainAvailable = isHiveWalletAvailable();
	const authenticatedUsername = getAuthenticatedHiveUsername();
	const userAccountId = normalizeHiveUsername(user?.hiveUsername);
	const userAuthenticated = Boolean(userAccountId && authenticatedUsername === userAccountId);

	useEffect(() => {
		let cancelled = false;

		if (user) {
			void loadHiveBridgeRuntime().then((bridge) => {
				if (!cancelled) {
					bridge.startSync(user.hiveUsername);
				}
			});
		}

		return () => {
			cancelled = true;
			void stopHiveBridgeSync();
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
		setUsername('');
		onConnected?.();
	};

	const handleReconnectStoredUser = async () => {
		if (!user) return;

		setStatus('connecting');
		setErrorMsg('');

		if (!keychainAvailable) {
			setStatus('error');
			setErrorMsg('Hive Keychain not found. Please install the extension.');
			return;
		}

		const result = await loginWithHiveWallet(user.hiveUsername);

		if (!result.success) {
			setStatus('error');
			setErrorMsg(result.error ?? 'Login cancelled or failed.');
			return;
		}

		setUser({
			...user,
			lastLogin: Date.now(),
		});
		setStatus('idle');
		onConnected?.();
	};

	const handleLogout = () => {
		void stopHiveBridgeSync();
		clearActiveHiveSession();
		logout();
	};

	if (user) {
		return (
			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-300/60 bg-linear-to-br from-gold-400 to-gold-700 font-display text-sm font-bold uppercase text-obsidian-950">
						{user.hiveUsername.slice(0, 2)}
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5">
							<div className={`h-1.5 w-1.5 shrink-0 rounded-full ${
								userAuthenticated
									? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]'
									: 'bg-gold-300 shadow-[0_0_6px_rgba(250,204,21,0.45)]'
							}`} />
							<span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">
								{userAuthenticated ? 'Online' : 'Signature required'}
							</span>
						</div>
						<div className="truncate text-sm font-semibold text-ink-0">@{user.hiveUsername}</div>
					</div>
				</div>
				{!userAuthenticated && (
					<>
						<Button
							variant="primary"
							size="sm"
							onClick={handleReconnectStoredUser}
							disabled={status === 'connecting'}
							className="hover:brightness-110 focus-visible:outline disabled:opacity-50"
						>
							{status === 'connecting' ? 'Signing...' : 'Sign'}
						</Button>
						{errorMsg && (
							<p className="text-xs leading-relaxed text-blood-300">
								{errorMsg}
							</p>
						)}
					</>
				)}
				<div className="flex flex-wrap gap-x-4 gap-y-1">
					<button
						type="button"
						onClick={handleLogout}
						className="self-start font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300 transition-colors hover:text-gold-300"
					>
						Change account
					</button>
					<button
						type="button"
						onClick={handleLogout}
						className="self-start font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300 transition-colors hover:text-blood-300"
					>
						Sign out
					</button>
				</div>
			</div>
		);
	}

	if (!keychainAvailable) {
		return (
			<div className="rounded-md border border-obsidian-700 bg-obsidian-950/60 p-3">
				<p className="mb-1 text-xs font-semibold text-gold-300">Keychain not found</p>
				<p className="mb-2 text-xs text-ink-300">
					Install the Hive Keychain browser extension to log in.
				</p>
				<a
					href="https://hive-keychain.com"
					target="_blank"
					rel="noreferrer"
					className="text-xs text-gold-300 underline hover:text-gold-200"
				>
					Get Hive Keychain
				</a>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<label htmlFor="hive-login-username" className="text-xs leading-relaxed text-ink-200">
				Hive username. Keychain will sign a login message — no transaction is posted.
			</label>
			<div className="flex gap-2">
				<input
					id="hive-login-username"
					aria-label="Hive username"
					className="min-h-11 min-w-0 flex-1 rounded-md border border-obsidian-600/60 bg-obsidian-950 px-3 text-sm text-ink-0 placeholder-ink-400 hover:border-gold-500/40 focus-visible:outline"
					type="text"
					placeholder="@username"
					value={username}
					autoFocus
					spellCheck={false}
					autoCapitalize="none"
					autoComplete="username"
					onChange={(event) => {
						setUsername(event.target.value);
						setStatus('idle');
						setErrorMsg('');
					}}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							void handleConnect();
						}
					}}
				/>
				<Button
					variant="primary"
					type="button"
					disabled={status === 'connecting' || !username.trim()}
					className="hover:brightness-110 focus-visible:outline disabled:opacity-50"
					onClick={() => { void handleConnect(); }}
				>
					{status === 'connecting' ? 'Signing…' : 'Sign'}
				</Button>
			</div>
			{errorMsg ? (
				<p className="text-xs text-blood-300" role="alert">
					{errorMsg}
				</p>
			) : null}
		</div>
	);
}

export default HiveKeychainLogin;
