import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'primary' | 'outline' | 'destructive' | 'ghost';
type Size = 'default' | 'sm' | 'lg' | 'icon';

const VARIANT_CLASSES: Record<Variant, string> = {
	default:
		'bg-obsidian-750 text-ink-0 border border-obsidian-600 ' +
		'hover:bg-obsidian-700 hover:border-gold-600',
	primary:
		'bg-linear-to-b from-gold-300 to-gold-500 text-obsidian-950 ' +
		'border border-gold-200 hover:from-gold-200 hover:to-gold-400 ' +
		'shadow-[0_0_18px_-6px_rgba(217,168,68,0.55)]',
	// VIEW LORE / DOWNLOAD SAGA reference: gold-bordered ceremonial button.
	// Dark obsidian fill, gold border at 55% (90% on hover), inner gold glow.
	// Pair with `ornate` prop to add diamond bullets like DOWNLOAD SAGA.
	outline:
		'bg-obsidian-900/70 text-gold-300 ' +
		'border border-gold-300/55 ' +
		'shadow-[inset_0_0_14px_-6px_rgba(217,168,68,0.30)] ' +
		'hover:bg-obsidian-800/80 hover:border-gold-300/90 ' +
		'hover:shadow-[inset_0_0_18px_-4px_rgba(217,168,68,0.50)]',
	destructive:
		'bg-blood-500 text-ink-0 border border-blood-300 ' +
		'hover:bg-blood-300 hover:text-obsidian-950',
	ghost:
		'bg-transparent text-ink-200 border border-transparent ' +
		'hover:bg-obsidian-800 hover:text-ink-0',
};

const SIZE_CLASSES: Record<Size, string> = {
	default: 'h-10 px-4 text-sm',
	sm: 'h-8 px-3 text-xs',
	lg: 'h-12 px-7 text-sm',
	icon: 'h-9 w-9 p-0',
};

// Norse-voiced base: Cinzel display, wide tracking, uppercase. All variants share it.
const BASE_CLASSES =
	'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ' +
	'font-display font-bold tracking-[0.18em] uppercase ' +
	'transition-all duration-200 ' +
	'disabled:pointer-events-none disabled:opacity-50 ' +
	'[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ' +
	'focus-visible:outline focus-visible:outline-2 ' +
	'focus-visible:outline-gold-300 focus-visible:outline-offset-2';

/**
 * Decorative diamond bullet (♦ rotated square) inheriting button text color.
 * Used by `ornate` prop to flank the label on ceremonial outline buttons.
 */
function Diamond() {
	return (
		<span
			aria-hidden
			className="inline-block w-[6px] h-[6px] rotate-45 bg-current opacity-90 shrink-0"
		/>
	);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
	/**
	 * Renders Norse-style diamond bullets at start and end of the label.
	 * Designed for ceremonial outline CTAs (e.g. "◆ DOWNLOAD SAGA ◆").
	 */
	ornate?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{ className, variant = 'default', size = 'default', ornate = false, type = 'button', children, ...props },
		ref,
	) => (
		<button
			ref={ref}
			type={type}
			className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)}
			{...props}
		>
			{ornate && <Diamond />}
			{children}
			{ornate && <Diamond />}
		</button>
	),
);
Button.displayName = 'Button';
