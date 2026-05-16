import {
	MAX_HBD_PACK_PURCHASE_QUANTITY,
	formatHbdPrice,
	getHbdPackPurchaseQuote,
	type HbdPackPurchaseQuote,
} from '@shared/protocol-core';
import type { PackType } from '../packs/types';

export interface HbdPackPurchaseQuoteView {
	packKey: string;
	quantity: number | null;
	unitPriceThousandths: number;
	totalPriceThousandths: number;
	unitPriceLabel: string;
	totalPriceLabel: string;
	maxQuantity: number;
	receivedCards: number;
	canSubmit: boolean;
	validationMessage: string | null;
}

export function parseHbdPurchaseQuantityInput(input: string): number | null {
	const normalized = input.trim();
	if (!/^\d+$/.test(normalized)) return null;

	const parsed = Number(normalized);
	if (!Number.isSafeInteger(parsed) || parsed < 1) return null;

	return parsed;
}

export function buildHbdPackPurchaseQuote(
	pack: PackType,
	quantity: number | null,
): HbdPackPurchaseQuoteView {
	const requestedQuantity = quantity ?? 0;
	const protocolQuote = quantity === null
		? null
		: getHbdPackPurchaseQuote({ packType: pack.key, quantity });
	const unitPriceThousandths = pack.hbdPriceThousandths ?? protocolQuote?.unitPriceThousandths ?? 0;
	const totalPriceThousandths = unitPriceThousandths * Math.max(0, requestedQuantity);
	const validationMessage = getValidationMessage({
		pack,
		quantity,
		protocolQuote,
	});

	return {
		packKey: pack.key,
		quantity,
		unitPriceThousandths,
		totalPriceThousandths,
		unitPriceLabel: unitPriceThousandths > 0 ? formatHbdPrice(unitPriceThousandths) : 'Unavailable',
		totalPriceLabel: totalPriceThousandths > 0 ? formatHbdPrice(totalPriceThousandths) : 'Unavailable',
		maxQuantity: MAX_HBD_PACK_PURCHASE_QUANTITY,
		receivedCards: pack.cardCount * Math.max(0, requestedQuantity),
		canSubmit: validationMessage === null,
		validationMessage,
	};
}

function getValidationMessage(input: {
	pack: PackType;
	quantity: number | null;
	protocolQuote: HbdPackPurchaseQuote | null;
}): string | null {
	if (input.pack.hbdPriceThousandths === null) return 'Pack unavailable for HBD.';
	if (input.quantity === null) return 'Enter a pack amount.';
	if (input.quantity < 1) return 'Enter at least 1 pack.';
	if (input.quantity > MAX_HBD_PACK_PURCHASE_QUANTITY) {
		return `Max ${MAX_HBD_PACK_PURCHASE_QUANTITY} packs per purchase.`;
	}
	if (!input.protocolQuote) return 'Pack unavailable for HBD.';
	return null;
}
