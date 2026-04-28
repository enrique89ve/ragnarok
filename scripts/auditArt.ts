#!/usr/bin/env npx tsx
/**
 * Art audit & sophisticated search.
 *
 * Cross-references the four layers of art truth and reports drift:
 *   1. cardRegistry           — gameplay definitions (TS)
 *   2. ART_REGISTRY            — operational map cardId → file path
 *   3. genesis/starter manifests — derived JSON (gen:collections)
 *   4. /art/nfts/*.webp         — physical files
 *
 * Plus an external sweep over batch exports under
 * `/mnt/c/Users/Admin/Documents/ragartdev/all_arts/` for fuzzy matching
 * orphaned cards to art that already exists outside the project.
 *
 * Run:
 *   npm run audit:art                        # full audit, human report
 *   npm run audit:art -- --json              # machine-readable issues
 *   npm run audit:art -- --search "Theseus"  # search mode (no audit)
 *   npm run audit:art -- --strict            # exit 1 on any error
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { cardRegistry } from '../client/src/game/data/cardRegistry';
import { ART_REGISTRY } from '../client/src/game/utils/art/artMapping';
import { ALL_NORSE_HEROES } from '../client/src/game/data/norseHeroes';
import { NORSE_KINGS } from '../client/src/game/data/norseKings';
import { tryAdaptRarity, type Rarity } from '../shared/schemas/rarity';
import {
	CHARTER_HEROES_TOTAL,
	CHARTER_KINGS_TOTAL,
	CHARTER_SEEDS_TOTAL,
	CHARTER_NFTS_TOTAL,
	computeCharterDelta,
	isCharterClean,
	type CharterDelta,
} from '../shared/schemas/genesisCharter';

// ── Constants ──────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const ART_DIR = path.join(REPO_ROOT, 'client', 'public', 'art', 'nfts');
const DATA_DIR = path.join(REPO_ROOT, 'client', 'public', 'data');
const EXTERNAL_ROOT = '/mnt/c/Users/Admin/Documents/ragartdev/all_arts';
const PENDING_ART_PATH = path.join(path.dirname(__filename), 'pending-art.json');

const ASSET_PATH_RE = /\/art\/nfts\/([0-9a-f]{4}-[0-9a-z]{8})\.webp$/;
const ASSET_FILENAME_RE = /^([0-9a-f]{4}-[0-9a-z]{8})\.(webp|png)$/;

const KNOWN_EXPORTS: ReadonlyArray<string> = [
	'Proyecto-0c1a8619/ragnarok-art-export.json',
	'ragnarok-art/ragnarok-art-export.json',
	'ragnarok-art-35/ragnarok-art-export.json',
	'ragnarok-art-691/ragnarok-art-cards.json',
	'arte 14-3/ragnarok-art/ragnarok-art-export.json',
];

// ── Types ──────────────────────────────────────────────────────────────────

type Severity = 'error' | 'warning' | 'info';
type IssueKind =
	| 'duplicate_card_name'
	| 'missing_asset_mapping'
	| 'broken_asset_ref'
	| 'orphaned_art_file'
	| 'duplicate_asset_mapping'
	| 'art_registry_orphan'
	| 'unknown_hero_mapping'
	| 'unknown_king_mapping'
	| 'planned_card_mapping'
	| 'hero_missing_art'
	| 'king_missing_art'
	| 'card_id_collision'
	| 'parallel_art_directory'
	| 'parallel_art_shadow'
	| 'duplicate_asset_content';

interface Issue {
	readonly kind: IssueKind;
	readonly severity: Severity;
	readonly message: string;
	readonly cardId?: number | string;
	readonly cardIds?: ReadonlyArray<number | string>;
	readonly assetId?: string;
	readonly suggestion?: string;
}

interface ExternalEntry {
	readonly source: string;
	readonly cardId: string;
	readonly cardName: string;
	readonly assetId: string;
}

interface Sources {
	readonly registryCards: ReadonlyArray<RegistryCard>;
	readonly artRegistry: ReadonlyMap<string, string>; // cardId → assetId
	readonly artRegistryReverse: ReadonlyMap<string, ReadonlyArray<string>>; // assetId → cardIds
	readonly manifestAssetIds: ReadonlySet<string>;
	readonly physicalFiles: ReadonlySet<string>;
	readonly externalEntries: ReadonlyArray<ExternalEntry>;
}

interface RegistryCard {
	readonly id: number | string;
	readonly name: string;
	readonly type: string;
	readonly rarity?: string;
	readonly heroClass?: string;
	readonly category: string;
}

interface SearchMatch {
	readonly source: string;
	readonly score: number;
	readonly assetId: string;
	readonly displayName: string;
	readonly meta: string;
}

// ── Loaders (pure) ─────────────────────────────────────────────────────────

const extractAssetId = (artPath: string | undefined): string | null => {
	if (!artPath) return null;
	const m = ASSET_PATH_RE.exec(artPath);
	return m ? m[1] : null;
};

const loadArtRegistry = (): {
	forward: Map<string, string>;
	reverse: Map<string, string[]>;
} => {
	const forward = new Map<string, string>();
	const reverse = new Map<string, string[]>();
	for (const [cardId, p] of Object.entries(ART_REGISTRY)) {
		const assetId = extractAssetId(p);
		if (!assetId) continue;
		forward.set(cardId, assetId);
		const list = reverse.get(assetId) ?? [];
		list.push(cardId);
		reverse.set(assetId, list);
	}
	return { forward, reverse };
};

const loadManifestAssetIds = (): Set<string> => {
	const ids = new Set<string>();
	for (const file of ['genesisCollection.json', 'starterCollection.json']) {
		const fullPath = path.join(DATA_DIR, file);
		if (!fs.existsSync(fullPath)) continue;
		const data = JSON.parse(fs.readFileSync(fullPath, 'utf8')) as { cards: Array<{ assetId?: string | null }> };
		for (const c of data.cards) {
			if (c.assetId) ids.add(c.assetId);
		}
	}
	return ids;
};

const loadPhysicalFiles = (): Set<string> => {
	if (!fs.existsSync(ART_DIR)) return new Set();
	const out = new Set<string>();
	for (const f of fs.readdirSync(ART_DIR)) {
		const m = ASSET_FILENAME_RE.exec(f);
		if (m && f.endsWith('.webp')) out.add(m[1]);
	}
	return out;
};

const loadExternalExports = (): ReadonlyArray<ExternalEntry> => {
	if (!fs.existsSync(EXTERNAL_ROOT)) return [];
	const out: ExternalEntry[] = [];
	for (const rel of KNOWN_EXPORTS) {
		const full = path.join(EXTERNAL_ROOT, rel);
		if (!fs.existsSync(full)) continue;
		try {
			const data = JSON.parse(fs.readFileSync(full, 'utf8')) as unknown;
			const arr = Array.isArray(data) ? data : ((data as { cards?: unknown[] }).cards ?? []);
			for (const e of arr as Array<Record<string, unknown>>) {
				const filename = String(e.filename ?? '');
				const m = ASSET_FILENAME_RE.exec(filename);
				if (!m) continue;
				out.push({
					source: rel,
					cardId: String(e.id ?? ''),
					cardName: String(e.name ?? e.character ?? ''),
					assetId: m[1],
				});
			}
		} catch {
			// skip malformed exports
		}
	}
	return out;
};

const loadSources = (): Sources => {
	const { forward, reverse } = loadArtRegistry();
	return {
		registryCards: cardRegistry as unknown as RegistryCard[],
		artRegistry: forward,
		artRegistryReverse: reverse,
		manifestAssetIds: loadManifestAssetIds(),
		physicalFiles: loadPhysicalFiles(),
		externalEntries: loadExternalExports(),
	};
};

// ── Search algorithms (pure) ───────────────────────────────────────────────

const slugify = (s: string): string =>
	s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const tokens = (s: string): string[] =>
	slugify(s).split('-').filter(t => t.length >= 3);

const levenshtein = (a: string, b: string): number => {
	if (a === b) return 0;
	if (!a.length) return b.length;
	if (!b.length) return a.length;
	const prev = new Array<number>(b.length + 1);
	for (let j = 0; j <= b.length; j++) prev[j] = j;
	for (let i = 1; i <= a.length; i++) {
		let last = i - 1;
		prev[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const tmp = prev[j];
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + cost);
			last = tmp;
		}
	}
	return prev[b.length];
};

const stringSimilarity = (a: string, b: string): number => {
	const longest = Math.max(a.length, b.length);
	return longest === 0 ? 1 : 1 - levenshtein(a, b) / longest;
};

/** Score a candidate name/character against a query. Returns 0..1. */
const scoreMatch = (query: string, candidateName: string, candidateMeta = ''): number => {
	const qSlug = slugify(query);
	const cSlug = slugify(candidateName);
	if (cSlug === qSlug) return 1.0;
	if (cSlug.includes(qSlug) || qSlug.includes(cSlug)) return 0.85;

	const qTokens = new Set(tokens(query));
	const cTokens = new Set([...tokens(candidateName), ...tokens(candidateMeta)]);
	if (qTokens.size === 0) return 0;
	let hits = 0;
	for (const t of qTokens) if (cTokens.has(t)) hits++;
	const tokenScore = hits / qTokens.size;

	const editScore = stringSimilarity(qSlug, cSlug);
	return Math.max(tokenScore * 0.7 + editScore * 0.3, tokenScore * 0.95);
};

