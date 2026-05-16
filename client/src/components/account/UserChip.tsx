/**
 * UserChip — global player identity element.
 *
 * Mirrors the "summoner profile" pattern from LoL/LoR: hex-framed avatar,
 * display name + optional metadata (balance, level), used consistently
 * across page headers (marketplace, vault, ladder, etc).
 *
 * Variants:
 *   - compact: avatar + name only — fits a sticky header
 *   - full:    avatar + name + secondary line (balance / role / status)
 *
 * The avatar is a hex-frame containing the first letter of the username,
 * tinted by tier (default gold). Real player portraits can be plugged in
 * later by passing `portraitUrl` — the hex frame stays.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import type { Tier } from '../ornaments/RunicSigils';

interface UserChipProps {
	username: string;
	/** Hex frame tier — defaults to gold (premium). */
	tier?: Tier;
	/** Optional secondary line below the username (e.g. balance, level, role). */
	secondary?: React.ReactNode;
	/** Optional portrait URL — when omitted, falls back to first letter glyph. */
	portraitUrl?: string;
	/** If provided, the chip becomes a Link to this route. */
	to?: string;
	/** Compact removes the secondary line — useful for tight headers. */
	compact?: boolean;
}

export function UserChip({
	username,
	tier = 'premium',
	secondary,
	portraitUrl,
	to,
	compact = false,
}: UserChipProps) {
	const initial = username.trim().charAt(0).toUpperCase() || '?';
	const hexVariant =
		tier === 'mythic' ? 'hex-frame--ember'
		: tier === 'standard' ? 'hex-frame--bifrost'
		: tier === 'obsidian' ? 'hex-frame--obsidian'
		: 'hex-frame--gold';

	const inner = (
		<>
			<div
				className={`hex-frame ${hexVariant} hex-frame--xs shrink-0`}
				aria-hidden="true"
			>
				<div className="hex-frame-inner overflow-hidden">
					{portraitUrl ? (
						<img
							src={portraitUrl}
							alt=""
							className="w-full h-full object-cover"
							loading="lazy"
						/>
					) : (
						<span className="font-display text-sm font-bold text-gold-200 select-none">
							{initial}
						</span>
					)}
				</div>
			</div>

			<div className="min-w-0 flex flex-col leading-tight">
				<span className="font-display text-xs font-bold tracking-[0.10em] uppercase text-ink-0 truncate">
					{username}
				</span>
				{!compact && secondary && (
					<span className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-300 truncate">
						{secondary}
					</span>
				)}
			</div>
		</>
	);

	const className =
		'inline-flex items-center gap-2 px-2 py-1 rounded-full border border-obsidian-700 bg-obsidian-900/70 hover:border-gold-600/50 hover:bg-obsidian-850 transition-colors max-w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300';

	if (to) {
		return (
			<Link to={to} className={className} aria-label={`Open profile · ${username}`}>
				{inner}
			</Link>
		);
	}

	return (
		<div className={className} aria-label={`Signed in as ${username}`}>
			{inner}
		</div>
	);
}
