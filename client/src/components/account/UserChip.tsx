/**
 * UserChip — global player identity element.
 *
 * Shows the same Hive avatar + username treatment everywhere account identity
 * appears. Clicking it opens account actions.
 */

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { LayoutGrid, LogOut, WalletCards } from 'lucide-react';
import { clearActiveHiveSession } from '@/data/HiveAuth';
import { useHiveDataStore } from '@/data/HiveDataLayer';
import { routes } from '@/lib/routes';
import type { Tier } from '../ornaments/RunicSigils';

interface UserChipProps {
	username: string;
	/** Hex frame tier — defaults to gold (premium). */
	tier?: Tier;
	/** Kept for callsite compatibility; account display is avatar + username only. */
	secondary?: React.ReactNode;
	/** Optional portrait URL — when omitted, uses the canonical Hive avatar URL. */
	portraitUrl?: string;
	/** Wallet destination. The chip itself opens the account menu. */
	to?: string;
	/** Compact removes the secondary line — useful for tight headers. */
	compact?: boolean;
}

const MENU_WIDTH = 196;
const MENU_HEIGHT_ESTIMATE = 148;

function normalizeHiveUsername(username: string): string {
	return username.trim().toLowerCase().replace(/^@/, '');
}

function getHiveAvatarUrl(username: string): string {
	return `https://images.hive.blog/u/${encodeURIComponent(normalizeHiveUsername(username))}/avatar`;
}

function getMenuPosition(anchor: HTMLElement): React.CSSProperties {
	const rect = anchor.getBoundingClientRect();
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;
	const left = Math.min(
		viewportWidth - MENU_WIDTH - 12,
		Math.max(12, rect.right - MENU_WIDTH),
	);
	const preferredTop = rect.bottom + 8;
	const top = preferredTop + MENU_HEIGHT_ESTIMATE > viewportHeight
		? Math.max(12, rect.top - MENU_HEIGHT_ESTIMATE - 8)
		: preferredTop;

	return {
		position: 'fixed',
		left,
		top,
		width: MENU_WIDTH,
		zIndex: 10000,
	};
}

async function stopHiveBridgeSync(): Promise<void> {
	const { getNFTBridge } = await import('@/game/nft');
	getNFTBridge().stopSync();
}

export function UserChip({
	username,
	tier = 'premium',
	portraitUrl,
	to,
	compact = false,
}: UserChipProps) {
	const [open, setOpen] = useState(false);
	const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);
	const menuId = useId();
	const normalizedUsername = normalizeHiveUsername(username);
	const displayUsername = `@${normalizedUsername || username.trim()}`;
	const avatarUrl = portraitUrl ?? getHiveAvatarUrl(username);
	const walletTo = to ?? routes.wallet;
	const tierClass =
		tier === 'mythic' ? 'account-menu-trigger--mythic'
		: tier === 'standard' ? 'account-menu-trigger--standard'
		: tier === 'obsidian' ? 'account-menu-trigger--obsidian'
		: 'account-menu-trigger--premium';

	useEffect(() => {
		if (!open) return undefined;

		const updatePosition = () => {
			if (!buttonRef.current) return;
			setMenuStyle(getMenuPosition(buttonRef.current));
		};

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			if (!target) return;
			if (buttonRef.current?.contains(target)) return;
			if (menuRef.current?.contains(target)) return;
			setOpen(false);
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setOpen(false);
		};

		updatePosition();
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);
		document.addEventListener('pointerdown', handlePointerDown);
		document.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
			document.removeEventListener('pointerdown', handlePointerDown);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [open]);

	const disconnect = () => {
		setOpen(false);
		void stopHiveBridgeSync();
		clearActiveHiveSession();
		useHiveDataStore.getState().logout();
	};

	const menu = open && menuStyle && typeof document !== 'undefined'
		? createPortal(
			<div
				ref={menuRef}
				id={menuId}
				role="menu"
				aria-label={`Account actions for ${displayUsername}`}
				className="account-menu-panel border border-gold-300/25 bg-obsidian-950/96 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl"
				style={menuStyle}
			>
				<Link
					to={walletTo}
					role="menuitem"
					onClick={() => setOpen(false)}
					className="account-menu-item"
				>
					<WalletCards className="h-4 w-4" aria-hidden="true" />
					<span>My Wallet</span>
				</Link>
				<Link
					to={routes.collection}
					role="menuitem"
					onClick={() => setOpen(false)}
					className="account-menu-item"
				>
					<LayoutGrid className="h-4 w-4" aria-hidden="true" />
					<span>My Collection</span>
				</Link>
				<button
					type="button"
					role="menuitem"
					onClick={disconnect}
					className="account-menu-item account-menu-item--danger"
				>
					<LogOut className="h-4 w-4" aria-hidden="true" />
					<span>Disconnect</span>
				</button>
			</div>,
			document.body,
		)
		: null;

	return (
		<div className="account-menu-root inline-flex max-w-full">
			<button
				ref={buttonRef}
				type="button"
				className={`account-menu-trigger ${tierClass} ${compact ? 'account-menu-trigger--compact' : ''}`}
				aria-label={`Open account menu for ${displayUsername}`}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? menuId : undefined}
				onClick={() => setOpen(current => !current)}
			>
				<span
					className="account-menu-avatar"
					style={{ backgroundImage: `url("${avatarUrl}")` }}
					aria-hidden="true"
				/>
				<span className="account-menu-username truncate">{displayUsername}</span>
			</button>
			{menu}
		</div>
	);
}