interface SearchOptions {
	readonly minScore?: number;
	readonly limit?: number;
	readonly excludeUsedAssets?: boolean;
}

const searchAcrossSources = (
	query: string,
	sources: Sources,
	opts: SearchOptions = {},
): SearchMatch[] => {
	const minScore = opts.minScore ?? 0.5;
	const limit = opts.limit ?? 10;
	const usedAssets = opts.excludeUsedAssets
		? new Set([...sources.artRegistry.values(), ...collectEntityPortraits()])
		: new Set<string>();

	const matches: SearchMatch[] = [];

	for (const e of sources.externalEntries) {
		if (usedAssets.has(e.assetId)) continue;
		const score = scoreMatch(query, e.cardName);
		if (score >= minScore) {
			matches.push({
				source: e.source,
				score,
				assetId: e.assetId,
				displayName: e.cardName,
				meta: `external cardId=${e.cardId}`,
			});
		}
	}

	matches.sort((a, b) => b.score - a.score);
	return matches.slice(0, limit);
};

// ── Issue detectors (pure) ─────────────────────────────────────────────────

const detectDuplicateCardNames = (sources: Sources): Issue[] => {
	const byName = new Map<string, RegistryCard[]>();
	for (const c of sources.registryCards) {
		if (!c.name) continue;
		const list = byName.get(c.name) ?? [];
		list.push(c);
		byName.set(c.name, list);
	}
	const issues: Issue[] = [];
	for (const [name, list] of byName) {
		if (list.length < 2) continue;
		issues.push({
			kind: 'duplicate_card_name',
			severity: 'error',
			message: `Card name "${name}" defined ${list.length} times with distinct IDs`,
			cardIds: list.map(c => c.id),
			suggestion: 'Pick canonical version, delete legacy. Likely the higher-id one (50000+) is the new pet-system canon.',
		});
	}
	return issues;
};

