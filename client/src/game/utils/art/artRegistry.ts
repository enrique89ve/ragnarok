/**
 * Art Registry (NFT Art Protocol DNA)
 * 
 * This module acts as the Source of Truth for all NFT assets.
 * It provides a standardized way to access character DNA, versions, and collections.
 */

import { ArtCard, ArtMetadata } from './types';
import { ArtMetadataSchema } from './schema';
import { assetPath } from '../assetPath';

// Path to the canonical metadata file
export const NFT_METADATA_PATH = assetPath('/art/nfts/metadata.json');

// Memory cache for the registry
let registryCache: ArtMetadata | null = null;
let characterMap: Map<string, ArtCard[]> = new Map();
let mainArtMap: Map<string, ArtCard> = new Map();
let idMap: Map<string, ArtCard> = new Map();

/**
 * Load the registry from the metadata file
 */
export async function loadArtRegistry(): Promise<ArtMetadata> {
  if (registryCache) return registryCache;

  try {
    const response = await fetch(NFT_METADATA_PATH);
    if (!response.ok) throw new Error('Failed to load Art Registry');

    const raw = await response.json();
    const parsed = ArtMetadataSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues.slice(0, 5).map(i => `${i.path.join('.')}: ${i.message}`);
      throw new Error(`Art metadata schema validation failed:\n  ${issues.join('\n  ')}`);
    }
    const metadata = parsed.data as ArtMetadata;
    indexRegistry(metadata);
    registryCache = metadata;
    return metadata;
  } catch (error) {
    console.error('[ArtRegistry] Error loading registry:', error);
    throw error;
  }
}

/**
 * Index the registry for O(1) lookups
 */
function indexRegistry(metadata: ArtMetadata) {
  characterMap.clear();
  mainArtMap.clear();
  idMap.clear();

  metadata.cards.forEach(card => {
    // Index by ID
    idMap.set(card.id, card);

    // Index by Character
    const existing = characterMap.get(card.character) || [];
    existing.push(card);
    characterMap.set(card.character, existing);

    // Index Main Art
    if (card.mainArt) {
      mainArtMap.set(card.character, card);
    }
  });

  // Fallback: If no mainArt defined for a character, pick the first one
  characterMap.forEach((cards, char) => {
    if (!mainArtMap.has(char) && cards.length > 0) {
      mainArtMap.set(char, cards[0]);
    }
  });
}

/**
 * Get the "Main" NFT for a character
 */
export function getMainNFT(character: string): ArtCard | undefined {
  return mainArtMap.get(character.toLowerCase());
}

/**
 * Get all NFT variants for a character
 */
export function getNFTVariants(character: string): ArtCard[] {
  return characterMap.get(character.toLowerCase()) || [];
}

/**
 * Get an NFT by its unique Hex ID
 */
export function getNFTById(id: string): ArtCard | undefined {
  return idMap.get(id);
}

/**
 * Get all NFTs in a specific collection
 */
export function getCollection(collectionName: string): ArtCard[] {
  if (!registryCache) return [];
  return registryCache.cards.filter(card => card.collection === collectionName);
}

/**
 * Get the total number of characters in the registry
 */
export function getCharacterCount(): number {
  return characterMap.size;
}

/**
 * Get all character names registered in the DNA
 */
export function getRegisteredCharacters(): string[] {
  return Array.from(characterMap.keys()).sort();
}
