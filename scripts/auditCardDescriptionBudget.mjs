#!/usr/bin/env node
/**
 * Audit the text budget used by card descriptions.
 *
 * The script follows local imports starting at the canonical card registry,
 * reads card literals with the TypeScript AST, and never executes game code.
 * This keeps the audit useful even when a client-only module cannot run in
 * Node.
 *
 * Usage:
 *   pnpm run audit:card-description-budget
 *   node scripts/auditCardDescriptionBudget.mjs --min 20 --max 120
 *   node scripts/auditCardDescriptionBudget.mjs --min 20 --max 120 --all
 *   node scripts/auditCardDescriptionBudget.mjs --min 20 --max 120 --json
 *
 * Character counts are normalized for whitespace and count Unicode code
 * points. The result is a content budget, not a pixel-level overflow proof:
 * the final rendered width still depends on font, scale, surface, and
 * viewport.
 */

import ts from 'typescript';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_ENTRY = path.resolve(REPO_ROOT, 'client/src/game/data/cardRegistry/index.ts');
const DEFAULT_MIN_CHARS = 20;
const DEFAULT_MAX_CHARS = 120;
const DEFAULT_DETAIL_LIMIT = 30;

function isFile(filePath) {
	try {
		return existsSync(filePath) && statSync(filePath).isFile();
	} catch {
		return false;
	}
}

function parseArgs(argv) {
	const options = {
		min: null,
		max: null,
		all: false,
		json: false,
		failOnOutOfRange: false,
		limit: DEFAULT_DETAIL_LIMIT,
		entry: DEFAULT_ENTRY,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--') continue;
		if (arg === '--all') {
			options.all = true;
			continue;
		}
		if (arg === '--json') {
			options.json = true;
			continue;
		}
		if (arg === '--fail-on-out-of-range') {
			options.failOnOutOfRange = true;
			continue;
		}

		const match = arg.match(/^--(min|max|limit|entry)(?:=(.*))?$/);
		if (!match) {
			throw new Error(`Argumento no reconocido: ${arg}`);
		}

		const key = match[1];
		const inlineValue = match[2];
		const value = inlineValue ?? argv[++index];
		if (!value || value.startsWith('--')) {
			throw new Error(`Falta el valor para --${key}.`);
		}

		if (key === 'entry') {
			options.entry = path.resolve(REPO_ROOT, value);
			continue;
		}

		const parsed = Number(value);
		if (!Number.isInteger(parsed) || parsed < 0) {
			throw new Error(`--${key} debe ser un entero mayor o igual a cero: ${value}`);
		}
		options[key] = parsed;
	}

	return options;
}

function resolveLocalModule(importer, specifier) {
	if (!specifier.startsWith('.')) return null;

	const withoutRuntimeExtension = specifier.replace(/\.(?:js|jsx|mjs)$/u, '');
	const base = path.resolve(path.dirname(importer), withoutRuntimeExtension);
	const candidates = [
		`${base}.ts`,
		`${base}.tsx`,
		path.join(base, 'index.ts'),
		path.join(base, 'index.tsx'),
	];

	return candidates.find(isFile) ?? null;
}

function getModuleSpecifiers(sourceFile) {
	const specifiers = [];
	for (const statement of sourceFile.statements) {
		if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
			specifiers.push(statement.moduleSpecifier.text);
		}
		if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
			specifiers.push(statement.moduleSpecifier.text);
		}
	}
	return specifiers;
}

function collectSourceFiles(entry) {
	if (!isFile(entry)) {
		throw new Error(`No existe el entry del registro: ${path.relative(REPO_ROOT, entry)}`);
	}

	const visited = new Set();
	const files = [];

	function visit(filePath) {
		const absolutePath = path.resolve(filePath);
		if (visited.has(absolutePath)) return;
		visited.add(absolutePath);
		files.push(absolutePath);

		const sourceFile = ts.createSourceFile(
			absolutePath,
			readFileSync(absolutePath, 'utf8'),
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS,
		);

		for (const specifier of getModuleSpecifiers(sourceFile)) {
			const localModule = resolveLocalModule(absolutePath, specifier);
			if (localModule) visit(localModule);
		}
	}

	visit(entry);
	return files;
}

