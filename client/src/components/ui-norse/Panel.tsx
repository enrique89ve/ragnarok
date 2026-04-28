import * as React from 'react';
import { cn } from '@/lib/utils';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

const PANEL_BASE =
	'rounded-xl border border-[var(--obsidian-700)] ' +
	'bg-linear-to-b from-[var(--obsidian-850)] to-[var(--obsidian-900)] ' +
	'text-[var(--ink-0)] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)]';

export const Panel = React.forwardRef<HTMLDivElement, DivProps>(({ className, ...props }, ref) => (
	<div ref={ref} className={cn(PANEL_BASE, className)} {...props} />
));
Panel.displayName = 'Panel';

export const PanelHeader = React.forwardRef<HTMLDivElement, DivProps>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				'flex flex-col gap-1.5 border-b border-[var(--obsidian-700)] p-6',
				className,
			)}
			{...props}
		/>
	),
);
PanelHeader.displayName = 'PanelHeader';

export const PanelTitle = React.forwardRef<HTMLDivElement, DivProps>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				"font-['Cinzel',serif] text-lg font-semibold tracking-wide text-[var(--ink-0)]",
				className,
			)}
			{...props}
		/>
	),
);
PanelTitle.displayName = 'PanelTitle';

export const PanelDescription = React.forwardRef<HTMLDivElement, DivProps>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn('text-sm leading-relaxed text-[var(--ink-200)]', className)}
			{...props}
		/>
	),
);
PanelDescription.displayName = 'PanelDescription';

export const PanelContent = React.forwardRef<HTMLDivElement, DivProps>(
	({ className, ...props }, ref) => (
		<div ref={ref} className={cn('p-6', className)} {...props} />
	),
);
PanelContent.displayName = 'PanelContent';

export const PanelFooter = React.forwardRef<HTMLDivElement, DivProps>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				'flex items-center border-t border-[var(--obsidian-700)] p-6',
				className,
			)}
			{...props}
		/>
	),
);
PanelFooter.displayName = 'PanelFooter';
