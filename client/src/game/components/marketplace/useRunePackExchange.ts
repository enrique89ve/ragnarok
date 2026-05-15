import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchRuneLedger, type RuneLedgerEntryView } from '../../../data/runeAPI';
import { getNFTBridge, type BroadcastResult } from '../../nft';
import type { PackType } from '../packs/types';
import {
	buildRunePackExchangeQuote,
	countRedeemedRuneExchangePacks,
	parseRuneExchangeQuantityInput,
	type RedeemedRuneExchangeQuantities,
	type RunePackExchangeQuote,
} from './runePackExchange';

export type RuneExchangeLedgerStatus = 'idle' | 'loading' | 'ready' | 'unavailable';
export type RuneExchangeConfirmationStage =
	| 'idle'
	| 'signing'
	| 'broadcasted'
	| 'indexing'
	| 'confirmed'
	| 'failed';

export interface RuneExchangeConfirmation {
	stage: RuneExchangeConfirmationStage;
	step: 0 | 1 | 2 | 3;
	message: string;
	trxId: string | null;
	error: string | null;
}

export interface UseRunePackExchangeOptions {
	hiveUsername: string | null;
	runeBalance: number;
}

export interface UseRunePackExchangeResult {
	selectedPack: PackType | null;
	quantityInput: string;
	quantity: number | null;
	quote: RunePackExchangeQuote | null;
	redeemedByPack: RedeemedRuneExchangeQuantities;
	ledgerStatus: RuneExchangeLedgerStatus;
	ledgerError: string | null;
	isSubmitting: boolean;
	confirmation: RuneExchangeConfirmation;
	openExchange: (pack: PackType) => void;
	closeExchange: () => void;
	setQuantityInput: (value: string) => void;
	setQuantity: (value: number) => void;
	setMaxQuantity: () => void;
	markIndexerValidation: (trxId: string) => void;
	markIndexed: (trxId: string) => void;
	markConfirmed: (trxId: string) => void;
	markFailed: (errorMessage: string, trxId?: string) => void;
	refreshRedeemed: (signal?: AbortSignal) => Promise<void>;
	submitExchange: () => Promise<BroadcastResult>;
}

const LEDGER_PAGE_SIZE = 200;
const IDLE_CONFIRMATION: RuneExchangeConfirmation = {
	stage: 'idle',
	step: 0,
	message: '',
	trxId: null,
	error: null,
};

