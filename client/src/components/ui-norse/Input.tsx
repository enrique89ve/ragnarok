import * as React from 'react';
import { cn } from '@/lib/utils';

const INPUT_BASE =
	'flex h-10 w-full rounded-md border border-(--obsidian-600) ' +
	'bg-(--obsidian-800) px-3 py-1 text-sm text-(--ink-0) ' +
	'placeholder:text-(--ink-300) ' +
	'transition-colors ' +
	'focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--gold-300) ' +
	'focus-visible:outline-offset-1 focus-visible:border-(--gold-600) ' +
	'disabled:cursor-not-allowed disabled:opacity-50';

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
	({ className, type, ...props }, ref) => (
		<input ref={ref} type={type} className={cn(INPUT_BASE, className)} {...props} />
	),
);
Input.displayName = 'Input';
