#!/usr/bin/env node
/**
 * Build Asset Packs
 * Splits all game assets into zip chunks under 80MB for GitHub Pages (100MB limit).
 * Output: client/public/packs/assets-1.zip, assets-2.zip, etc.
 * Also generates packs/manifest.json listing all packs + files for the browser downloader.
 */
import archiver from 'archiver';
import { createWriteStream, mkdirSync, existsSync, statSync, readdirSync, writeFileSync } from 'fs';
import { join, relative, extname } from 'path';
import { execSync } from 'child_process';

const PUBLIC = 'client/public';
const PACKS_DIR = join(PUBLIC, 'packs');
const MAX_PACK_SIZE = 80 * 1024 * 1024; // 80MB per zip

const ASSET_DIRS = ['art', 'portraits', 'textures', 'icons', 'ui', 'sounds', 'elements'];
const ASSET_EXTS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.mp3', '.ogg', '.wav']);

// Individual files to include (WASM, data, textures not in asset dirs)
const EXTRA_FILES = [
	'engine.wasm',
	'data/duat-snapshot.json',
	'glitter-256.png',
];

function collectFiles(baseDir) {
	const files = [];
	function walk(dir) {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) {
				if (entry.name === 'unused' || entry.name === 'old-portraits' || entry.name === 'packs') continue;
				walk(full);
			} else if (ASSET_EXTS.has(extname(entry.name).toLowerCase())) {
				const size = statSync(full).size;
				const relativePath = '/' + relative(baseDir, full).replace(/\\/g, '/');
				files.push({ fullPath: full, relativePath, size });
			}
		}
	}
	for (const dir of ASSET_DIRS) {
		const fullDir = join(baseDir, dir);
		if (existsSync(fullDir)) walk(fullDir);
	}
	// Add individual extra files (WASM, data, textures)
	for (const extra of EXTRA_FILES) {
		const fullPath = join(baseDir, extra);
		if (existsSync(fullPath)) {
			const size = statSync(fullPath).size;
			const relativePath = '/' + extra.replace(/\\/g, '/');
			files.push({ fullPath, relativePath, size });
		}
	}

	return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function splitIntoPacks(files) {
	const packs = [];
	let current = { files: [], size: 0 };

	for (const file of files) {
		if (current.size + file.size > MAX_PACK_SIZE && current.files.length > 0) {
			packs.push(current);
			current = { files: [], size: 0 };
		}
		current.files.push(file);
		current.size += file.size;
	}
	if (current.files.length > 0) packs.push(current);
	return packs;
}

async function createZip(packFiles, zipPath) {
	return new Promise((resolve, reject) => {
		const output = createWriteStream(zipPath);
		const archive = archiver('zip', { zlib: { level: 1 } }); // level 1: fast, minimal compression (webp is already compressed)

		output.on('close', () => resolve(archive.pointer()));
		archive.on('error', reject);
		archive.pipe(output);

		for (const file of packFiles) {
			archive.file(file.fullPath, { name: file.relativePath });
		}

		archive.finalize();
	});
}

async function main() {
	console.log('Collecting asset files...');
	const files = collectFiles(PUBLIC);
	console.log(`Found ${files.length} files, ${(files.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1)} MB total`);

	const packs = splitIntoPacks(files);
	console.log(`Split into ${packs.length} packs (max ${MAX_PACK_SIZE / 1024 / 1024}MB each)\n`);

	mkdirSync(PACKS_DIR, { recursive: true });

	let buildHash;
	try {
		buildHash = execSync('git rev-parse --short HEAD').toString().trim();
	} catch {
		buildHash = Date.now().toString(36);
	}

	const packManifest = {
		version: buildHash,
		packs: [],
		totalFiles: files.length,
		totalSize: files.reduce((s, f) => s + f.size, 0),
	};

	for (let i = 0; i < packs.length; i++) {
		const pack = packs[i];
		const zipName = `assets-${i + 1}.zip`;
		const zipPath = join(PACKS_DIR, zipName);

		console.log(`Creating ${zipName}: ${pack.files.length} files, ${(pack.size / 1024 / 1024).toFixed(1)} MB uncompressed...`);
		const zipSize = await createZip(pack.files, zipPath);
		console.log(`  → ${(zipSize / 1024 / 1024).toFixed(1)} MB compressed\n`);

		packManifest.packs.push({
			name: zipName,
			fileCount: pack.files.length,
			uncompressedSize: pack.size,
			compressedSize: zipSize,
			files: pack.files.map(f => f.relativePath),
		});
	}

	writeFileSync(join(PACKS_DIR, 'manifest.json'), JSON.stringify(packManifest));
	console.log(`Pack manifest written to ${PACKS_DIR}/manifest.json`);

	const totalZip = packManifest.packs.reduce((s, p) => s + p.compressedSize, 0);
	const totalRaw = packManifest.totalSize;
	console.log(`\nTotal: ${(totalRaw / 1024 / 1024).toFixed(1)} MB raw → ${(totalZip / 1024 / 1024).toFixed(1)} MB zipped (${((1 - totalZip / totalRaw) * 100).toFixed(1)}% reduction)`);
}

main().catch(err => { console.error(err); process.exit(1); });
