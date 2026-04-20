export default {
	'*.{ts,tsx}': ['node scripts/run-eslint.mjs --fix --max-warnings=-1'],
	'*.css': [
		'node scripts/check-css-infile-dupes.mjs',
		'node scripts/check-css-cross-file-dupes.mjs --files',
	],
};