function getPropertyAssignment(objectLiteral, propertyName) {
	for (const property of objectLiteral.properties) {
		if (!ts.isPropertyAssignment(property)) continue;
		if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
			if (property.name.text === propertyName) return property;
		}
	}
	return null;
}

function unwrapExpression(expression) {
	let current = expression;
	while (
		ts.isParenthesizedExpression(current) ||
		ts.isAsExpression(current) ||
		ts.isTypeAssertionExpression(current) ||
		ts.isNonNullExpression(current) ||
		ts.isSatisfiesExpression(current)
	) {
		current = current.expression;
	}
	return current;
}

function getStaticString(expression) {
	if (!expression) return null;
	const value = unwrapExpression(expression);
	if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;

	if (ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.PlusToken) {
		const left = getStaticString(value.left);
		const right = getStaticString(value.right);
		return left !== null && right !== null ? `${left}${right}` : null;
	}

	return null;
}

function getStaticNumber(expression) {
	if (!expression) return null;
	const value = unwrapExpression(expression);
	if (!ts.isNumericLiteral(value)) return null;
	const parsed = Number(value.text);
	return Number.isFinite(parsed) ? parsed : null;
}

function getStaticStringArray(expression) {
	if (!expression) return [];
	const value = unwrapExpression(expression);
	if (!ts.isArrayLiteralExpression(value)) return null;

	const result = [];
	for (const element of value.elements) {
		const item = getStaticString(element);
		if (item === null) return null;
		result.push(item);
	}
	return result;
}

function readProperty(objectLiteral, propertyName, reader) {
	const property = getPropertyAssignment(objectLiteral, propertyName);
	if (!property) return { present: false, value: null };
	return { present: true, value: reader(property.initializer) };
}

function normalizeText(value) {
	return value.replace(/\s+/gu, ' ').trim();
}

function countWords(value) {
	const normalized = normalizeText(value);
	return normalized ? normalized.split(/\s+/u).length : 0;
}

function getCardRecord(objectLiteral, sourceFile, filePath) {
	const id = readProperty(objectLiteral, 'id', getStaticNumber);
	const stringId = readProperty(objectLiteral, 'id', getStaticString);
	const name = readProperty(objectLiteral, 'name', getStaticString);
	const type = readProperty(objectLiteral, 'type', getStaticString);

	const cardId = id.value ?? stringId.value;
	if (cardId === null || name.value === null || type.value === null) return null;

	const description = readProperty(objectLiteral, 'description', getStaticString);
	const keywords = readProperty(objectLiteral, 'keywords', getStaticStringArray);
	const normalizedDescription = description.value === null ? null : normalizeText(description.value);
	const lineAndCharacter = sourceFile.getLineAndCharacterOfPosition(objectLiteral.getStart(sourceFile));

	return {
		id: cardId,
		name: name.value,
		type: type.value,
		description: normalizedDescription,
		keywords: keywords.value ?? [],
		keywordsReadable: keywords.value === null ? null : keywords.value.join(', '),
		descriptionChars: normalizedDescription === null ? null : Array.from(normalizedDescription).length,
		descriptionWords: normalizedDescription === null ? null : countWords(normalizedDescription),
		descriptionState: !description.present ? 'missing' : normalizedDescription === null ? 'dynamic' : 'static',
		keywordsState: keywords.value === null ? 'dynamic' : 'static',
		source: path.relative(REPO_ROOT, filePath).split(path.sep).join('/'),
		line: lineAndCharacter.line + 1,
	};
}

function extractCards(sourceFiles) {
	const cards = [];

	for (const filePath of sourceFiles) {
		const sourceFile = ts.createSourceFile(
			filePath,
			readFileSync(filePath, 'utf8'),
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS,
		);

		function visit(node) {
			if (ts.isObjectLiteralExpression(node)) {
				const card = getCardRecord(node, sourceFile, filePath);
				if (card) cards.push(card);
			}
			ts.forEachChild(node, visit);
		}

		visit(sourceFile);
	}

	return cards;
}

