/**
 * RUNE testnet internal panel.
 *
 * Data is read from `/api/chain/rune/*`. The variant switcher is still a
 * layout prototype aid and should be removed when the final surface is chosen.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Clipboard,
	Database,
	Download,
	Filter,
	Gauge,
	Hash,
	Search,
	ShieldCheck,
	Wallet,
	type LucideIcon,
} from 'lucide-react';
import { Button } from '../../../components/ui-norse';
import { routes } from '../../../lib/routes';
import {
	fetchRuneAccount,
	fetchRuneBalances,
	fetchRuneLedger,
	fetchRuneState,
	type AccountRuneSummary,
	type RuneDirection,
	type RuneLedgerEntryView,
	type RuneSourceType,
	type RuneStateSnapshot,
} from '../../../data/runeAPI';

type VariantKey = 'A' | 'B' | 'C';
type RunePanelData = {
	state: RuneStateSnapshot;
	ledger: RuneLedgerEntryView[];
	accounts: AccountRuneSummary[];
	selectedAccount: AccountRuneSummary;
	selectedAccountLedger: RuneLedgerEntryView[];
};

type VariantMeta = {
	key: VariantKey;
	name: string;
};

const VARIANTS: readonly VariantMeta[] = [
	{ key: 'A', name: 'Audit Dashboard' },
	{ key: 'B', name: 'Account First' },
	{ key: 'C', name: 'Ledger Inspector' },
] as const;

const SOURCE_LABELS: Record<RuneSourceType, string> = {
	p2p_ranked: 'Ranked PvP',
	campaign_first_clear: 'Campaign',
	reward_claim: 'Reward Claim',
	daily_quest_claim: 'Daily Quest',
	rune_exchange: 'Pack Exchange',
};

const DIRECTION_CLASS: Record<RuneDirection, string> = {
	credit: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-200',
	debit: 'border-ember-300/35 bg-ember-400/10 text-ember-200',
};

function getVariantKey(value: string | null): VariantKey {
	return value === 'B' || value === 'C' ? value : 'A';
}

function formatNumber(value: number): string {
	return value.toLocaleString('en-US');
}

function formatPercent(value: number, cap: number): string {
	if (cap <= 0) return '0.00%';
	return `${((value / cap) * 100).toFixed(2)}%`;
}

function formatBlock(blockNum: number): string {
	return `#${formatNumber(blockNum)}`;
}

function formatTimestamp(timestamp: number): string {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(timestamp));
}

function compactId(value: string): string {
	if (value.length <= 18) return value;
	return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function isEditableElement(element: Element | null): boolean {
	if (!element) return false;
	const tagName = element.tagName.toLowerCase();
	return tagName === 'input'
		|| tagName === 'textarea'
		|| element.getAttribute('contenteditable') === 'true';
}

function createEmptyAccount(account: string): AccountRuneSummary {
	return {
		account,
		runeBalance: 0,
		credits: 0,
		debits: 0,
		drift: 0,
		lastBlock: 0,
		indexed: false,
	};
}

type RunePanelLoadState =
	| { status: 'loading' }
	| { status: 'loaded'; data: RunePanelData }
	| { status: 'error'; message: string };

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function useRunePanelData(selectedAccountName: string): RunePanelLoadState {
	const [loadState, setLoadState] = useState<RunePanelLoadState>({ status: 'loading' });

	useEffect(() => {
		const controller = new AbortController();
		setLoadState({ status: 'loading' });

		Promise.all([
			fetchRuneState('S01', controller.signal),
			fetchRuneLedger({ seasonId: 'S01', limit: 100 }, controller.signal),
			fetchRuneBalances({ seasonId: 'S01', limit: 25 }, controller.signal),
			fetchRuneAccount(selectedAccountName, 'S01', controller.signal),
			fetchRuneLedger({ seasonId: 'S01', account: selectedAccountName, limit: 50 }, controller.signal),
		])
			.then(([state, ledger, balances, selectedAccount, selectedLedger]) => {
				if (controller.signal.aborted) return;
				const accounts = balances.accounts.some(account => account.account === selectedAccount.account)
					? balances.accounts
					: [selectedAccount, ...balances.accounts];

				setLoadState({
					status: 'loaded',
					data: {
						state,
						ledger: ledger.entries,
						accounts,
						selectedAccount,
						selectedAccountLedger: selectedLedger.entries,
					},
				});
			})
			.catch(error => {
				if (controller.signal.aborted) return;
				setLoadState({ status: 'error', message: getErrorMessage(error) });
			});

		return () => controller.abort();
	}, [selectedAccountName]);

	return loadState;
}

function KpiTile({ label, value, detail, tone, icon: Icon }: {
	label: string;
	value: string;
	detail: string;
	tone: 'gold' | 'green' | 'blue' | 'red';
	icon: LucideIcon;
}) {
	const toneClass = {
		gold: 'border-gold-300/35 text-gold-200 bg-gold-300/10',
		green: 'border-emerald-300/35 text-emerald-200 bg-emerald-400/10',
		blue: 'border-bifrost-300/35 text-bifrost-200 bg-bifrost-400/10',
		red: 'border-ember-300/35 text-ember-200 bg-ember-400/10',
	}[tone];

	return (
		<article className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 p-4">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">{label}</p>
					<p className="mt-2 font-display text-2xl font-bold tracking-[0.06em] text-ink-0">{value}</p>
				</div>
				<span className={`grid h-9 w-9 place-items-center rounded-md border ${toneClass}`}>
					<Icon size={16} strokeWidth={1.8} />
				</span>
			</div>
			<p className="mt-3 text-xs leading-5 text-ink-300">{detail}</p>
		</article>
	);
}

function InvariantBanner({ state }: { state: RuneStateSnapshot }) {
	const healthy = state.balanceDrift === 0
		&& state.activeBalanceTotal <= state.totalCap
		&& state.ledgerCreditTotal <= state.totalCap;

	return (
		<section className={`rounded-lg border p-4 ${
			healthy
				? 'border-emerald-300/35 bg-emerald-400/10'
				: 'border-ember-300/45 bg-ember-400/10'
		}`}>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-start gap-3">
					<span className={`mt-0.5 grid h-8 w-8 place-items-center rounded-md border ${
						healthy ? 'border-emerald-300/35 text-emerald-200' : 'border-ember-300/45 text-ember-200'
					}`}>
						{healthy ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
					</span>
					<div>
						<h2 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-ink-0">
							RUNE invariants
						</h2>
						<p className="mt-1 text-sm text-ink-200">
							Active balance matches ledger projection. Emission and balance totals remain under cap.
						</p>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-3">
					<MiniStat label="Drift" value={formatNumber(state.balanceDrift)} />
					<MiniStat label="Active" value={formatPercent(state.activeBalanceTotal, state.totalCap)} />
					<MiniStat label="Issued" value={formatPercent(state.ledgerCreditTotal, state.totalCap)} />
				</div>
			</div>
		</section>
	);
}

function MiniStat({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-400">{label}</p>
			<p className="mt-1 font-mono text-xs text-ink-0">{value}</p>
		</div>
	);
}

function LedgerTable({ entries, dense = false }: { entries: RuneLedgerEntryView[]; dense?: boolean }) {
	return (
		<div className="overflow-hidden rounded-lg border border-obsidian-700">
			<table className="w-full min-w-[780px] border-collapse text-left">
				<thead className="bg-obsidian-950/85">
					<tr className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">
						<th className="px-4 py-3 font-medium">Account</th>
						<th className="px-4 py-3 font-medium">Source</th>
						<th className="px-4 py-3 font-medium">Movement</th>
						<th className="px-4 py-3 font-medium">Trace</th>
						<th className="px-4 py-3 font-medium">Block</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-obsidian-700 bg-obsidian-900/70">
					{entries.length === 0 && (
						<tr>
							<td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-400">
								No RUNE ledger entries for this query.
							</td>
						</tr>
					)}
					{entries.map(entry => (
						<tr key={entry.entryId} className="text-sm text-ink-100">
							<td className="px-4 py-3 font-mono text-xs text-ink-0">{entry.account}</td>
							<td className="px-4 py-3">
								<p className="font-display text-xs uppercase tracking-[0.12em] text-gold-200">
									{SOURCE_LABELS[entry.sourceType]}
								</p>
								<p className="mt-1 font-mono text-[11px] text-ink-400">{compactId(entry.sourceKey)}</p>
							</td>
							<td className="px-4 py-3">
								<span className={`inline-flex rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${DIRECTION_CLASS[entry.direction]}`}>
									{entry.direction} {formatNumber(entry.amount)}
								</span>
							</td>
							<td className="px-4 py-3 font-mono text-xs text-ink-200">
								{formatNumber(entry.balanceBefore)}{' -> '}{formatNumber(entry.balanceAfter)}
							</td>
							<td className="px-4 py-3">
								<p className="font-mono text-xs text-ink-0">{formatBlock(entry.blockNum)}</p>
								{!dense && <p className="mt-1 text-xs text-ink-400">{formatTimestamp(entry.timestamp)}</p>}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function JsonPreview({ data }: { data: RunePanelData }) {
	const snapshot = JSON.stringify(data, null, 2);
	const [copied, setCopied] = useState(false);

	const copySnapshot = async () => {
		await navigator.clipboard.writeText(snapshot);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1200);
	};

	return (
		<section className="rounded-lg border border-obsidian-700 bg-obsidian-950/75">
			<header className="flex items-center justify-between gap-3 border-b border-obsidian-700 px-4 py-3">
				<div>
					<h2 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-ink-0">JSON view</h2>
					<p className="mt-1 text-xs text-ink-400">Client-side snapshot from the current read model.</p>
				</div>
				<Button variant="outline" size="sm" onClick={copySnapshot}>
					<Clipboard size={14} />
					{copied ? 'Copied' : 'Copy JSON'}
				</Button>
			</header>
			<pre className="max-h-[360px] overflow-auto p-4 font-mono text-[11px] leading-5 text-ink-300">
				{snapshot}
			</pre>
		</section>
	);
}

function VariantAuditDashboard({ data }: { data: RunePanelData }) {
	const { state, ledger } = data;

	return (
		<div className="grid gap-6">
			<section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
				<KpiTile
					label="Active Balance"
					value={formatNumber(state.activeBalanceTotal)}
					detail={`${formatPercent(state.activeBalanceTotal, state.totalCap)} of total cap`}
					tone="gold"
					icon={Wallet}
				/>
				<KpiTile
					label="Ledger Credits"
					value={formatNumber(state.ledgerCreditTotal)}
					detail="Total emitted RUNE across all credit sources"
					tone="green"
					icon={Database}
				/>
				<KpiTile
					label="Ledger Debits"
					value={formatNumber(state.ledgerDebitTotal)}
					detail="RUNE consumed by pack exchange routes"
					tone="red"
					icon={Download}
				/>
				<KpiTile
					label="Balance Drift"
					value={formatNumber(state.balanceDrift)}
					detail="Active balances minus ledger projection"
					tone="blue"
					icon={Gauge}
				/>
			</section>

			<InvariantBanner state={state} />

			<section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_390px]">
				<article className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 p-5">
					<header className="mb-4 flex items-center justify-between gap-3">
						<div>
							<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">Recent ledger</p>
							<h2 className="mt-1 font-display text-lg font-bold uppercase tracking-[0.12em] text-ink-0">
								Deterministic movements
							</h2>
						</div>
						<span className="rounded border border-gold-300/30 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-gold-200">
							{state.seasonId}
						</span>
					</header>
					<div className="overflow-x-auto">
						<LedgerTable entries={ledger} />
					</div>
				</article>

				<article className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 p-5">
					<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">Source allocation</p>
					<h2 className="mt-1 font-display text-lg font-bold uppercase tracking-[0.12em] text-ink-0">
						Credit and debit pools
					</h2>
					<div className="mt-5 grid gap-4">
						<PoolRow label="Ranked PvP" value={state.p2pCreditTotal} cap={state.p2pCap} />
						<PoolRow label="Campaign" value={state.campaignCreditTotal} cap={state.campaignCap} />
						<PoolRow label="Reward Claim" value={state.rewardClaimCreditTotal} cap={state.totalCap} />
						<PoolRow label="Pack Exchange" value={state.runeExchangeDebitTotal} cap={state.ledgerCreditTotal} debit />
					</div>
				</article>
			</section>
		</div>
	);
}

function PoolRow({ label, value, cap, debit = false }: { label: string; value: number; cap: number; debit?: boolean }) {
	const percent = cap > 0 ? Math.min((value / cap) * 100, 100) : 0;

	return (
		<div>
			<div className="mb-2 flex items-center justify-between gap-4">
				<span className="text-sm text-ink-100">{label}</span>
				<span className={`font-mono text-xs ${debit ? 'text-ember-200' : 'text-gold-200'}`}>
					{formatNumber(value)}
				</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-obsidian-700">
				<div
					className={`h-full rounded-full ${debit ? 'bg-ember-300' : 'bg-gold-300'}`}
					style={{ width: `${percent}%` }}
				/>
			</div>
		</div>
	);
}

function VariantAccountFirst({ data, selectedAccountName, onAccountChange }: {
	data: RunePanelData;
	selectedAccountName: string;
	onAccountChange: (account: string) => void;
}) {
	const [query, setQuery] = useState(selectedAccountName);
	const selectedAccount = data.selectedAccount ?? createEmptyAccount(selectedAccountName);
	const accountEntries = data.selectedAccountLedger;

	useEffect(() => {
		setQuery(selectedAccountName);
	}, [selectedAccountName]);

	const submitAccount = () => {
		const account = query.trim().toLowerCase();
		if (!account) return;
		onAccountChange(account);
	};

	return (
		<div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
			<aside className="grid gap-4 content-start">
				<section className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 p-5">
					<label htmlFor="rune-account-search" className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
						Account
					</label>
					<div className="mt-3 flex items-center gap-2 rounded-lg border border-obsidian-700 bg-obsidian-950 px-3 py-2">
						<Search size={15} className="text-ink-400" />
						<input
							id="rune-account-search"
							value={query}
							onChange={event => setQuery(event.target.value)}
							onKeyDown={event => {
								if (event.key === 'Enter') submitAccount();
							}}
							className="min-w-0 flex-1 bg-transparent font-mono text-sm text-ink-0 outline-none placeholder:text-ink-500"
							placeholder="rk_game_testnet"
						/>
					</div>
					<Button variant="outline" size="sm" className="mt-3 w-full" onClick={submitAccount}>
						<Search size={14} />
						Load account
					</Button>
				</section>

				<section className="rounded-lg border border-gold-300/35 bg-gold-300/10 p-5">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold-200">Selected account</p>
							<h2 className="mt-2 break-words font-display text-2xl font-bold tracking-[0.08em] text-ink-0">
								{selectedAccount.account}
							</h2>
						</div>
						<Wallet className="text-gold-200" size={22} />
					</div>
					<div className="mt-5 grid grid-cols-2 gap-3">
						<MiniStat label="Balance" value={formatNumber(selectedAccount.runeBalance)} />
						<MiniStat label="Credits" value={formatNumber(selectedAccount.credits)} />
						<MiniStat label="Debits" value={formatNumber(selectedAccount.debits)} />
						<MiniStat label="Drift" value={formatNumber(selectedAccount.drift)} />
					</div>
				</section>

				<section className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 p-5">
					<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">Accounts</p>
					<div className="mt-4 grid gap-2">
						{data.accounts.length === 0 && (
							<p className="rounded-md border border-obsidian-700 bg-obsidian-950/60 px-3 py-3 text-sm text-ink-400">
								No RUNE balances indexed yet.
							</p>
						)}
						{data.accounts.map(account => (
							<button
								key={account.account}
								type="button"
								onClick={() => onAccountChange(account.account)}
								className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
									account.account === selectedAccount.account
										? 'border-gold-300/55 bg-gold-300/10 text-gold-100'
										: 'border-obsidian-700 bg-obsidian-950/60 text-ink-200 hover:border-gold-300/35'
								}`}
							>
								<span className="min-w-0 truncate font-mono text-xs">{account.account}</span>
								<span className="font-mono text-xs">{formatNumber(account.runeBalance)}</span>
							</button>
						))}
					</div>
				</section>
			</aside>

			<main className="grid gap-6 content-start">
				<InvariantBanner state={data.state} />
				<section className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 p-5">
					<header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">Account trace</p>
							<h2 className="mt-1 font-display text-lg font-bold uppercase tracking-[0.12em] text-ink-0">
								Balance path
							</h2>
						</div>
						<span className="font-mono text-xs text-ink-400">
							Last block {formatBlock(selectedAccount.lastBlock)}
						</span>
					</header>
					<div className="grid gap-3">
						{accountEntries.length === 0 && (
							<div className="rounded-lg border border-obsidian-700 bg-obsidian-950/65 p-5 text-sm text-ink-300">
								No RUNE movements found for this account.
							</div>
						)}
						{accountEntries.map(entry => (
							<article key={entry.entryId} className="rounded-lg border border-obsidian-700 bg-obsidian-950/65 p-4">
								<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
									<div>
										<span className={`inline-flex rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${DIRECTION_CLASS[entry.direction]}`}>
											{entry.direction} {formatNumber(entry.amount)}
										</span>
										<h3 className="mt-3 font-display text-sm uppercase tracking-[0.14em] text-ink-0">
											{SOURCE_LABELS[entry.sourceType]}
										</h3>
										<p className="mt-1 font-mono text-xs text-ink-400">{entry.sourceKey}</p>
									</div>
									<div className="grid grid-cols-3 gap-3 text-right">
										<MiniStat label="Before" value={formatNumber(entry.balanceBefore)} />
										<MiniStat label="After" value={formatNumber(entry.balanceAfter)} />
										<MiniStat label="Block" value={formatBlock(entry.blockNum)} />
									</div>
								</div>
							</article>
						))}
					</div>
				</section>
			</main>
		</div>
	);
}

function VariantLedgerInspector({ data }: { data: RunePanelData }) {
	const [sourceType, setSourceType] = useState<RuneSourceType | 'all'>('all');
	const visibleEntries = sourceType === 'all'
		? data.ledger
		: data.ledger.filter(entry => entry.sourceType === sourceType);
	const filteredData: RunePanelData = { ...data, ledger: visibleEntries };

	return (
		<div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_410px]">
			<main className="grid gap-6 content-start">
				<section className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 p-5">
					<header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">Ledger inspector</p>
							<h2 className="mt-1 font-display text-lg font-bold uppercase tracking-[0.12em] text-ink-0">
								Query surface
							</h2>
						</div>
						<div className="flex flex-wrap gap-2">
							<FilterPill active={sourceType === 'all'} onClick={() => setSourceType('all')}>All</FilterPill>
							{Object.entries(SOURCE_LABELS).map(([key, label]) => (
								<FilterPill
									key={key}
									active={sourceType === key}
									onClick={() => setSourceType(key as RuneSourceType)}
								>
									{label}
								</FilterPill>
							))}
						</div>
					</header>

					<div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
						<QueryChip icon={Hash} label="Season" value={data.state.seasonId} />
						<QueryChip icon={Filter} label="Rows" value={String(visibleEntries.length)} />
						<QueryChip icon={Gauge} label="Drift" value={formatNumber(data.state.balanceDrift)} />
					</div>

					<div className="overflow-x-auto">
						<LedgerTable entries={visibleEntries} dense />
					</div>
				</section>
			</main>

			<aside className="grid gap-6 content-start">
				<InvariantBanner state={data.state} />
				<JsonPreview data={filteredData} />
			</aside>
		</div>
	);
}

function FilterPill({ active, onClick, children }: {
	active: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`rounded-full border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
				active
					? 'border-gold-300/60 bg-gold-300/15 text-gold-100'
					: 'border-obsidian-700 bg-obsidian-950/70 text-ink-300 hover:border-gold-300/35 hover:text-ink-0'
			}`}
		>
			{children}
		</button>
	);
}

function QueryChip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
	return (
		<div className="flex items-center gap-3 rounded-lg border border-obsidian-700 bg-obsidian-950/65 px-3 py-3">
			<span className="grid h-8 w-8 place-items-center rounded-md border border-bifrost-300/30 bg-bifrost-400/10 text-bifrost-200">
				<Icon size={15} />
			</span>
			<div className="min-w-0">
				<p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-400">{label}</p>
				<p className="mt-1 truncate font-mono text-xs text-ink-0">{value}</p>
			</div>
		</div>
	);
}

function RunePanelLoading() {
	return (
		<section className="rounded-lg border border-obsidian-700 bg-obsidian-900/80 p-8">
			<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">Loading RUNE state</p>
			<div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
				{[0, 1, 2, 3].map(item => (
					<div key={item} className="h-28 animate-pulse rounded-lg bg-obsidian-800" />
				))}
			</div>
		</section>
	);
}

function RunePanelError({ message }: { message: string }) {
	return (
		<section className="rounded-lg border border-ember-300/45 bg-ember-400/10 p-6">
			<div className="flex items-start gap-3">
				<span className="grid h-9 w-9 place-items-center rounded-md border border-ember-300/45 text-ember-200">
					<AlertTriangle size={17} />
				</span>
				<div>
					<h2 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-ink-0">
						RUNE read model unavailable
					</h2>
					<p className="mt-2 text-sm leading-6 text-ink-200">{message}</p>
				</div>
			</div>
		</section>
	);
}

function PrototypeSwitcher({ current }: { current: VariantKey }) {
	const [, setSearchParams] = useSearchParams();

	const goTo = (direction: -1 | 1) => {
		const currentIndex = VARIANTS.findIndex(variant => variant.key === current);
		const nextIndex = (currentIndex + direction + VARIANTS.length) % VARIANTS.length;
		setSearchParams({ variant: VARIANTS[nextIndex].key });
	};

	useEffect(() => {
		if (!import.meta.env.DEV) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (isEditableElement(document.activeElement)) return;
			if (event.key === 'ArrowLeft') goTo(-1);
			if (event.key === 'ArrowRight') goTo(1);
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});

	if (!import.meta.env.DEV) return null;

	const variant = VARIANTS.find(candidate => candidate.key === current) ?? VARIANTS[0];

	return (
		<nav
			aria-label="Prototype variants"
			className="fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-full border border-gold-300/40 bg-obsidian-950/95 px-3 py-2 shadow-2xl shadow-black/50 backdrop-blur"
		>
			<button
				type="button"
				aria-label="Previous variant"
				onClick={() => goTo(-1)}
				className="grid h-9 w-9 place-items-center rounded-full border border-obsidian-700 text-ink-200 transition-colors hover:border-gold-300/50 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
			>
				<ArrowLeft size={15} />
			</button>
			<div className="min-w-[210px] text-center">
				<p className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-500">Prototype</p>
				<p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-gold-100">
					{variant.key} - {variant.name}
				</p>
			</div>
			<button
				type="button"
				aria-label="Next variant"
				onClick={() => goTo(1)}
				className="grid h-9 w-9 place-items-center rounded-full border border-obsidian-700 text-ink-200 transition-colors hover:border-gold-300/50 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
			>
				<ArrowRight size={15} />
			</button>
		</nav>
	);
}

export default function RuneTestnetPrototype() {
	const [searchParams] = useSearchParams();
	const variant = getVariantKey(searchParams.get('variant'));
	const [selectedAccountName, setSelectedAccountName] = useState('rk_game_testnet');
	const loadState = useRunePanelData(selectedAccountName);
	const updateSelectedAccount = useCallback((account: string) => {
		setSelectedAccountName(account);
	}, []);

	return (
		<div className="min-h-screen overflow-x-hidden bg-obsidian-950 text-ink-0">
			<header className="border-b border-obsidian-700 bg-obsidian-950/90">
				<div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
					<div>
						<div className="mb-2 flex flex-wrap items-center gap-2">
							<span className="rounded border border-gold-300/40 bg-gold-300/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold-100">
								Live read model
							</span>
							<span className="rounded border border-bifrost-300/35 bg-bifrost-400/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-bifrost-100">
								GET-only UI
							</span>
						</div>
						<h1 className="font-display text-2xl font-black uppercase tracking-[0.12em] text-gold-200 md:text-3xl">
							RUNE Testnet Control
						</h1>
						<p className="mt-2 max-w-3xl text-sm leading-6 text-ink-300">
							Internal read model for balances, ledger trace, caps, and drift before live smoke integration.
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Link
							to={routes.home}
							className="inline-flex h-10 items-center rounded-md border border-obsidian-700 px-4 font-display text-xs font-bold uppercase tracking-[0.16em] text-ink-200 transition-colors hover:border-gold-300/40 hover:text-gold-200"
						>
							Home
						</Link>
						{loadState.status === 'loaded' && (
							<span className="inline-flex h-10 items-center rounded-md border border-obsidian-700 bg-obsidian-900 px-4 font-mono text-xs text-ink-200">
								Last block {formatBlock(loadState.data.state.lastBlock)}
							</span>
						)}
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-[1500px] px-5 py-6 pb-28">
				{loadState.status === 'loading' && <RunePanelLoading />}
				{loadState.status === 'error' && <RunePanelError message={loadState.message} />}
				{loadState.status === 'loaded' && (
					<>
						{variant === 'A' && <VariantAuditDashboard data={loadState.data} />}
						{variant === 'B' && (
							<VariantAccountFirst
								data={loadState.data}
								selectedAccountName={selectedAccountName}
								onAccountChange={updateSelectedAccount}
							/>
						)}
						{variant === 'C' && <VariantLedgerInspector data={loadState.data} />}
					</>
				)}
			</main>

			<PrototypeSwitcher current={variant} />
		</div>
	);
}
