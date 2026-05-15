import { ArrowDownUp, Minus, Plus, Wallet, X, Zap, Package } from 'lucide-react';
import type { FormEvent, MouseEvent } from 'react';
import { useId } from 'react';
import type { PackType } from '../packs/types';
import {
	formatPackUnit,
	type RunePackExchangeQuote,
} from './runePackExchange';
import type { RuneExchangeConfirmation, RuneExchangeLedgerStatus } from './useRunePackExchange';

export interface RuneExchangeModalProps {
	pack: PackType;
	quote: RunePackExchangeQuote;
	quantityInput: string;
	runeBalance: number;
	ledgerStatus: RuneExchangeLedgerStatus;
	ledgerError: string | null;
	isSubmitting: boolean;
	confirmation: RuneExchangeConfirmation;
	onQuantityInputChange: (value: string) => void;
	onSetQuantity: (quantity: number) => void;
	onSetMaxQuantity: () => void;
	onClose: () => void;
	onSubmit: () => void;
}

interface RuneExchangeModalViewState {
	halfQuantity: number;
	canUseQuickAmounts: boolean;
	submitLabel: string;
	minusDisabled: boolean;
	plusDisabled: boolean;
	remainingBalanceClassName: string;
	statusMessage: string | null;
	statusClassName: string;
	isExchangeLocked: boolean;
	showConfirmation: boolean;
}