function deduplicateCards(cards) {
	const byId = new Map();
	const duplicates = [];

	for (const card of cards) {
		const key = String(card.id);
		if (byId.has(key)) {
			duplicates.push(card);
			continue;
		}
		byId.set(key, card);
	}

	return { cards: [...byId.values()], duplicates };
}

function getStatus(card, min, max) {
	if (card.descriptionState !== 'static') return card.descriptionState;
	if (card.descriptionChars < min) return 'short';
	if (card.descriptionChars > max) return 'long';
	return 'ok';
}

function calculateAudit(cards, sourceFiles, min, max, duplicates) {
	const withStatus = cards.map(card => ({ ...card, status: getStatus(card, min, max) }));
	const measurable = withStatus.filter(card => card.descriptionState === 'static');
	const lengths = measurable.map(card => card.descriptionChars);
	const sortedLengths = [...lengths].sort((a, b) => a - b);
	const median = sortedLengths.length === 0
		? null
		: sortedLengths[Math.floor(sortedLengths.length / 2)];
	const sum = lengths.reduce((total, length) => total + length, 0);
	const statusCount = status => withStatus.filter(card => card.status === status).length;

	return {
		bounds: { min, max },
		source: {
			entry: path.relative(REPO_ROOT, DEFAULT_ENTRY).split(path.sep).join('/'),
			modules: sourceFiles.length,
		},
		stats: {
			total: withStatus.length,
			ok: statusCount('ok'),
			short: statusCount('short'),
			long: statusCount('long'),
			missing: statusCount('missing'),
			dynamic: statusCount('dynamic'),
			measurable: measurable.length,
			minChars: lengths.length > 0 ? Math.min(...lengths) : null,
			maxChars: lengths.length > 0 ? Math.max(...lengths) : null,
			averageChars: lengths.length > 0 ? Number((sum / lengths.length).toFixed(1)) : null,
			medianChars: median,
			withKeywords: withStatus.filter(card => card.keywords.length > 0).length,
			maxKeywords: withStatus.reduce((maxKeywords, card) => Math.max(maxKeywords, card.keywords.length), 0),
			duplicateIds: duplicates.length,
		},
		cards: withStatus,
		duplicates,
	};
}

function formatId(id) {
	return String(id).padStart(6, ' ');
}

