import { Minus, Plus, Wallet, X, Package, CreditCard } from 'lucide-react';
import type { FormEvent, MouseEvent } from 'react';
import { useId } from 'react';
import type { PackType } from '../packs/types';
import type { HbdPackPurchaseQuoteView } from './hbdPackPurchase';
import type { HbdPurchaseConfirmation } from './useHbdPackPurchase';

export interface HbdPurchaseModalProps {
	pack: PackType;
	quote: HbdPackPurchaseQuoteView;
	quantityInput: string;
	isSubmitting: boolean;
	confirmation: HbdPurchaseConfirmation;
	onQuantityInputChange: (value: string) => void;
	onSetQuantity: (quantity: number) => void;
	onClose: () => void;
	onSubmit: () => void;
}

export function HbdPurchaseModal({
	pack,
	quote,
	quantityInput,
	isSubmitting,
	confirmation,
	onQuantityInputChange,
	onSetQuantity,
	onClose,
	onSubmit,
}: HbdPurchaseModalProps) {
	const titleId = useId();
	const descriptionId = useId();
	const quantityInputId = useId();
	const validationId = useId();
	const isLocked = isSubmitting || confirmation.stage === 'indexing' || confirmation.stage === 'confirmed';
	const minusDisabled = isLocked || (quote.quantity ?? 1) <= 1;
	const plusDisabled = isLocked || (quote.quantity ?? 1) >= quote.maxQuantity;
	const showConfirmation = confirmation.stage !== 'idle';

	const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
		if (event.target === event.currentTarget && !isSubmitting) onClose();
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!quote.canSubmit || isLocked) return;
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
					aria-label="Close HBD purchase"
					className="absolute right-3 top-3 grid h-12 w-12 place-items-center rounded-lg border border-obsidian-700 bg-obsidian-900/90 text-ink-300 transition-colors hover:border-gold-500/60 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<X size={18} aria-hidden="true" />
				</button>

				<header className="pr-12">
					<div className="tier-inscription tier-inscription--premium mb-3">HBD · Pack Purchase</div>
					<h2 id={titleId} className="font-display text-xl font-bold uppercase tracking-[0.14em] text-gold-200">
						{pack.name}
					</h2>
					<p id={descriptionId} className="mt-2 max-w-md text-sm leading-6 text-ink-300">
						{pack.cardCount} cards per pack. {quote.unitPriceLabel} each.
					</p>
				</header>

				<div className="mt-5 grid gap-3">
					<section aria-label="HBD payment" className="rounded-lg border border-obsidian-700/70 bg-obsidian-950/50 p-4">
						<div className="flex items-center justify-between gap-3 text-xs">
							<span className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.18em] text-ink-400">
								<CreditCard size={14} aria-hidden="true" className="text-gold-300" />
								Pay
							</span>
							<span className="inline-flex items-center gap-2 text-ink-300">
								<Wallet size={14} aria-hidden="true" />
								Hive Keychain
							</span>
						</div>
						<div className="mt-3 flex items-end justify-between gap-4">
							<span className="numeric-display numeric-display--lg text-gold-200">
								{quote.totalPriceLabel.replace(' HBD', '')}
							</span>
							<span className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold-400">HBD</span>
						</div>
					</section>

					<section aria-label="Pack receive" className="rounded-lg border border-rune-300/30 bg-rune-500/10 p-4">
						<div className="flex items-center justify-between gap-3 text-xs">
							<span className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.18em] text-rune-300">
								<Package size={14} aria-hidden="true" />
								Receive
							</span>
							<span className="text-ink-300">
								Max {quote.maxQuantity.toLocaleString()} packs
							</span>
						</div>
						<div className="mt-3 grid grid-cols-[3rem_1fr_3rem] items-center gap-2">
							<button
								type="button"
								onClick={() => onSetQuantity(Math.max(1, (quote.quantity ?? 1) - 1))}
								disabled={minusDisabled}
								aria-label="Decrease pack amount"
								className="grid h-12 w-12 place-items-center rounded-lg border border-obsidian-700 bg-obsidian-900 text-ink-200 transition-colors hover:border-gold-500/60 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 disabled:cursor-not-allowed disabled:opacity-45"
							>
								<Minus size={16} aria-hidden="true" />
							</button>
							<div>
								<label htmlFor={quantityInputId} className="sr-only">Packs to buy</label>
								<input
									id={quantityInputId}
									type="number"
									inputMode="numeric"
									min={1}
									max={quote.maxQuantity}
									value={quantityInput}
									onChange={(event) => onQuantityInputChange(event.target.value)}
									disabled={isLocked}
									aria-invalid={quote.validationMessage ? 'true' : 'false'}
									aria-describedby={validationId}
									className="h-12 w-full rounded-lg border border-obsidian-600 bg-obsidian-950 px-3 text-center font-mono text-2xl font-bold text-ink-0 outline-none transition-colors focus:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 disabled:cursor-not-allowed disabled:opacity-60"
								/>
							</div>
							<button
								type="button"
								onClick={() => onSetQuantity((quote.quantity ?? 1) + 1)}
								disabled={plusDisabled}
								aria-label="Increase pack amount"
								className="grid h-12 w-12 place-items-center rounded-lg border border-obsidian-700 bg-obsidian-900 text-ink-200 transition-colors hover:border-gold-500/60 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300 disabled:cursor-not-allowed disabled:opacity-45"
							>
								<Plus size={16} aria-hidden="true" />
							</button>
						</div>
					</section>
				</div>

				<div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-obsidian-700/70 bg-obsidian-950/40 p-3 text-sm">
					<div>
						<div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Unit</div>
						<div className="mt-1 font-semibold text-ink-100">{quote.unitPriceLabel}</div>
					</div>
					<div className="text-right">
						<div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Cards</div>
						<div className="mt-1 font-semibold text-ink-100">{quote.receivedCards.toLocaleString()}</div>
					</div>
				</div>

				<div id={validationId} className="mt-3 min-h-5 text-sm" aria-live="polite">
					{quote.validationMessage && <p className="text-ember-300">{quote.validationMessage}</p>}
				</div>

				{showConfirmation && (
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
					</section>
				)}

				<div className="mt-5 flex items-center justify-end gap-3">
					<button
						type="button"
						onClick={onClose}
						disabled={isSubmitting}
						className="h-12 rounded-lg border border-obsidian-700 px-4 font-mono text-xs uppercase tracking-[0.18em] text-ink-300 transition-colors hover:border-ink-400 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!quote.canSubmit || isLocked}
						className="btn-runic btn-runic--gold min-h-12 px-5 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<span className="btn-runic-stud" aria-hidden />
						{isSubmitting ? 'Confirming...' : `Buy · ${quote.totalPriceLabel}`}
						<span className="btn-runic-stud" aria-hidden />
					</button>
				</div>
			</form>
		</div>
	);
}