const loadPendingArtIds = (): ReadonlySet<number | string> => {
	if (!fs.existsSync(PENDING_ART_PATH)) return new Set();
	const data = JSON.parse(fs.readFileSync(PENDING_ART_PATH, 'utf8')) as { cardIds?: Array<number | string> };
	return new Set(data.cardIds ?? []);
};

const detectMissingArtMappings = (sources: Sources): Issue[] => {
	const issues: Issue[] = [];
	const pending = loadPendingArtIds();
	const collectible = sources.registryCards.filter(c => c.category !== 'token');
	for (const c of collectible) {
		const assetId = sources.artRegistry.get(String(c.id));
		if (assetId) continue;
		const isPending = pending.has(c.id) || pending.has(String(c.id)) || pending.has(Number(c.id));
		issues.push({
			kind: 'missing_asset_mapping',
			severity: isPending ? 'info' : 'error',
			message: `Card ${c.id} "${c.name}" (${c.type}/${c.rarity ?? '?'}) has no entry in ART_REGISTRY${isPending ? ' [pending art]' : ''}`,
			cardId: c.id,
			suggestion: isPending ? 'Tracked in scripts/pending-art.json — generate art and remove from list.' : undefined,
		});
	}
	return issues;
};

const detectBrokenArtRefs = (sources: Sources): Issue[] => {
	const issues: Issue[] = [];
	for (const [cardId, assetId] of sources.artRegistry) {
		if (!sources.physicalFiles.has(assetId)) {
			issues.push({
				kind: 'broken_asset_ref',
				severity: 'error',
				message: `ART_REGISTRY[${cardId}] points to /art/nfts/${assetId}.webp but file does not exist`,
				cardId,
				assetId,
			});
		}
	}
	return issues;
};

