import * as React from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Home, type LucideIcon } from 'lucide-react';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { AccountSlot } from '@/components/account/AccountSlot';
import type { Tier } from '@/components/ornaments/RunicSigils';

type MetaPageHeaderTone = 'default' | 'danger' | 'gold';
type IconPosition = 'start' | 'end';

const CONTROL_BASE =
	'meta-page-header-control inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-full px-3 ' +
	'font-display text-[11px] font-bold uppercase tracking-[0.18em] transition-colors ' +
	'focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300 focus-visible:outline-offset-2 ' +
	'disabled:pointer-events-none disabled:opacity-50';

const CONTROL_TONE_CLASSES: Record<MetaPageHeaderTone, string> = {
	default:
		'border border-obsidian-700 bg-obsidian-850 text-ink-200 hover:border-gold-600 hover:text-gold-300',
	danger:
		'border border-ember-500/35 bg-obsidian-850 text-ember-300 hover:border-ember-400/60 hover:text-ember-200',
	gold:
		'border border-gold-600/55 bg-obsidian-850 text-gold-300 hover:border-gold-500 hover:text-gold-200',
};

interface MetaPageHeaderProps {
	title: string;
	kicker: string;
	username?: string | null;
	accountSecondary?: React.ReactNode;
	accountTier?: Tier;
	accountTo?: string;
	actions?: React.ReactNode;
	showAccount?: boolean;
	className?: string;
	containerClassName?: string;
}

interface HeaderIconProps {
	icon?: LucideIcon;
	iconPosition?: IconPosition;
}

interface MetaPageHeaderLinkProps extends LinkProps, HeaderIconProps {
	tone?: MetaPageHeaderTone;
}

interface MetaPageHeaderButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		HeaderIconProps {
	tone?: MetaPageHeaderTone;
}

function HeaderIcon({ icon: Icon }: { icon?: LucideIcon }) {
	if (!Icon) return null;
	return <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} aria-hidden="true" />;
}

export function MetaPageHeaderLink({
	children,
	className,
	icon,
	iconPosition = 'start',
	tone = 'default',
	...props
}: MetaPageHeaderLinkProps) {
	return (
		<Link
			className={cn(CONTROL_BASE, CONTROL_TONE_CLASSES[tone], className)}
			{...props}
		>
			{iconPosition === 'start' && <HeaderIcon icon={icon} />}
			<span className="meta-page-header-control-label">{children}</span>
			{iconPosition === 'end' && <HeaderIcon icon={icon} />}
		</Link>
	);
}

export function MetaPageHeaderButton({
	children,
	className,
	icon,
	iconPosition = 'start',
	tone = 'default',
	type = 'button',
	...props
}: MetaPageHeaderButtonProps) {
	return (
		<button
			type={type}
			className={cn(CONTROL_BASE, CONTROL_TONE_CLASSES[tone], className)}
			{...props}
		>
			{iconPosition === 'start' && <HeaderIcon icon={icon} />}
			<span className="meta-page-header-control-label">{children}</span>
			{iconPosition === 'end' && <HeaderIcon icon={icon} />}
		</button>
	);
}

export function MetaPageHeader({
	title,
	kicker,
	username,
	accountSecondary,
	accountTier = 'premium',
	accountTo = routes.wallet,
	actions,
	showAccount = true,
	className,
	containerClassName,
}: MetaPageHeaderProps) {
	return (
		<header className={cn('meta-page-header sticky top-0 z-40 border-b border-obsidian-700 bg-obsidian-950/85 backdrop-blur-md', className)}>
			<div
				className={cn(
					'meta-page-header-inner mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8',
					containerClassName,
				)}
			>
				<div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
					<MetaPageHeaderLink to={routes.home} icon={Home} aria-label="Return to home">
						Home
					</MetaPageHeaderLink>
					<div className="min-w-0">
						<p className="meta-page-header-kicker truncate font-mono text-[10px] uppercase tracking-[0.32em] text-ink-300">
							{kicker}
						</p>
						<h1 className="meta-page-header-title truncate font-display text-xl font-black uppercase tracking-[0.10em] text-gold-300">
							{title}
						</h1>
					</div>
				</div>

				<div className="meta-page-header-actions flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
					{actions}
					{showAccount && (
						<div className="meta-page-header-account shrink-0">
							<AccountSlot
								username={username}
								tier={accountTier}
								to={accountTo}
								secondary={accountSecondary}
							/>
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
