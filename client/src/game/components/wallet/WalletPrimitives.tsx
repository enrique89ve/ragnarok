import { AlertTriangle, Wallet } from 'lucide-react';
import { HiveKeychainLogin } from '../HiveKeychainLogin';

export function WalletLoading() {
	return (
		<section className="runic-panel texture-grain relative border border-obsidian-700 bg-obsidian-900/80 p-8">
			<span className="runic-corners" aria-hidden="true" />
			<span className="runic-corners-extra" aria-hidden="true" />
			<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">Loading wallet</p>
			<div className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-4">
				{[0, 1, 2, 3].map(item => (
					<div key={item} className="h-24 animate-pulse bg-obsidian-800" />
				))}
			</div>
		</section>
	);
}

export function WalletConnectPrompt() {
	return (
		<section className="runic-panel texture-grain relative mx-auto grid w-full max-w-[760px] gap-5 border border-gold-300/35 bg-obsidian-900/80 p-6 shadow-[0_24px_80px_-52px_rgba(217,168,68,0.75)]">
			<span className="runic-corners runic-corners--lg" aria-hidden="true" />
			<span className="runic-corners-extra" aria-hidden="true" />
			<div className="flex items-start gap-4">
				<span className="hex-frame hex-frame--gold h-12 w-11 shrink-0">
					<span className="hex-frame-inner text-gold-200">
						<Wallet className="h-5 w-5" aria-hidden="true" />
					</span>
				</span>
				<div>
					<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-200">Your wallet</p>
					<h2 className="mt-2 font-display text-xl font-black uppercase tracking-[0.12em] text-ink-0">
						Connect Hive
					</h2>
					<p className="mt-2 text-sm leading-6 text-ink-300">
						Wallet only shows the account signed into this device.
					</p>
				</div>
			</div>
			<div className="border border-obsidian-700 bg-obsidian-950/60 p-4">
				<HiveKeychainLogin />
			</div>
		</section>
	);
}

export function WalletError({ message }: { message: string }) {
	return (
		<section className="runic-panel texture-grain relative border border-ember-300/45 bg-ember-400/10 p-6">
			<span className="runic-corners runic-corners--ember" aria-hidden="true" />
			<span className="runic-corners-extra" aria-hidden="true" />
			<div className="flex items-start gap-3">
				<span className="grid h-9 w-9 place-items-center border border-ember-300/45 text-ember-200">
					<AlertTriangle className="h-4 w-4" aria-hidden="true" />
				</span>
				<div>
					<h2 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-ink-0">
						Wallet unavailable
					</h2>
					<p className="mt-2 text-sm leading-6 text-ink-200">{message}</p>
				</div>
			</div>
		</section>
	);
}