const collectEntityPortraits = (): Set<string> => {
	const out = new Set<string>();
	for (const h of Object.values(ALL_NORSE_HEROES) as Array<{ portrait?: string }>) {
		if (h.portrait) out.add(h.portrait);
	}
	for (const k of Object.values(NORSE_KINGS) as Array<{ portrait?: string }>) {
		if (k.portrait) out.add(k.portrait);
	}
	return out;
};

const detectOrphanedFiles = (sources: Sources): Issue[] => {
	const referenced = new Set<string>([
		...sources.artRegistry.values(),
		...sources.manifestAssetIds,
		...collectEntityPortraits(),
	]);
	const issues: Issue[] = [];
	for (const f of sources.physicalFiles) {
		if (!referenced.has(f)) {
			issues.push({
				kind: 'orphaned_art_file',
				severity: 'warning',
				message: `Orphaned art file /art/nfts/${f}.webp — no layer references it`,
				assetId: f,
			});
		}
	}
	return issues;
};

const detectDuplicateAssetMappings = (sources: Sources): Issue[] => {
	const issues: Issue[] = [];
	for (const [assetId, cardIds] of sources.artRegistryReverse) {
		if (cardIds.length < 2) continue;
		issues.push({
			kind: 'duplicate_asset_mapping',
			severity: 'error',
			message: `Asset ${assetId} mapped from ${cardIds.length} cards: ${cardIds.join(', ')}`,
			assetId,
			cardIds,
		});
	}
	return issues;
};

const PLANNED_CARDS_PATH = path.join(path.dirname(__filename), 'planned-cards.json');

const loadPlannedCardIds = (): ReadonlySet<string> => {
	if (!fs.existsSync(PLANNED_CARDS_PATH)) return new Set();
	const data = JSON.parse(fs.readFileSync(PLANNED_CARDS_PATH, 'utf8')) as { cardIds?: Array<number | string> };
	return new Set((data.cardIds ?? []).map(String));
};

const isHeroKey = (key: string): boolean => key.startsWith('hero-');
const isKingKey = (key: string): boolean => key.startsWith('king-');
const isCardKey = (key: string): boolean => /^\d+$/.test(key);

