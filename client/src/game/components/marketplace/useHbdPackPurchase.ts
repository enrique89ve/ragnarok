import { useCallback, useMemo, useState } from 'react';
import { getNFTBridge, type BroadcastResult } from '../../nft';
import type { PackType } from '../packs/types';
import {
	buildHbdPackPurchaseQuote,
	parseHbdPurchaseQuantityInput,
	type HbdPackPurchaseQuoteView,
} from './hbdPackPurchase';

export type HbdPurchaseConfirmationStage =
	| 'idle'
	| 'signing'
	| 'broadcasted'
	| 'indexing'
	| 'confirmed'
	| 'failed';

export interface HbdPurchaseConfirmation {
	stage: HbdPurchaseConfirmationStage;
	step: 0 | 1 | 2 | 3;
	message: string;
	trxId: string | null;
	error: string | null;
}

export interface UseHbdPackPurchaseResult {
	selectedPack: PackType | null;
	quantityInput: string;
	quantity: number | null;
	quote: HbdPackPurchaseQuoteView | null;
	isSubmitting: boolean;
	confirmation: HbdPurchaseConfirmation;
	openPurchase: (pack: PackType) => void;
	closePurchase: () => void;
	setQuantityInput: (value: string) => void;
	setQuantity: (value: number) => void;
	markIndexerValidation: (trxId: string) => void;
	markIndexed: (trxId: string) => void;
	markConfirmed: (trxId: string) => void;
	markFailed: (errorMessage: string, trxId?: string) => void;
	submitPurchase: () => Promise<BroadcastResult>;
}

const IDLE_CONFIRMATION: HbdPurchaseConfirmation = {
	stage: 'idle',
	step: 0,
	message: '',
	trxId: null,
	error: null,
};

export function useHbdPackPurchase(): UseHbdPackPurchaseResult {
	const [selectedPack, setSelectedPack] = useState<PackType | null>(null);
	const [quantityInput, setQuantityInput] = useState('1');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [confirmation, setConfirmation] = useState<HbdPurchaseConfirmation>(IDLE_CONFIRMATION);

	const quantity = useMemo(
		() => parseHbdPurchaseQuantityInput(quantityInput),
		[quantityInput],
	);

	const quote = useMemo(() => {
		if (!selectedPack) return null;
		return buildHbdPackPurchaseQuote(selectedPack, quantity);
	}, [quantity, selectedPack]);

	const openPurchase = useCallback((pack: PackType) => {
		setSelectedPack(pack);
		setQuantityInput('1');
		setConfirmation(IDLE_CONFIRMATION);
	}, []);

	const closePurchase = useCallback(() => {
		setSelectedPack(null);
		setQuantityInput('1');
		setConfirmation(IDLE_CONFIRMATION);
	}, []);

	const setQuantity = useCallback((value: number) => {
		const normalized = Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
		setQuantityInput(String(normalized));
	}, []);

	const markIndexerValidation = useCallback((trxId: string) => {
		setConfirmation({
			stage: 'indexing',
			step: 1,
			message: 'Waiting confirmation 1 of 3. Indexer is validating HBD payment and pack liquidity.',
			trxId,
			error: null,
		});
	}, []);

	const markIndexed = useCallback((trxId: string) => {
		setConfirmation({
			stage: 'indexing',
			step: 2,
			message: 'Confirmation 2 of 3. HBD payment and sealed pack mint are indexed.',
			trxId,
			error: null,
		});
	}, []);

	const markConfirmed = useCallback((trxId: string) => {
		setConfirmation({
			stage: 'confirmed',
			step: 3,
			message: 'Confirmation 3 of 3. Pack purchase accepted.',
			trxId,
			error: null,
		});
	}, []);

	const markFailed = useCallback((errorMessage: string, trxId?: string) => {
		setConfirmation({
			stage: 'failed',
			step: 0,
			message: 'Purchase needs attention.',
			trxId: trxId ?? null,
			error: errorMessage,
		});
	}, []);

	const submitPurchase = useCallback(async (): Promise<BroadcastResult> => {
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

		setIsSubmitting(true);
		setConfirmation({
			stage: 'signing',
			step: 0,
			message: 'Waiting for wallet signature.',
			trxId: null,
			error: null,
		});

		try {
			const result = await getNFTBridge().purchasePackHbd(
				selectedPack.key,
				quote.quantity,
				quote.totalPriceThousandths,
			);
			if (result.success && result.trxId) {
				setConfirmation({
					stage: 'broadcasted',
					step: 1,
					message: 'Waiting confirmation 1 of 3. HBD payment is on-chain.',
					trxId: result.trxId,
					error: null,
				});
			} else if (!result.success) {
				setConfirmation({
					stage: 'failed',
					step: 0,
					message: 'Wallet did not broadcast the purchase.',
					trxId: result.trxId ?? null,
					error: result.error ?? 'HBD pack purchase failed.',
				});
			}
			return result;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'HBD pack purchase failed.';
			setConfirmation({
				stage: 'failed',
				step: 0,
				message: 'Wallet did not broadcast the purchase.',
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
	}, [quote, selectedPack]);

	return {
		selectedPack,
		quantityInput,
		quantity,
		quote,
		isSubmitting,
		confirmation,
		openPurchase,
		closePurchase,
		setQuantityInput,
		setQuantity,
		markIndexerValidation,
		markIndexed,
		markConfirmed,
		markFailed,
		submitPurchase,
	};
}
