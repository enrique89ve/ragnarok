import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
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

// ─── Match-mode isolation ────────────────────────────────────────────────────
// Each match mode (single / campaign / p2p) lives in its own folder under
// client/src/game/match/modes/. A file inside modes/<mode>/ may import from:
//   - the neutral match surface (match/types, match/store, match/derived,
//     match/onWinDispatch, match/economy)
//   - its OWN files (relative siblings in modes/<mode>/)
// It MUST NOT reach across to a sibling mode. Cross-mode coordination flows
// through the neutral dispatchers (match/derived.ts, match/onWinDispatch.ts).
//
// Why: the historical coordinator branched on isCampaign / isP2PConnected
// scattered through one file. Each new mode forced a new conditional and
// silent cross-mode bugs (e.g. campaign reward dispatched from a P2P match)
// were caught only by code review. Physical separation + this lint guard
// keeps the boundary load-bearing as future modes (tutorial, puzzle, daily,
// ranked) land.
//
// The dispatchers and barrel (match/derived.ts, match/onWinDispatch.ts,
// match/legacySynth.ts, match/index.ts) live OUTSIDE modes/, so they are
// already out of scope for these rules — no allow-list needed.
// ─────────────────────────────────────────────────────────────────────────────
function modeIsolationRule(thisMode, otherModes) {
	const groupPatterns = otherModes.flatMap((mode) => [
		`../${mode}/**`,
		`@/game/match/modes/${mode}/**`,
	]);
	const others = otherModes.join(',');
	return {
		files: [`client/src/game/match/modes/${thisMode}/**/*.{ts,tsx}`],
		rules: {
			'no-restricted-imports': ['error', {
				patterns: [
					{
						group: groupPatterns,
						message:
							`modes/${thisMode} cannot import from modes/{${others}}. ` +
							'Cross-mode coordination must go through neutral surface ' +
							'(match/derived.ts, match/onWinDispatch.ts) — these dispatchers ' +
							'live outside modes/ and are responsible for picking the right ' +
							'mode-specific implementation at call time.',
					},
				],
			}],
		},
	};
}

const matchModeIsolationRules = [
	modeIsolationRule('single', ['campaign', 'p2p']),
	modeIsolationRule('campaign', ['single', 'p2p']),
	modeIsolationRule('p2p', ['single', 'campaign']),
];

// ─── Pure-derivation purity ──────────────────────────────────────────────────
// match/derived.ts (and any future match/derived/**) are pure value derivers
// from MatchContext. They MUST NOT import:
//   - any Zustand store (game/stores/**, lib/stores/**, match/store)
//   - any *Dispatch.ts file (those import lifecycle handlers that touch
//     Zustand persist middleware, which calls localStorage at module-init
//     and crashes Node-env vitest, web workers, and SSR builds)
//   - the legacy bridge (same transitive impurity)
//
// Why this matters at scale (NOT just for vitest):
//   - P2P replay determinism: a deriver that reads useStore.getState()
//     gets the value AT REPLAY TIME, not at match time → replay diverges
//     from grabación. Lint prevents the bug by construction.
//   - Web workers: a future AI scoring worker has no localStorage; any
//     transitive store import bricks the worker.
//   - SSR / edge runtime: same module-init crash as Node vitest.
//
// What goes where:
//   match/derived.ts         → pure (input → value), this rule applies
//   match/*Dispatch.ts       → impure (input → side-effect callback), excluded
//   match/modes/{X}/lifecycle.ts → impure handlers, excluded
// ─────────────────────────────────────────────────────────────────────────────
const pureDerivationRules = [
	{
		files: [
			'client/src/game/match/derived.ts',
			'client/src/game/match/derived/**/*.{ts,tsx}',
		],
		rules: {
			'no-restricted-imports': ['error', {
				patterns: [
					{
						group: [
							'**/stores/**',
							'**/lib/stores/**',
							'./store',
							'../store',
							'./onWinDispatch',
							'./*Dispatch',
							'**/legacyBridge',
							'**/campaign/campaignStore',
						],
						message:
							'Pure derivers must not import stores or *Dispatch modules. ' +
							'Take MatchContext by parameter; side effects belong in ' +
							'*Dispatch.ts files (see docs/LAYER_GLOSSARY.md → Mode lifecycle ' +
							'dispatcher). This rule prevents Zustand persist module-init ' +
							'crashes in Node/SSR/workers and protects P2P replay determinism.',
					},
				],
			}],
		},
	},
];

// ─── Layer contract ───────────────────────────────────────────────────────────
// game/stores/ and game/core/ are pure logic — they cannot reach into the UI
// layer (components/). UI feedback must flow through GameEventBus so the visual
// widget can be swapped without touching game logic (e.g. future LOL-style banners).
//
// shared/ is the portable protocol-core layer: it must stay free of any
// client/-only imports so the rule predicates can be reused by P2P validators
// and a future server-side checker.
// ─────────────────────────────────────────────────────────────────────────────
const layerContractRules = [
	{
		files: [
			'client/src/game/stores/**/*.{ts,tsx}',
			'client/src/game/core/**/*.{ts,tsx}',
		],
		rules: {
			'no-restricted-imports': ['error', {
				patterns: [
					{
						group: ['**/components/**', '@/game/components/**'],
						message:
							'game/stores and game/core cannot import from components/. ' +
							'For UI feedback emit GameEventBus.emitNotification() — ' +
							'the NotificationSubscriber routes it to the active banner.',
					},
				],
			}],
		},
	},
	{
		files: ['shared/**/*.{ts,tsx}'],
		rules: {
			'no-restricted-imports': ['error', {
				patterns: [
					{
						group: ['@/*', '@/**', '**/client/**'],
						message:
							'shared/ cannot import from client/ — it must stay portable for ' +
							'P2P / server-side consumers. Move the type or constant into ' +
							'shared/protocol-core/ and import it from there.',
					},
				],
			}],
		},
	},
];

export default [
	js.configs.recommended,
	...layerContractRules,
	...matchModeIsolationRules,
	...pureDerivationRules,
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
			'react-hooks': reactHooks,
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
			...reactHooks.configs.recommended.rules,
		},
		settings: {
			react: { version: 'detect' },
		},
	},
	{
		files: ['client/**/*.tsx'],
		ignores: ['client/src/game/config/buildMode.ts'],
		rules: {
			'no-restricted-syntax': ['error', {
				selector: "MemberExpression[object.object.type='MetaProperty'][object.property.name='env'][property.name='DEV']",
				message: 'Do not read import.meta.env.DEV in TSX. Use isDevBuild() from client/src/game/config/buildMode.ts.',
			}, {
				selector: "MemberExpression[object.object.type='MetaProperty'][object.property.name='env'][property.name='PROD']",
				message: 'Do not read import.meta.env.PROD in TSX. Use isProdBuild() from client/src/game/config/buildMode.ts.',
			}],
		},
	},
];