const classifyArtRegistryEntries = (sources: Sources): Issue[] => {
	const issues: Issue[] = [];
	const registryIds = new Set(sources.registryCards.map(c => String(c.id)));
	const heroIds = new Set(Object.keys(ALL_NORSE_HEROES));
	const kingIds = new Set(Object.keys(NORSE_KINGS));
	const planned = loadPlannedCardIds();

	for (const key of sources.artRegistry.keys()) {
		if (isHeroKey(key) || isKingKey(key)) {
			issues.push({
				kind: 'art_registry_orphan',
				severity: 'error',
				message: `ART_REGISTRY["${key}"] is a hero/king mapping — these must live on the entity's portrait field, not in ART_REGISTRY`,
				cardId: key,
				suggestion: 'Move the asset id into ALL_NORSE_HEROES/NORSE_KINGS[id].portrait and delete the ART_REGISTRY entry.',
			});
			continue;
		}
		if (isCardKey(key)) {
			if (registryIds.has(key)) continue;
			if (planned.has(key)) {
				issues.push({
					kind: 'planned_card_mapping',
					severity: 'info',
					message: `ART_REGISTRY[${key}] is a planned card with art ready — awaiting registry definition`,
					cardId: key,
					suggestion: 'Tracked in scripts/planned-cards.json. Implement the card or remove from list.',
				});
				continue;
			}
			issues.push({
				kind: 'art_registry_orphan',
				severity: 'error',
				message: `ART_REGISTRY[${key}] points to art but cardId ${key} has no definition — true orphan`,
				cardId: key,
				suggestion: 'Either implement the card in cardRegistry, add to scripts/planned-cards.json, or delete the mapping.',
			});
			continue;
		}
		issues.push({
			kind: 'art_registry_orphan',
			severity: 'error',
			message: `ART_REGISTRY["${key}"] uses a key that is neither a numeric card id, hero id, nor king id`,
			cardId: key,
		});
	}

	for (const heroId of heroIds) {
		const portrait = ALL_NORSE_HEROES[heroId]?.portrait;
		if (!portrait) {
			issues.push({
				kind: 'hero_missing_art',
				severity: 'error',
				message: `Hero "${heroId}" has no portrait field in ALL_NORSE_HEROES`,
				cardId: heroId,
				suggestion: 'Set portrait: \'<assetId>\' on the entity definition.',
			});
			continue;
		}
		if (!sources.physicalFiles.has(portrait)) {
			issues.push({
				kind: 'broken_asset_ref',
				severity: 'error',
				message: `Hero "${heroId}".portrait = '${portrait}' but /art/nfts/${portrait}.webp does not exist`,
				cardId: heroId,
				assetId: portrait,
			});
		}
	}

	for (const kingId of kingIds) {
		const portrait = NORSE_KINGS[kingId]?.portrait;
		if (!portrait) {
			issues.push({
				kind: 'king_missing_art',
				severity: 'error',
				message: `King "${kingId}" has no portrait field in NORSE_KINGS`,
				cardId: kingId,
				suggestion: 'Set portrait: \'<assetId>\' on the entity definition.',
			});
			continue;
		}
		if (!sources.physicalFiles.has(portrait)) {
			issues.push({
				kind: 'broken_asset_ref',
				severity: 'error',
				message: `King "${kingId}".portrait = '${portrait}' but /art/nfts/${portrait}.webp does not exist`,
				cardId: kingId,
				assetId: portrait,
			});
		}
	}

	return issues;
};

const PUBLIC_DIR = path.join(REPO_ROOT, 'client', 'public');

/**
 * Allowed top-level directories under client/public/. Anything else that
 * holds image/audio assets is a dual source of truth and gets flagged.
 *
 *   art/        — collection canon (NFTs + realms + retired)
 *                 ├─ nfts/      canonical NFT collection
 *                 ├─ realms/    full-bleed realm board backgrounds
 *                 └─ orphaned/  retired NFT art (preserved for revival)
 *   textures/   — VFX and decorative textures (NOT collection canon)
 *                 ├─ foil/      holographic foil overlays for cards
 *                 ├─ board/     chess/poker board surface textures
 *                 └─ elements/  fire/water/wind/earth/holy/shadow icons
 *   icons/      — UI icons (PWA + favicon)
 *   ui/         — UI chrome (buttons, frames, decorative backgrounds)
 *   sounds/     — sound effects + music
 *   fonts/      — custom fonts
 *   assets/     — bootstrap images (logo, card-back) imported by Vite from src
 *   data/       — generated manifests (genesis, starter, duat-snapshot)
 *
 * The line between art/ and textures/ is intentional: art/ is the
 * canon-coleccionable layer (gated by Genesis Charter); textures/ is
 * decoration & VFX that can be swapped without touching the collection.
 */
