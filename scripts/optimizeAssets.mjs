#!/usr/bin/env node
/**
 * Asset Optimization Script
 * Converts PNGs to WebP (quality 95 — visually lossless)
 * Deletes dead textures from old holographic system
 * Fixes 4 misnamed PNG-as-webp files in art/
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync, unlinkSync, existsSync, statSync, readdirSync } from 'fs';
import { join, basename, extname } from 'path';

const PUBLIC = 'client/public';
const Q = 95; // webp quality — visually lossless for photos
let totalSaved = 0;

function sizeMB(bytes) { return (bytes / 1024 / 1024).toFixed(2); }

async function convertToWebp(srcPath, destPath, label) {
	if (!existsSync(srcPath)) {
		console.log(`  SKIP (not found): ${srcPath}`);
		return 0;
	}
	const before = statSync(srcPath).size;
	const buf = readFileSync(srcPath);
	const webpBuf = await sharp(buf).webp({ quality: Q, effort: 6 }).toBuffer();
	writeFileSync(destPath, webpBuf);
	const after = webpBuf.length;
	const saved = before - after;
	totalSaved += saved;
	console.log(`  ${label}: ${sizeMB(before)} MB → ${sizeMB(after)} MB (saved ${sizeMB(saved)} MB)`);

	// Delete original if dest is different path
	if (srcPath !== destPath) {
		unlinkSync(srcPath);
	}
	return saved;
}

async function convertInPlace(srcPath, label) {
	// For files that are PNG but named .webp — convert and overwrite
	if (!existsSync(srcPath)) {
		console.log(`  SKIP (not found): ${srcPath}`);
		return 0;
	}
	const before = statSync(srcPath).size;
	const buf = readFileSync(srcPath);
	const webpBuf = await sharp(buf).webp({ quality: Q, effort: 6 }).toBuffer();
	writeFileSync(srcPath, webpBuf);
	const after = webpBuf.length;
	const saved = before - after;
	totalSaved += saved;
	console.log(`  ${label}: ${sizeMB(before)} MB → ${sizeMB(after)} MB (saved ${sizeMB(saved)} MB)`);
	return saved;
}

function deleteFile(path, label) {
	if (!existsSync(path)) return 0;
	const size = statSync(path).size;
	unlinkSync(path);
	totalSaved += size;
	console.log(`  DEL ${label}: ${sizeMB(size)} MB`);
	return size;
}

async function main() {
	console.log('=== ASSET OPTIMIZATION ===\n');

	// 1. Delete dead textures (old holo system, unused 3D textures)
	console.log('1. Deleting dead textures...');
	const deadTextures = [
		'textures/foil.png',
		'textures/foil_epic.png',
		'textures/foil_mythic.png',
		'textures/foil_mythic_alt.png',
		'textures/epic_holographic.png',
		'textures/epic_holographic2.png',
		'textures/card_ao.jpg',
		'textures/card_emissive.jpg',
		'textures/card_normal.jpg',
		'textures/card_placeholder.jpg',
		'textures/card_roughness.jpg',
		'textures/card_specular.jpg',
		'textures/asphalt.png',
		'textures/sand.jpg',
		'textures/wood.jpg',
		'textures/sky.png',
		'textures/grass.png',
		'textures/gods/odin.png',
	];
	for (const f of deadTextures) {
		deleteFile(join(PUBLIC, f), f);
	}

	// 2. Convert king portraits PNG → webp (keep original dimensions)
	console.log('\n2. Converting king portraits PNG → webp...');
	const kingPngs = readdirSync(join(PUBLIC, 'portraits/kings'))
		.filter(f => f.endsWith('.png'));
	for (const f of kingPngs) {
		const src = join(PUBLIC, 'portraits/kings', f);
		const dest = join(PUBLIC, 'portraits/kings', f.replace('.png', '.webp'));
		await convertToWebp(src, dest, `kings/${f}`);
	}

	// 3. Convert element textures PNG → webp
	console.log('\n3. Converting element textures PNG → webp...');
	const elemDir = join(PUBLIC, 'textures/elements');
	if (existsSync(elemDir)) {
		const elems = readdirSync(elemDir).filter(f => f.endsWith('.png'));
		for (const f of elems) {
			const src = join(PUBLIC, 'textures/elements', f);
			const dest = join(PUBLIC, 'textures/elements', f.replace('.png', '.webp'));
			await convertToWebp(src, dest, `elements/${f}`);
		}
	}

	// 4. Convert board texture PNG → webp
	console.log('\n4. Converting board texture PNG → webp...');
	await convertToWebp(
		join(PUBLIC, 'textures/norse_rune_stone_game_board.png'),
		join(PUBLIC, 'textures/norse_rune_stone_game_board.webp'),
		'norse_rune_stone_game_board'
	);

	// 5. Convert class icons PNG → webp
	console.log('\n5. Converting class icons PNG → webp...');
	const iconDir = join(PUBLIC, 'icons/class');
	if (existsSync(iconDir)) {
		const icons = readdirSync(iconDir).filter(f => f.endsWith('.png'));
		for (const f of icons) {
			const src = join(PUBLIC, 'icons/class', f);
			const dest = join(PUBLIC, 'icons/class', f.replace('.png', '.webp'));
			await convertToWebp(src, dest, `icons/${f}`);
		}
	}

	// 6. Fix 4 misnamed PNG-as-webp files in art/
	console.log('\n6. Fixing misnamed PNG-as-webp files...');
	const fakeWebps = [
		'art/audumbla-cow.webp',
		'art/ginnungagap-void.webp',
		'art/jut.webp',
		'art/yggdrasil-new.webp',
	];
	for (const f of fakeWebps) {
		await convertInPlace(join(PUBLIC, f), f);
	}

	// 7. Convert the lone PNG in art/
	console.log('\n7. Converting demon_lord_helheim.png → webp...');
	await convertToWebp(
		join(PUBLIC, 'art/demon_lord_helheim.png'),
		join(PUBLIC, 'art/demon_lord_helheim.webp'),
		'demon_lord_helheim'
	);

	// 8. Convert glitter texture (71KB PNG, still in use by holo system)
	console.log('\n8. Converting glitter texture...');
	await convertToWebp(
		join(PUBLIC, 'art/textures/glitter-256.png'),
		join(PUBLIC, 'art/textures/glitter-256.webp'),
		'glitter-256'
	);

	console.log(`\n=== TOTAL SAVED: ${sizeMB(totalSaved)} MB ===`);
	console.log('\nNext: update code references (.png → .webp) and regenerate asset manifest.');
}

main().catch(err => { console.error(err); process.exit(1); });
