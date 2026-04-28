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
						'group toast border bg-(--obsidian-850) text-(--ink-0) ' +
						'border-(--obsidian-700) shadow-lg',
					description: 'text-(--ink-200)',
					actionButton: 'bg-(--gold-400) text-(--obsidian-950)',
					cancelButton: 'bg-(--obsidian-700) text-(--ink-200)',
				},
			}}
			{...props}
		/>
	);
}