const ALLOWED_PUBLIC_ASSET_DIRS = new Set([
	'art', 'icons', 'ui', 'sounds', 'textures', 'fonts', 'assets', 'data',
]);

const ART_FILE_EXTS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.glb']);

const detectParallelArtDirs = (): Issue[] => {
	if (!fs.existsSync(PUBLIC_DIR)) return [];
	const issues: Issue[] = [];
	for (const entry of fs.readdirSync(PUBLIC_DIR, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		if (ALLOWED_PUBLIC_ASSET_DIRS.has(entry.name)) continue;
		const dir = path.join(PUBLIC_DIR, entry.name);
		const containsArt = walkHasArtFiles(dir);
		if (containsArt) {
			issues.push({
				kind: 'parallel_art_directory',
				severity: 'error',
				message: `Unexpected directory client/public/${entry.name}/ contains image/audio assets — potential parallel art source`,
				suggestion: 'Move the assets under the canonical /art/ tree or remove the directory.',
			});
		}
	}
	return issues;
};

const walkHasArtFiles = (dir: string): boolean => {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (walkHasArtFiles(full)) return true;
			continue;
		}
		const ext = path.extname(entry.name).toLowerCase();
		if (ART_FILE_EXTS.has(ext)) return true;
	}
	return false;
};

/**
 * Recurse INTO allowed dirs looking for files that match the canonical
 * Genesis filename pattern `[0-9a-f]{4}-[0-9a-z]{8}.webp`. The only
 * legitimate homes for such files are `art/nfts/` and `art/orphaned/`;
 * anything else is a parallel collection-art dump (e.g. legacy CDN export
 * mirrors, abandoned portrait drafts) silently shadowing the canon.
 */
const GENESIS_FILENAME_RE = /^[0-9a-f]{4}-[0-9a-z]{8}\.webp$/;

const detectParallelArtShadows = (): Issue[] => {
	if (!fs.existsSync(PUBLIC_DIR)) return [];
	const issues: Issue[] = [];
	const canonRoots = new Set([
		path.join(PUBLIC_DIR, 'art', 'nfts'),
		path.join(PUBLIC_DIR, 'art', 'orphaned'),
	]);
	const walk = (dir: string): void => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (canonRoots.has(full)) continue;
				walk(full);
				continue;
			}
			if (!GENESIS_FILENAME_RE.test(entry.name)) continue;
			const rel = path.relative(REPO_ROOT, full).replace(/\\/g, '/');
			issues.push({
				kind: 'parallel_art_shadow',
				severity: 'error',
				message: `Genesis-pattern art file outside canon: ${rel}`,
				assetId: entry.name.replace(/\.webp$/, ''),
				suggestion: 'Move the file into client/public/art/nfts/ (and register it) or client/public/art/orphaned/ — never into a UI/utility folder.',
			});
		}
	};
	walk(PUBLIC_DIR);
	return issues;
};

/**
 * Two cards / heroes / kings can share a *filename* — already detected by
 * `duplicate_asset_mapping`. They must not share a *bitmap*: byte-identical
 * art under different names violates collection uniqueness. md5-hash every
 * .webp under `art/nfts/` and report each collision group.
 */