export function useRunePackExchange({
	hiveUsername,
	runeBalance,
}: UseRunePackExchangeOptions): UseRunePackExchangeResult {
	const [selectedPack, setSelectedPack] = useState<PackType | null>(null);
	const [quantityInput, setQuantityInput] = useState('1');
	const [redeemedByPack, setRedeemedByPack] = useState<RedeemedRuneExchangeQuantities>({});
	const [ledgerStatus, setLedgerStatus] = useState<RuneExchangeLedgerStatus>('idle');
	const [ledgerError, setLedgerError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [confirmation, setConfirmation] = useState<RuneExchangeConfirmation>(IDLE_CONFIRMATION);

	const quantity = useMemo(
		() => parseRuneExchangeQuantityInput(quantityInput),
		[quantityInput],
	);

	const quote = useMemo(() => {
		if (!selectedPack) return null;

		return buildRunePackExchangeQuote({
			pack: selectedPack,
			quantity,
			runeBalance,
			redeemedQuantity: redeemedByPack[selectedPack.key] ?? 0,
			ledgerAvailable: ledgerStatus === 'ready',
		});
	}, [ledgerStatus, quantity, redeemedByPack, runeBalance, selectedPack]);

	const refreshRedeemed = useCallback(async (signal?: AbortSignal) => {
		if (!hiveUsername) {
			setRedeemedByPack({});
			setLedgerStatus('idle');
			setLedgerError(null);
			return;
		}

		setLedgerStatus('loading');
		setLedgerError(null);

		try {
			const redeemed = await fetchRedeemedRuneExchangeQuantities(hiveUsername, signal);
			if (signal?.aborted) return;

			setRedeemedByPack(redeemed);
			setLedgerStatus('ready');
		} catch (error) {
			if (isAbortError(error)) return;

			setRedeemedByPack({});
			setLedgerStatus('unavailable');
			setLedgerError(error instanceof Error ? error.message : 'RUNE history unavailable.');
		}
	}, [hiveUsername]);

	useEffect(() => {
		const controller = new AbortController();
		void refreshRedeemed(controller.signal);

		return () => controller.abort();
	}, [refreshRedeemed]);

	const openExchange = useCallback((pack: PackType) => {
		setSelectedPack(pack);
		setQuantityInput('1');
		setConfirmation(IDLE_CONFIRMATION);
	}, []);

	const closeExchange = useCallback(() => {
		setSelectedPack(null);
		setQuantityInput('1');
		setConfirmation(IDLE_CONFIRMATION);
	}, []);

	const setQuantity = useCallback((value: number) => {
		const normalized = Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
		setQuantityInput(String(normalized));
	}, []);

	const setMaxQuantity = useCallback(() => {
		setQuantity(quote && quote.maxQuantity > 0 ? quote.maxQuantity : 1);
	}, [quote, setQuantity]);

	const markIndexerValidation = useCallback((trxId: string) => {
		setConfirmation({
			stage: 'indexing',
			step: 1,
			message: 'Waiting confirmation 1 of 3. Indexer is validating balance and pack liquidity.',
			trxId,
			error: null,
		});
	}, []);

	const markIndexed = useCallback((trxId: string) => {
		setConfirmation({
			stage: 'indexing',
			step: 2,
			message: 'Confirmation 2 of 3. RUNE debit and pack mint are indexed.',
			trxId,
			error: null,
		});
	}, []);

	const markConfirmed = useCallback((trxId: string) => {
		setConfirmation({
			stage: 'confirmed',
			step: 3,
			message: 'Confirmation 3 of 3. Pack exchange accepted.',
			trxId,
			error: null,
		});
	}, []);

	const markFailed = useCallback((errorMessage: string, trxId?: string) => {
		setConfirmation({
			stage: 'failed',
			step: 0,
			message: 'Exchange needs attention.',
			trxId: trxId ?? null,
			error: errorMessage,
		});
	}, []);

	const submitExchange = useCallback(async (): Promise<BroadcastResult> => {
		if (!hiveUsername) {
			setConfirmation({
				stage: 'failed',
				step: 0,
				message: 'Connect Hive Keychain first.',
				trxId: null,
				error: 'Connect Hive Keychain first.',
			});
			return { success: false, error: 'Connect Hive Keychain first.' };
		}

		if (!selectedPack || !quote || !quote.canSubmit || quote.quantity === null) {
			const errorMessage = quote?.validationMessage ?? 'Choose a pack amount.';
			setConfirmation({
				stage: 'failed',
				step: 0,
				message: errorMessage,
				trxId: null,
				error: errorMessage,
			});
			return { success: false, error: errorMessage };
		}

		const packKey = selectedPack.key;
		const submittedQuantity = quote.quantity;

		setIsSubmitting(true);
		setConfirmation({
			stage: 'signing',
			step: 0,
			message: 'Waiting for wallet signature.',
			trxId: null,
			error: null,
		});
		try {
			const result = await getNFTBridge().runeExchange(packKey, submittedQuantity);
			if (result.success && result.trxId) {
				setConfirmation({
					stage: 'broadcasted',
					step: 1,
					message: 'Waiting confirmation 1 of 3. Custom JSON is on-chain.',
					trxId: result.trxId,
					error: null,
				});
				setRedeemedByPack((current) => ({
					...current,
					[packKey]: (current[packKey] ?? 0) + submittedQuantity,
				}));
			} else if (!result.success) {
				setConfirmation({
					stage: 'failed',
					step: 0,
					message: 'Wallet did not broadcast the exchange.',
					trxId: result.trxId ?? null,
					error: result.error ?? 'RUNE exchange failed.',
				});
			}
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'RUNE exchange failed.';
			setConfirmation({
				stage: 'failed',
				step: 0,
				message: 'Wallet did not broadcast the exchange.',
				trxId: null,
				error: errorMessage,
			});
			return {
				success: false,
				error: errorMessage,
			};
		} finally {
			setIsSubmitting(false);
		}
	}, [hiveUsername, quote, selectedPack]);

	return {
		selectedPack,
		quantityInput,
		quantity,
		quote,
		redeemedByPack,
		ledgerStatus,
		ledgerError,
		isSubmitting,
		confirmation,
		openExchange,
		closeExchange,
		setQuantityInput,
		setQuantity,
		setMaxQuantity,
		markIndexerValidation,
		markIndexed,
		markConfirmed,
		markFailed,
		refreshRedeemed,
		submitExchange,
	};
}

async function fetchRedeemedRuneExchangeQuantities(
	account: string,
	signal?: AbortSignal,
): Promise<RedeemedRuneExchangeQuantities> {
	const entries: RuneLedgerEntryView[] = [];
	let offset = 0;
	let total = 0;

	do {
		const page = await fetchRuneLedger({
			account,
			direction: 'debit',
			sourceType: 'rune_exchange',
			limit: LEDGER_PAGE_SIZE,
			offset,
		}, signal);

		entries.push(...page.entries);
		total = page.total;
		offset += page.entries.length;
	} while (entries.length < total && offset > 0);

	return countRedeemedRuneExchangePacks(entries);
}

function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'AbortError';
}
