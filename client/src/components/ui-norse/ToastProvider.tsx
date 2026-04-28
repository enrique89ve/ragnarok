import type { ComponentProps } from 'react';
import { Toaster as SonnerToaster } from 'sonner';

type SonnerProps = ComponentProps<typeof SonnerToaster>;

export function ToastProvider(props: SonnerProps) {
	return (
		<SonnerToaster
			theme="dark"
			className="toaster group"
			toastOptions={{
				classNames: {
					toast:
						'group toast border bg-[var(--obsidian-850)] text-[var(--ink-0)] ' +
						'border-[var(--obsidian-700)] shadow-lg',
					description: 'text-[var(--ink-200)]',
					actionButton: 'bg-[var(--gold-400)] text-[var(--obsidian-950)]',
					cancelButton: 'bg-[var(--obsidian-700)] text-[var(--ink-200)]',
				},
			}}
			{...props}
		/>
	);
}
