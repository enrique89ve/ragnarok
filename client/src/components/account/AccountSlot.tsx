/**
 * AccountSlot — nav-bar identity slot.
 *
 * Renders the player's account menu when signed in, or a "Login" pill that
 * routes to `/settings` (where the HiveKeychainLogin widget lives) when
 * the slot is empty. The signed-in chip shows only Hive avatar + username
 * and exposes Change account, Settings, and Sign out. Replaces the bare
 * `{username && <UserChip />}`
 * pattern that previously left a hole in every page header for guests.
 *
 * The `guest` username (server's anonymous fallback) is treated as
 * signed-out so the slot never advertises a fake identity.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { routes } from '../../lib/routes';
import { UserChip } from './UserChip';
import type { Tier } from '../ornaments/RunicSigils';

interface AccountSlotProps {
	username: string | null | undefined;
	tier?: Tier;
	secondary?: React.ReactNode;
	portraitUrl?: string;
	to?: string;
	compact?: boolean;
	onLogin?: () => void;
	onSwitchAccount?: () => void;
}

function isSignedIn(username: string | null | undefined): username is string {
	return Boolean(username) && username !== 'guest';
}

export function AccountSlot({
	username,
	tier,
	secondary,
	portraitUrl,
	to = routes.wallet,
	compact,
	onLogin,
	onSwitchAccount,
}: AccountSlotProps) {
	if (isSignedIn(username)) {
		return (
			<UserChip
				username={username}
				tier={tier}
				secondary={secondary}
				portraitUrl={portraitUrl}
				to={to}
				compact={compact}
				onSwitchAccount={onSwitchAccount}
			/>
		);
	}

	if (onLogin) {
		return (
			<button
				type="button"
				onClick={onLogin}
				aria-label="Login"
				className="inline-flex h-8 items-center rounded-full border border-gold-600/50 bg-obsidian-850 px-3 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300 transition-colors hover:border-gold-500 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
			>
				Login
			</button>
		);
	}

	return (
		<Link
			to={routes.settings}
			aria-label="Login"
			className="inline-flex h-8 items-center rounded-full border border-gold-600/50 bg-obsidian-850 px-3 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300 transition-colors hover:border-gold-500 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
		>
			Login
		</Link>
	);
}