export function RuneExchangeModal({
	pack,
	quote,
	quantityInput,
	runeBalance,
	ledgerStatus,
	ledgerError,
	isSubmitting,
	confirmation,
	onQuantityInputChange,
	onSetQuantity,
	onSetMaxQuantity,
	onClose,
	onSubmit,
}: RuneExchangeModalProps) {
	const titleId = useId();
	const descriptionId = useId();
	const quantityInputId = useId();
	const validationId = useId();
	const viewState = getRuneExchangeModalViewState({
		quote,
		ledgerStatus,
		ledgerError,
		isSubmitting,
		confirmation,
	});

	const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
		if (event.target === event.currentTarget && !isSubmitting) onClose();
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!quote.canSubmit || viewState.isExchangeLocked) return;
		onSubmit();
	};

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={descriptionId}
			onMouseDown={handleBackdropClick}
			className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 p-4 backdrop-blur-sm"
		>
			<form
				onSubmit={handleSubmit}
				className="modal-landscape-safe relative w-full max-w-lg rounded-xl border border-gold-500/30 bg-obsidian-900 p-5 text-ink-0 sm:p-6"
			>
				<button
					type="button"
					onClick={onClose}
					disabled={isSubmitting}
					aria-label="Close RUNE exchange"
					className="absolute right-3 top-3 grid h-12 w-12 place-items-center rounded-lg border border-obsidian-700 bg-obsidian-900/90 text-ink-300 transition-colors hover:border-gold-500/60 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<X size={18} aria-hidden="true" />
				</button>

				<header className="pr-12">
					<div className="tier-inscription tier-inscription--premium mb-3">RUNE · Pack Exchange</div>
					<h2 id={titleId} className="font-display text-xl font-bold uppercase tracking-[0.14em] text-gold-200">
						{pack.name}
					</h2>
					<p id={descriptionId} className="mt-2 max-w-md text-sm leading-6 text-ink-300">
						{pack.cardCount} cards per pack. {quote.runeCost.toLocaleString()} RUNE each.
					</p>
				</header>

				<div className="mt-5 grid gap-3">
					<section aria-label="RUNE spend" className="rounded-lg border border-obsidian-700/70 bg-obsidian-950/50 p-4">
						<div className="flex items-center justify-between gap-3 text-xs">
							<span className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.18em] text-ink-400">
								<Zap size={14} aria-hidden="true" className="text-gold-300" />
								Spend
							</span>
							<span className="inline-flex items-center gap-2 text-ink-300">
								<Wallet size={14} aria-hidden="true" />
								Balance {runeBalance.toLocaleString()}
							</span>
						</div>
						<div className="mt-3 flex items-end justify-between gap-4">
							<span className="numeric-display numeric-display--lg text-gold-200">
								{quote.totalCost.toLocaleString()}
							</span>
							<span className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold-400">RUNE</span>
						</div>
					</section>

					<div className="flex justify-center" aria-hidden="true">
						<span className="grid h-10 w-10 place-items-center rounded-full border border-gold-500/30 bg-obsidian-950 text-gold-300">
							<ArrowDownUp size={16} />
						</span>
					</div>

					<section aria-label="Pack receive" className="rounded-lg border border-rune-300/30 bg-rune-500/10 p-4">
						<div className="flex items-center justify-between gap-3 text-xs">
							<span className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.18em] text-rune-300">
								<Package size={14} aria-hidden="true" />
								Receive
							</span>
							<span className="text-ink-300">
								Max {quote.maxQuantity.toLocaleString()} {formatPackUnit(quote.maxQuantity)}
							</span>
						</div>
						<div className="mt-3 grid grid-cols-[3rem_1fr_3rem] items-center gap-2">
							<button
								type="button"
								onClick={() => onSetQuantity(Math.max(1, (quote.quantity ?? 1) - 1))}
								disabled={viewState.minusDisabled}
								aria-label="Decrease pack amount"
								className="grid h-12 w-12 place-items-center rounded-lg border border-obsidian-700 bg-obsidian-900 text-ink-200 transition-colors hover:border-gold-500/60 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 disabled:cursor-not-allowed disabled:opacity-45"
							>
								<Minus size={16} aria-hidden="true" />
							</button>
							<div>
								<label htmlFor={quantityInputId} className="sr-only">Packs to exchange</label>
								<input
									id={quantityInputId}
									type="number"
									inputMode="numeric"
									min={1}
									max={quote.maxQuantity > 0 ? quote.maxQuantity : undefined}
									value={quantityInput}
									onChange={(event) => onQuantityInputChange(event.target.value)}
									disabled={viewState.isExchangeLocked}
									aria-invalid={quote.validationMessage ? 'true' : 'false'}
									aria-describedby={validationId}
									className="h-12 w-full rounded-lg border border-obsidian-600 bg-obsidian-950 px-3 text-center font-mono text-2xl font-bold text-ink-0 outline-none transition-colors focus:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 disabled:cursor-not-allowed disabled:opacity-60"
								/>
							</div>
							<button
								type="button"
								onClick={() => onSetQuantity((quote.quantity ?? 1) + 1)}
								disabled={viewState.plusDisabled}
								aria-label="Increase pack amount"
								className="grid h-12 w-12 place-items-center rounded-lg border border-obsidian-700 bg-obsidian-900 text-ink-200 transition-colors hover:border-gold-500/60 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 disabled:cursor-not-allowed disabled:opacity-45"
							>
								<Plus size={16} aria-hidden="true" />
							</button>
						</div>

						<div className="mt-3 grid grid-cols-3 gap-2">
							<button
								type="button"
								onClick={() => onSetQuantity(1)}
								disabled={viewState.isExchangeLocked}
								className="h-11 rounded-lg border border-obsidian-700 bg-obsidian-900 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-300 transition-colors hover:border-gold-500/60 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 disabled:cursor-not-allowed disabled:opacity-45"
							>
								1
							</button>
							<button
								type="button"
								onClick={() => onSetQuantity(viewState.halfQuantity)}
								disabled={!viewState.canUseQuickAmounts}
								className="h-11 rounded-lg border border-obsidian-700 bg-obsidian-900 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-300 transition-colors hover:border-gold-500/60 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 disabled:cursor-not-allowed disabled:opacity-45"
							>
								Half
							</button>
							<button
								type="button"
								onClick={onSetMaxQuantity}
								disabled={!viewState.canUseQuickAmounts}
								className="h-11 rounded-lg border border-gold-500/35 bg-gold-700/20 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-gold-200 transition-colors hover:border-gold-400 hover:text-gold-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 disabled:cursor-not-allowed disabled:opacity-45"
							>
								Max
							</button>
						</div>
					</section>
				</div>

				<div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-obsidian-700/70 bg-obsidian-950/40 p-3 text-sm">
					<div>
						<div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">After</div>
						<div className={viewState.remainingBalanceClassName}>
							{quote.remainingBalance.toLocaleString()} RUNE
						</div>
					</div>
					<div className="text-right">
						<div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Cards</div>
						<div className="mt-1 font-semibold text-ink-100">{quote.receivedCards.toLocaleString()}</div>
					</div>
					<div>
						<div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Used</div>
						<div className="mt-1 font-semibold text-ink-100">
							{quote.accountRedeemed.toLocaleString()} / {quote.accountLimit.toLocaleString()}
						</div>
					</div>
					<div className="text-right">
						<div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Per Op</div>
						<div className="mt-1 font-semibold text-ink-100">{quote.maxByOperation.toLocaleString()} max</div>
					</div>
				</div>

				<div id={validationId} className="mt-3 min-h-5 text-sm" aria-live="polite">
					{viewState.statusMessage && (
						<p className={viewState.statusClassName}>{viewState.statusMessage}</p>
					)}
				</div>

				{viewState.showConfirmation && (
					<section
						role="status"
						aria-live="polite"
						className="mt-4 rounded-lg border border-gold-500/25 bg-gold-700/10 p-4"
					>
						<div className="flex items-start justify-between gap-4">
							<div>
								<div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-400">
									Blockchain confirmation
								</div>
								<p className="mt-1 text-sm leading-6 text-ink-100">
									{confirmation.error ?? confirmation.message}
								</p>
							</div>
							<div className="numeric-display text-lg text-gold-200">
								{confirmation.step}/3
							</div>
						</div>
						<div className="mt-3 grid grid-cols-3 gap-2" aria-hidden="true">
							{[1, 2, 3].map((step) => (
								<span
									key={step}
									className={`h-1.5 rounded-full ${
										confirmation.step >= step
											? 'bg-gold-300'
											: 'bg-obsidian-700'
									}`}
								/>
							))}
						</div>
						{confirmation.trxId && (
							<p className="mt-3 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400">
								TX {confirmation.trxId}
							</p>
						)}
					</section>
				)}

				<div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
					<button
						type="submit"
						disabled={!quote.canSubmit || viewState.isExchangeLocked}
						className="btn-runic btn-runic--gold min-h-12 w-full"
					>
						<span className="btn-runic-stud" aria-hidden />
						{viewState.submitLabel}
						<span className="btn-runic-stud" aria-hidden />
					</button>
					<button
						type="button"
						onClick={onClose}
						disabled={isSubmitting}
						className="btn-runic btn-runic--obsidian min-h-12 w-full sm:w-auto"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	);
}