const detectDuplicateAssetContent = (sources: Sources): Issue[] => {
	const byHash = new Map<string, string[]>();
	for (const assetId of sources.physicalFiles) {
		const full = path.join(ART_DIR, `${assetId}.webp`);
		if (!fs.existsSync(full)) continue;
		const hash = createHash('md5').update(fs.readFileSync(full)).digest('hex');
		const bucket = byHash.get(hash) ?? [];
		bucket.push(assetId);
		byHash.set(hash, bucket);
	}
	const issues: Issue[] = [];
	for (const [hash, group] of byHash) {
		if (group.length < 2) continue;
		const sorted = [...group].sort();
		issues.push({
			kind: 'duplicate_asset_content',
			severity: 'error',
			message: `Byte-identical art (md5 ${hash.slice(0, 8)}…): ${sorted.join(', ')}`,
			suggestion: 'Pick one canonical filename, mark the other card(s) pending in scripts/pending-art.json, and delete the duplicate file.',
		});
	}
	return issues;
};

const detectAllIssues = (sources: Sources): Issue[] => [
	...detectDuplicateCardNames(sources),
	...detectMissingArtMappings(sources),
	...detectBrokenArtRefs(sources),
	...detectDuplicateAssetMappings(sources),
	...detectDuplicateAssetContent(sources),
	...classifyArtRegistryEntries(sources),
	...detectOrphanedFiles(sources),
	...detectParallelArtDirs(),
	...detectParallelArtShadows(),
];

// ── Reporter ───────────────────────────────────────────────────────────────

const SEVERITY_LABEL: Record<Severity, string> = {
	error: 'ERROR',
	warning: 'WARN ',
	info: 'INFO ',
};

const formatIssue = (i: Issue): string => {
	const lines = [`  [${SEVERITY_LABEL[i.severity]}] ${i.message}`];
	if (i.suggestion) lines.push(`         → ${i.suggestion}`);
	return lines.join('\n');
};

const groupBySeverity = (issues: Issue[]): Record<Severity, Issue[]> => ({
	error: issues.filter(i => i.severity === 'error'),
	warning: issues.filter(i => i.severity === 'warning'),
	info: issues.filter(i => i.severity === 'info'),
});

const groupByKind = (issues: Issue[]): Map<IssueKind, Issue[]> => {
	const out = new Map<IssueKind, Issue[]>();
	for (const i of issues) {
		const list = out.get(i.kind) ?? [];
		list.push(i);
		out.set(i.kind, list);
	}
	return out;
};

const summary = (sources: Sources): string => {
	const lines = [
		'─── Sources ───',
		`  registry cards:        ${sources.registryCards.length}`,
		`  ART_REGISTRY entries:  ${sources.artRegistry.size}`,
		`  manifest assetIds:     ${sources.manifestAssetIds.size}`,
		`  physical .webp files:  ${sources.physicalFiles.size}`,
		`  external batch entries: ${sources.externalEntries.length}`,
	];
	return lines.join('\n');
};

const computeCharterActuals = (sources: Sources): CharterDelta => {
	const cardsByRarity: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, mythic: 0 };
	for (const c of sources.registryCards) {
		if (c.category !== 'genesis') continue;
		const r = tryAdaptRarity((c.rarity ?? '').toLowerCase());
		if (r) cardsByRarity[r] = (cardsByRarity[r] ?? 0) + 1;
	}
	return computeCharterDelta({
		cardsByRarity,
		heroesTotal: Object.keys(ALL_NORSE_HEROES).length,
		kingsTotal: Object.keys(NORSE_KINGS).length,
	});
};