function truncate(value, maxLength) {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 1)}…`;
}

function formatCardLine(card) {
	const keywords = card.keywordsReadable ? ` | kw: ${card.keywordsReadable}` : '';
	const description = card.description === null ? '(sin descripción legible)' : truncate(card.description, 110);
	return `${card.status.toUpperCase().padEnd(7)} ${formatId(card.id)} ${String(card.descriptionChars ?? '-').padStart(4)} c | ${card.name} | ${description}${keywords} | ${card.source}:${card.line}`;
}

function printHumanReport(audit, options) {
	const { bounds, source, stats, cards } = audit;
	const shortCards = cards
		.filter(card => card.status === 'short' || card.status === 'missing' || card.status === 'dynamic')
		.sort((a, b) => (a.descriptionChars ?? -1) - (b.descriptionChars ?? -1));
	const longCards = cards
		.filter(card => card.status === 'long')
		.sort((a, b) => b.descriptionChars - a.descriptionChars);
	const longestCards = cards
		.filter(card => card.descriptionState === 'static')
		.sort((a, b) => b.descriptionChars - a.descriptionChars)
		.slice(0, 10);
	const detailLimit = options.all ? Number.POSITIVE_INFINITY : options.limit;

	console.log('\n=== AUDITORÍA DE DESCRIPCIONES DE CARTAS ===');
	console.log(`Límite de caracteres: ${bounds.min}–${bounds.max} (incluidos)`);
	console.log(`Fuente: ${source.entry} → ${source.modules} módulos locales`);
	console.log(`Cartas: ${stats.total} | OK: ${stats.ok} | cortas: ${stats.short} | largas: ${stats.long} | sin/dinámicas: ${stats.missing + stats.dynamic}`);
	console.log(`Medición: mínimo ${stats.minChars ?? '-'} c | máximo ${stats.maxChars ?? '-'} c | promedio ${stats.averageChars ?? '-'} c | mediana ${stats.medianChars ?? '-'} c`);
	console.log(`Keywords: ${stats.withKeywords} cartas con keywords | máximo encontrado: ${stats.maxKeywords}`);

	if (stats.long > 0) {
		console.log(`\n--- DESCRIPCIONES SOBRE EL MÁXIMO (${stats.long}) ---`);
		for (const card of longCards.slice(0, detailLimit)) console.log(formatCardLine(card));
		if (longCards.length > detailLimit) console.log(`… ${longCards.length - detailLimit} más. Usa --all para verlas todas.`);
	}

	if (shortCards.length > 0) {
		console.log(`\n--- DESCRIPCIONES BAJO EL MÍNIMO O NO LEGIBLES (${shortCards.length}) ---`);
		for (const card of shortCards.slice(0, detailLimit)) console.log(formatCardLine(card));
		if (shortCards.length > detailLimit) console.log(`… ${shortCards.length - detailLimit} más. Usa --all para verlas todas.`);
	}

	console.log('\n--- 10 DESCRIPCIONES MÁS LARGAS ---');
	for (const card of longestCards) console.log(formatCardLine(card));

	if (stats.duplicateIds > 0) {
		console.log(`\nADVERTENCIA: se ignoraron ${stats.duplicateIds} registros duplicados por id; revisa el registro.`);
	}

	console.log('\nNota: este presupuesto cuenta texto normalizado, no píxeles. El overflow real depende de fuente, escala, superficie y viewport; la UI no-póker actual recorta el cuerpo a dos líneas.');
}

async function askInteger(readline, label, defaultValue) {
	while (true) {
		const raw = (await readline.question(`${label} [${defaultValue}]: `)).trim();
		const value = raw === '' ? defaultValue : Number(raw);
		if (Number.isInteger(value) && value >= 0) return value;
		console.log('Introduce un entero mayor o igual a cero.');
	}
}

async function resolveBounds(options) {
	const needsPrompt = options.min === null || options.max === null;
	if (!needsPrompt) {
		if (options.min > options.max) throw new Error('El mínimo no puede ser mayor que el máximo.');
		return { min: options.min, max: options.max };
	}

	if (!process.stdin.isTTY || options.json) {
		const min = options.min ?? DEFAULT_MIN_CHARS;
		const max = options.max ?? DEFAULT_MAX_CHARS;
		if (min > max) throw new Error('El mínimo no puede ser mayor que el máximo.');
		return { min, max };
	}

	const readline = createInterface({ input: process.stdin, output: process.stdout });
	try {
		while (true) {
			const min = options.min ?? await askInteger(readline, 'Mínimo de caracteres por descripción', DEFAULT_MIN_CHARS);
			const max = options.max ?? await askInteger(readline, 'Máximo de caracteres por descripción', DEFAULT_MAX_CHARS);
			if (min <= max) return { min, max };
			console.log('El mínimo no puede ser mayor que el máximo. Inténtalo de nuevo.');
			if (options.min !== null && options.max !== null) throw new Error('El mínimo no puede ser mayor que el máximo.');
		}
	} finally {
		readline.close();
	}
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	const { min, max } = await resolveBounds(options);
	const sourceFiles = collectSourceFiles(options.entry);
	const extractedCards = extractCards(sourceFiles);
	const { cards, duplicates } = deduplicateCards(extractedCards);
	const audit = calculateAudit(cards, sourceFiles, min, max, duplicates);
	audit.source.entry = path.relative(REPO_ROOT, options.entry).split(path.sep).join('/');

	if (options.json) {
		console.log(JSON.stringify(audit, null, 2));
	} else {
		printHumanReport(audit, options);
	}

	if (options.failOnOutOfRange && (audit.stats.short > 0 || audit.stats.long > 0 || audit.stats.missing > 0 || audit.stats.dynamic > 0)) {
		process.exitCode = 1;
	}
}

main().catch(error => {
	console.error(`Error: ${error?.message ?? String(error)}`);
	process.exitCode = 1;
});
