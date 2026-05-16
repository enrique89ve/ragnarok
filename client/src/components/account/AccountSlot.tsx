/**
 * AccountSlot — nav-bar identity slot.
 *
 * Renders the player's UserChip when signed in, or a "Login" pill that
 * routes to `/settings` (where the HiveKeychainLogin widget lives) when
 * the slot is empty. The signed-in chip defaults to Wallet so shared
 * headers do not double as Settings entry points. Replaces the bare
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
			/>
		);
	}

	return (
		<Link
			to={routes.settings}
			aria-label="Sign in with Hive Keychain"
			className="inline-flex items-center h-8 px-3 rounded-full border border-gold-600/50 bg-obsidian-850 text-gold-300 hover:text-gold-200 hover:border-gold-500 font-display text-[11px] tracking-[0.18em] uppercase font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
		>
			Login
		</Link>
	);
}
