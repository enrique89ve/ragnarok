import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'primary' | 'outline' | 'destructive' | 'ghost';
type Size = 'default' | 'sm' | 'lg' | 'icon';

const VARIANT_CLASSES: Record<Variant, string> = {
	default:
		'bg-[var(--obsidian-750)] text-[var(--ink-0)] border border-[var(--obsidian-600)] ' +
		'hover:bg-[var(--obsidian-700)] hover:border-[var(--gold-600)]',
	primary:
		'bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--obsidian-950)] ' +
		'border border-[var(--gold-200)] hover:from-[var(--gold-200)] hover:to-[var(--gold-400)] ' +
		'shadow-[0_0_18px_-6px_var(--gold-glow)]',
	outline:
		'bg-transparent text-[var(--gold-300)] border border-[var(--gold-600)] ' +
		'hover:bg-[var(--obsidian-800)] hover:border-[var(--gold-300)]',
	destructive:
		'bg-[var(--blood-500)] text-[var(--ink-0)] border border-[var(--blood-300)] ' +
		'hover:bg-[var(--blood-300)] hover:text-[var(--obsidian-950)]',
	ghost:
		'bg-transparent text-[var(--ink-200)] border border-transparent ' +
		'hover:bg-[var(--obsidian-800)] hover:text-[var(--ink-0)]',
};

const SIZE_CLASSES: Record<Size, string> = {
	default: 'h-10 px-4 text-sm',
	sm: 'h-8 px-3 text-xs',
	lg: 'h-12 px-7 text-sm',
	icon: 'h-9 w-9 p-0',
};

const BASE_CLASSES =
	'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ' +
	'font-medium transition-colors ' +
	'disabled:pointer-events-none disabled:opacity-50 ' +
	'[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ' +
	'focus-visible:outline focus-visible:outline-2 ' +
	'focus-visible:outline-[var(--gold-300)] focus-visible:outline-offset-2';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => (
		<button
			ref={ref}
			type={type}
			className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)}
			{...props}
		/>
	),
);
Button.displayName = 'Button';
