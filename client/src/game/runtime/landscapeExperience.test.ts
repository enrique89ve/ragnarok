import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
	return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('landscape-first mobile experience contract', () => {
	it('declares landscape as the installed-app orientation', () => {
		const manifest = JSON.parse(source('client/public/manifest.json')) as { orientation?: string };
		expect(manifest.orientation).toBe('landscape');
	});

	it('wraps every live match route in the shared portrait lock', () => {
		const app = source('client/src/App.tsx');
		const gateStart = app.indexOf('<Route element={<GameOrientationGate><GameplayRuntimeBoundary /></GameOrientationGate>}>');
		const gateEnd = app.indexOf('\n\t\t\t\t\t\t\t\t</Route>', gateStart);
		const routedGameplay = app.slice(gateStart, gateEnd);

		expect(gateStart).toBeGreaterThan(-1);
		expect(gateEnd).toBeGreaterThan(gateStart);
		expect(routedGameplay).toContain('path={routes.singleGame}');
		expect(routedGameplay).toContain('path={routes.campaignGame}');
		expect(routedGameplay).toContain('path={routes.multiplayer}');

		const responsive = source('client/src/styles/landscape-responsive.css');
		expect(responsive).toContain('@media (orientation: portrait) and (max-width: 820px)');
		expect(responsive).toMatch(/\.game-orientation-content\s*\{[^}]*pointer-events:\s*none;[^}]*visibility:\s*hidden;/s);
		expect(responsive).toMatch(/\.game-orientation-lock\s*\{[^}]*display:\s*grid;/s);
		expect(responsive).toMatch(/\.game-orientation-card\s*\{[^}]*max-width:\s*100%;[^}]*box-sizing:\s*border-box;/s);
	});

	it('keeps warband and deck construction landscape-first on phones', () => {
		const army = source('client/src/game/components/ArmySelection.tsx');
		const armyCss = source('client/src/game/components/styles/ArmySelectionNorse.css');
		const deck = source('client/src/game/components/HeroDeckBuilder.tsx');
		const deckCss = source('client/src/game/components/deckbuilder/deckbuilder.css');

		expect(army).toContain('Warband setup opens in landscape.');
		expect(armyCss).toContain('@media (max-width: 767px) and (orientation: portrait)');
		expect(deck).toContain('Deck building is tuned for landscape.');
		expect(deckCss).toContain('@media (max-width: 767px) and (orientation: portrait)');
		expect(deckCss).toMatch(/\.deck-builder \.db-main-container\s*\{\s*display:\s*none;/s);
	});

	it('uses a side-by-side Atlas workspace on short landscape viewports', () => {
		const map = source('client/src/game/components/map/MapPage.tsx');
		const panel = source('client/src/game/components/map/MapLaunchPanel.tsx');
		const responsive = source('client/src/styles/landscape-responsive.css');

		expect(map).toContain('atlas-page-workspace');
		expect(map).toContain('atlas-map-stage');
		expect(panel).toContain('atlas-launch-panel');
		expect(responsive).toMatch(/@media \(orientation: landscape\) and \(max-height: 500px\) and \(max-width: 1024px\)[\s\S]*?\.atlas-page-workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) clamp\(15rem, 34vw, 18rem\);/);
	});
});
