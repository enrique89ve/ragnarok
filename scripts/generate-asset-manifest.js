import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHEABLE_EXTS = new Set([
	'.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg',
	'.mp3', '.ogg', '.wav',
]);

const EXCLUDE_FILES = new Set(['asset-manifest.json']);

function getCanonicalNftFiles(publicDir) {
	const nftDir = path.join(publicDir, 'art', 'nfts');
	if (!fs.existsSync(nftDir)) {
		return new Set();
	}

	const entries = fs.readdirSync(nftDir, { withFileTypes: true });
	const nftFiles = entries
		.filter((entry) => entry.isFile())
		.filter((entry) => CACHEABLE_EXTS.has(path.extname(entry.name).toLowerCase()))
		.map((entry) => entry.name);

	return new Set(nftFiles);
}

function walk(dir, base, canonicalNftFiles) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const rel = base ? `${base}/${entry.name}` : entry.name;
		if (entry.isDirectory()) {
			files.push(...walk(path.join(dir, entry.name), rel, canonicalNftFiles));
		} else {
			const ext = path.extname(entry.name).toLowerCase();
			if (CACHEABLE_EXTS.has(ext) && !EXCLUDE_FILES.has(entry.name)) {
				const isLegacyRootArtCopy = base === 'art' && canonicalNftFiles.has(entry.name);
				if (isLegacyRootArtCopy) {
					continue;
				}

				const stats = fs.statSync(path.join(dir, entry.name));
				files.push({ path: `/${rel}`, size: stats.size });
			}
		}
	}
	return files;
}

let version = 'unknown';
try {
	version = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
	version = Date.now().toString(36);
}

const publicDir = path.resolve(__dirname, '../client/public');
const canonicalNftFiles = getCanonicalNftFiles(publicDir);
const files = walk(publicDir, '', canonicalNftFiles);

files.sort((a, b) => a.path.localeCompare(b.path));

const manifest = {
	version,
	generated: new Date().toISOString(),
	totalSize: files.reduce((sum, f) => sum + f.size, 0),
	totalFiles: files.length,
	files,
};

const outPath = path.join(publicDir, 'asset-manifest.json');
fs.writeFileSync(outPath, JSON.stringify(manifest));

const mb = (manifest.totalSize / (1024 * 1024)).toFixed(1);
// eslint-disable-next-line no-undef
console.log(`Asset manifest: ${manifest.totalFiles} files, ${mb} MB, version ${version}`);