const formatCharterCompliance = (sources: Sources): string => {
	const delta = computeCharterActuals(sources);
	const clean = isCharterClean(delta);
	const lines: string[] = [];
	lines.push('─── Genesis Charter Compliance ───');
	lines.push(`  status: ${clean ? 'CLEAN — matches charter exactly' : 'has gaps (informational)'}`);
	lines.push('  rarity   │ cards expected │ cards actual │ Δ');
	lines.push('  ─────────┼────────────────┼──────────────┼─────');
	for (const g of delta.cardsByRarity) {
		const sign = g.delta === 0 ? ' ' : (g.delta > 0 ? '+' : '');
		lines.push(`  ${g.rarity.padEnd(8)} │ ${String(g.expected).padStart(14)} │ ${String(g.actual).padStart(12)} │ ${sign}${g.delta}`);
	}
	const hSign = delta.heroesDelta === 0 ? ' ' : (delta.heroesDelta > 0 ? '+' : '');
	const kSign = delta.kingsDelta === 0 ? ' ' : (delta.kingsDelta > 0 ? '+' : '');
	lines.push(`  heroes total: ${CHARTER_HEROES_TOTAL} expected, ${Object.keys(ALL_NORSE_HEROES).length} actual (${hSign}${delta.heroesDelta})`);
	lines.push(`  kings  total: ${CHARTER_KINGS_TOTAL} expected, ${Object.keys(NORSE_KINGS).length} actual (${kSign}${delta.kingsDelta})`);
	lines.push(`  seeds  total: ${CHARTER_SEEDS_TOTAL} expected → NFTs ${CHARTER_NFTS_TOTAL.toLocaleString()}`);
	return lines.join('\n');
};

const formatReport = (sources: Sources, issues: Issue[]): string => {
	const lines: string[] = [];
	lines.push(summary(sources));
	lines.push('');
	lines.push(formatCharterCompliance(sources));
	lines.push('');

	const bySev = groupBySeverity(issues);
	lines.push('─── Issues ───');
	lines.push(`  errors:   ${bySev.error.length}`);
	lines.push(`  warnings: ${bySev.warning.length}`);
	lines.push(`  info:     ${bySev.info.length}`);
	lines.push('');

	const byKind = groupByKind(issues);
	for (const [kind, list] of byKind) {
		const sev = list[0].severity;
		lines.push(`─── ${kind} (${list.length}, ${sev}) ───`);
		const sample = list.slice(0, 25);
		for (const i of sample) lines.push(formatIssue(i));
		if (list.length > sample.length) {
			lines.push(`  ... +${list.length - sample.length} more`);
		}
		lines.push('');
	}
	return lines.join('\n');
};

const formatSearchMatches = (query: string, matches: SearchMatch[]): string => {
	if (matches.length === 0) return `No matches for "${query}".`;
	const lines = [`Top ${matches.length} matches for "${query}":`, ''];
	for (const m of matches) {
		const score = (m.score * 100).toFixed(0);
		lines.push(`  [${score}%] ${m.assetId}  "${m.displayName}"`);
		lines.push(`         meta: ${m.meta}`);
		lines.push(`         from: ${m.source}`);
	}
	return lines.join('\n');
};

// ── CLI ────────────────────────────────────────────────────────────────────

const parseArgs = (argv: string[]): { json: boolean; strict: boolean; search?: string } => {
	const out: { json: boolean; strict: boolean; search?: string } = {
		json: argv.includes('--json'),
		strict: argv.includes('--strict'),
	};
	const i = argv.indexOf('--search');
	if (i >= 0 && argv[i + 1]) out.search = argv[i + 1];
	return out;
};

const main = (): void => {
	const args = parseArgs(process.argv.slice(2));
	const sources = loadSources();

	if (args.search) {
		const matches = searchAcrossSources(args.search, sources, {
			minScore: 0.4,
			limit: 15,
			excludeUsedAssets: true,
		});
		if (args.json) {
			console.log(JSON.stringify({ query: args.search, matches }, null, 2));
		} else {
			console.log(formatSearchMatches(args.search, matches));
		}
		return;
	}

	const issues = detectAllIssues(sources);
	if (args.json) {
		console.log(JSON.stringify({ summary: { sources: {
			registry: sources.registryCards.length,
			artRegistry: sources.artRegistry.size,
			manifest: sources.manifestAssetIds.size,
			files: sources.physicalFiles.size,
			external: sources.externalEntries.length,
		} }, issues }, null, 2));
	} else {
		console.log(formatReport(sources, issues));
	}

	if (args.strict && issues.some(i => i.severity === 'error')) {
		process.exit(1);
	}
};

main();