function getRuneExchangeModalViewState({
	quote,
	ledgerStatus,
	ledgerError,
	isSubmitting,
	confirmation,
}: Pick<RuneExchangeModalProps, 'quote' | 'ledgerStatus' | 'ledgerError' | 'isSubmitting' | 'confirmation'>): RuneExchangeModalViewState {
	const isExchangeLocked = isSubmitting || isConfirmationLocked(confirmation.stage);
	const canUseQuickAmounts = quote.maxQuantity > 0 && !isExchangeLocked;
	const showConfirmation = confirmation.stage !== 'idle';

	return {
		halfQuantity: Math.max(1, Math.floor(quote.maxQuantity / 2)),
		canUseQuickAmounts,
		submitLabel: getSubmitLabel(quote, isSubmitting, confirmation),
		minusDisabled: isExchangeLocked || (quote.quantity ?? 1) <= 1,
		plusDisabled: isExchangeLocked || (quote.quantity ?? 0) >= quote.maxQuantity,
		remainingBalanceClassName: quote.remainingBalance < 0
			? 'mt-1 font-semibold text-ember-300'
			: 'mt-1 font-semibold text-ink-100',
		statusMessage: showConfirmation ? null : getStatusMessage(quote, ledgerStatus, ledgerError),
		statusClassName: quote.validationMessage ? 'text-ember-300' : 'text-ink-300',
		isExchangeLocked,
		showConfirmation,
	};
}

function getSubmitLabel(
	quote: RunePackExchangeQuote,
	isSubmitting: boolean,
	confirmation: RuneExchangeConfirmation,
): string {
	if (isSubmitting) return 'Confirming...';
	if (confirmation.stage === 'indexing' || confirmation.stage === 'broadcasted') return 'Validating...';
	if (confirmation.stage === 'confirmed') return 'Confirmed';
	return quote.quantity === 1 ? 'Exchange Pack' : 'Exchange Packs';
}

function isConfirmationLocked(stage: RuneExchangeConfirmation['stage']): boolean {
	return stage === 'signing'
		|| stage === 'broadcasted'
		|| stage === 'indexing'
		|| stage === 'confirmed';
}

function getStatusMessage(
	quote: RunePackExchangeQuote,
	ledgerStatus: RuneExchangeLedgerStatus,
	ledgerError: string | null,
): string | null {
	if (quote.validationMessage) return quote.validationMessage;
	if (ledgerStatus === 'loading') return 'Checking limits...';
	if (ledgerStatus === 'unavailable') return ledgerError ?? quote.warnings[0] ?? null;
	return quote.warnings[0] ?? null;
}
