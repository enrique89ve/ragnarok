import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { HiveKeychainLogin } from '../../game/components/HiveKeychainLogin';

const OPEN_LOGIN_MODAL_EVENT = 'ragnarok:open-login-modal';

export function openLoginModal(): void {
	if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_LOGIN_MODAL_EVENT));
}

export function LoginModalHost(): React.ReactNode {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const handleOpen = () => setOpen(true);
		window.addEventListener(OPEN_LOGIN_MODAL_EVENT, handleOpen);
		return () => window.removeEventListener(OPEN_LOGIN_MODAL_EVENT, handleOpen);
	}, []);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-[120] flex items-center justify-center bg-obsidian-950/82 px-4 backdrop-blur-sm">
			<div role="dialog" aria-modal="true" aria-labelledby="global-hive-login-title" className="relative w-full max-w-md rounded-md border border-gold-300/35 bg-obsidian-900/95 p-5 text-ink-0 shadow-2xl shadow-black/50">
				<button type="button" onClick={() => setOpen(false)} aria-label="Close login" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md border border-obsidian-700 bg-obsidian-950/70 text-ink-300 transition-colors hover:border-gold-300/50 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300">
					<X size={15} strokeWidth={2} />
				</button>
				<h2 id="global-hive-login-title" className="pr-10 font-display text-xl font-black uppercase tracking-[0.12em] text-ink-0">Login</h2>
				<div className="mt-4"><HiveKeychainLogin onConnected={() => setOpen(false)} /></div>
			</div>
		</div>
	);
}
