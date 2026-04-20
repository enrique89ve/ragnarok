import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';

function trimGlobals(...sources) {
	const merged = {};
	for (const src of sources) {
		for (const [key, val] of Object.entries(src)) {
			merged[key.trim()] = val;
		}
	}
	return merged;
}

export default [
	js.configs.recommended,
	{
		ignores: [
			'node_modules/**',
			'dist/**',
			'assembly/**',
			'client/public/**',
			'mcp-server/**',
			'.vscode/**',
			'scripts/**',
			'**/*.d.ts',
			'**/*.{js,cjs,mjs}',
		],
	},
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaFeatures: { jsx: true },
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
			globals: {
				...trimGlobals(globals.browser, globals.node, globals.es2017),
				structuredClone: 'readonly',
				EventListener: 'readonly',
				React: 'readonly',
				JSX: 'readonly',
				NodeJS: 'readonly',
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
			react: reactPlugin,
		},
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': ['warn', {
				argsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
			}],
			'no-console': 'warn',
			'react/prop-types': 'off',
			'react/react-in-jsx-scope': 'off',
			'@typescript-eslint/no-explicit-any': 'warn',
			'complexity': ['warn', 15],
			'camelcase': ['error', { properties: 'never', allow: ['^card_', '^effect_'] }],
			'no-param-reassign': ['warn', { props: true, ignorePropertyModificationsFor: ['state', 'context', 'player', 'opponent'] }],
			'no-empty': 'warn',
			'no-case-declarations': 'warn',
		},
		settings: {
			react: { version: 'detect' },
		},
	},
];
