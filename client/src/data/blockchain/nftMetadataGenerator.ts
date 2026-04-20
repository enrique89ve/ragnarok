import type { NFTMetadata, NFTAttribute, MintInfo } from './types';
import { hashNFTMetadata } from './hashUtils';
import { getCardDataProvider } from './ICardDataProvider';
import { NFT_ART_BASE_URL, EXTERNAL_URL_BASE } from './hiveConfig';
import { getTransactionUrl, getBlockUrl } from './explorerLinks';

interface CardDefinition {
	id: number;
	name: string;
	type: string;
	rarity: string;
	heroClass?: string;
	class?: string;
	attack?: number;
	health?: number;
	manaCost?: number;
	keywords?: string[];
	description?: string;
	race?: string;
	set?: string;
	flavorText?: string;
	collectible?: boolean;
	durability?: number;
	armor?: number;
}

const TEMPLATE_VERSION = 2;

const COLLECTION_NAME = 'Ragnarok Cards';
const COLLECTION_FAMILY = 'Genesis';

function titleCase(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function buildAttributes(cardDef: CardDefinition, mintInfo: MintInfo): NFTAttribute[] {
	const attrs: NFTAttribute[] = [];

	attrs.push({ trait_type: 'Rarity', value: titleCase(cardDef.rarity) });
	attrs.push({ trait_type: 'Type', value: titleCase(cardDef.type) });
	attrs.push({ trait_type: 'Class', value: titleCase(cardDef.heroClass || cardDef.class || 'neutral') });

	if (cardDef.race && cardDef.race !== 'none') {
		attrs.push({ trait_type: 'Race', value: titleCase(cardDef.race) });
	}

	if (cardDef.set) {
		attrs.push({ trait_type: 'Set', value: titleCase(cardDef.set) });
	}

	attrs.push({ trait_type: 'Edition', value: titleCase(mintInfo.edition) });

	if (mintInfo.foil !== 'standard') {
		attrs.push({ trait_type: 'Foil', value: titleCase(mintInfo.foil) });
	}

	if (cardDef.manaCost != null) {
		attrs.push({ trait_type: 'Mana Cost', value: cardDef.manaCost, display_type: 'number' });
	}
	if (cardDef.attack != null) {
		attrs.push({ trait_type: 'Attack', value: cardDef.attack, display_type: 'number' });
	}
	if (cardDef.health != null) {
		attrs.push({ trait_type: 'Health', value: cardDef.health, display_type: 'number' });
	}
	if (cardDef.durability != null) {
		attrs.push({ trait_type: 'Durability', value: cardDef.durability, display_type: 'number' });
	}
	if (cardDef.armor != null) {
		attrs.push({ trait_type: 'Armor', value: cardDef.armor, display_type: 'number' });
	}

	for (const kw of cardDef.keywords ?? []) {
		attrs.push({ trait_type: 'Keyword', value: titleCase(kw) });
	}

	return attrs;
}

export interface MintProvenance {
	signer: string;
	trxId: string;
	blockNum: number;
	timestamp: number;
}

export async function generateNFTMetadata(
	cardDef: CardDefinition,
	mintInfo: MintInfo,
	provenance?: MintProvenance,
): Promise<NFTMetadata> {
	const heroClass = cardDef.heroClass || cardDef.class || 'neutral';
	const localPath = getCardDataProvider().getCardArtPath(cardDef.name, cardDef.id);
	const image = localPath ? `${NFT_ART_BASE_URL}${localPath}` : '';

	const metadataWithoutHash: Omit<NFTMetadata, 'hash'> = {
		uid: mintInfo.uid,
		cardId: cardDef.id,
		templateVersion: TEMPLATE_VERSION,
		name: cardDef.name,
		type: cardDef.type,
		rarity: cardDef.rarity,
		heroClass,
		stats: {
			attack: cardDef.attack,
			health: cardDef.health,
			manaCost: cardDef.manaCost,
		},
		keywords: cardDef.keywords || [],
		description: cardDef.description || '',
		edition: mintInfo.edition,
		foil: mintInfo.foil,
		mintNumber: mintInfo.mintNumber,
		maxSupply: mintInfo.maxSupply,
		mintedAt: provenance?.timestamp ?? Date.now(),
		mintedBy: mintInfo.mintedBy,
		image,
		artPath: localPath || undefined,
		externalUrl: `${EXTERNAL_URL_BASE}/${cardDef.id}`,
		race: cardDef.race || 'none',
		set: cardDef.set || 'core',
		flavorText: cardDef.flavorText || '',
		collectible: cardDef.collectible !== false,
		collection: {
			name: COLLECTION_NAME,
			family: COLLECTION_FAMILY,
		},
		attributes: buildAttributes(cardDef, mintInfo),
		provenance: provenance ? {
			signer: provenance.signer,
			trxId: provenance.trxId,
			blockNum: provenance.blockNum,
			timestamp: provenance.timestamp,
			txUrl: getTransactionUrl(provenance.trxId),
			blockUrl: getBlockUrl(provenance.blockNum),
		} : undefined,
	};

	const hash = await hashNFTMetadata(metadataWithoutHash);

	return { ...metadataWithoutHash, hash };
}
