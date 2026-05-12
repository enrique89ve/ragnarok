import { useState } from 'react';
import { Clipboard, Wallet } from 'lucide-react';
import type { AccountRuneSummary } from '../../../data/runeAPI';
import { formatNumber } from './walletFormatting';

type CopyState = 'idle' | 'copied' | 'failed';

export function BalanceOverview({ account }: { account: AccountRuneSummary }) {
	const [copyState, setCopyState] = useState<CopyState>('idle');

	const copyAccount = async () => {
		try {
			await navigator.clipboard.writeText(account.account);
			setCopyState('copied');
			window.setTimeout(() => setCopyState('idle'), 1200);
		} catch {
			setCopyState('failed');
			window.setTimeout(() => setCopyState('idle'), 1600);
		}
	};

	const copyLabel = copyState === 'copied'
		? 'Copied'
		: copyState === 'failed'
			? 'Copy failed'
			: 'Copy account';
	const claimedAmount = formatNumber(account.debits);

	return (
		<section className="runic-panel texture-grain relative overflow-hidden border border-gold-300/30 bg-[radial-gradient(ellipse_at_88%_0%,rgba(217,168,68,0.16),transparent_52%),linear-gradient(180deg,rgba(22,25,32,0.96),rgba(7,9,13,0.98))] p-4 md:p-5">
			<span className="runic-corners runic-corners--lg" aria-hidden="true" />
			<span className="runic-corners-extra" aria-hidden="true" />
			<div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
				<div className="flex min-w-0 items-center gap-3">
					<span className="hex-frame hex-frame--gold h-10 w-9 shrink-0">
						<span className="hex-frame-inner text-gold-200">
							<Wallet className="h-4 w-4" aria-hidden="true" />
						</span>
					</span>
					<div className="min-w-0">
						<p className="font-mono text-[10px] uppercase tracking-[0.26em] text-gold-200">Player vault</p>
						<p className="mt-1 truncate font-mono text-xs text-ink-300">@{account.account}</p>
					</div>
				</div>
				<button
					type="button"
					onClick={copyAccount}
					aria-label={copyLabel}
					title={copyLabel}
					className="grid h-10 w-10 place-items-center rounded-full border border-obsidian-700 bg-obsidian-950/70 text-ink-200 transition-colors hover:border-gold-300/55 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
				>
					<Clipboard className="h-4 w-4" aria-hidden="true" />
				</button>
			</div>

			<div className="relative z-10 mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-end lg:grid-cols-[minmax(0,1fr)_220px]">
				<div className="min-w-0">
					<p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Balance</p>
					<div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
						<p className="numeric-display text-5xl leading-none text-ink-0 md:text-6xl">
							{formatNumber(account.runeBalance)}
						</p>
						<p className="pb-1.5 font-display text-base font-black uppercase tracking-[0.18em] text-gold-200 md:text-lg">
							RUNE
						</p>
					</div>
				</div>
				<LedgerMark label="Claimed" value={claimedAmount} />
			</div>
		</section>
	);
}

function LedgerMark({ label, value }: {
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center justify-between gap-4 border-l border-gold-300/35 bg-obsidian-950/35 px-3 py-3 sm:block">
			<p className="font-display text-sm font-black uppercase tracking-[0.14em] text-ink-200 md:text-base">{label}</p>
			<p className="mt-1 font-mono text-xl font-black leading-none text-gold-200 md:text-2xl">{value}</p>
		</div>
	);
}
