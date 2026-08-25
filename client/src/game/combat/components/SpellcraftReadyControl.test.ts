import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SpellcraftReadyControl } from './SpellcraftReadyControl';

describe('SpellcraftReadyControl', () => {
	it('renders an explicit accessible Ready control for the local decision window', () => {
		const html = renderToStaticMarkup(React.createElement(SpellcraftReadyControl, {
			view: { status: 'deciding', canPlayCards: true, canSubmitReady: true },
			onReady: () => undefined,
		}));

		expect(html).toContain('aria-label="Spellcraft controls"');
		expect(html).toContain('aria-label="Ready — finish Spellcraft"');
		expect(html).toContain('data-zone="betting-panel"');
		expect(html).toContain('class="spellcraft-ready-panel"');
		expect(html).not.toContain('class="betting-panel');
		expect(html).toContain('Play any affordable cards, then finish Spellcraft.');
		expect(html).not.toContain('disabled=""');
	});

	it('keeps the P2P Ready control visible but disabled until wire synchronization exists', () => {
		const html = renderToStaticMarkup(React.createElement(SpellcraftReadyControl, {
			view: { status: 'deciding', canPlayCards: true, canSubmitReady: false },
			onReady: () => undefined,
		}));

		expect(html).toContain('Ready sync pending');
		expect(html).toContain('disabled=""');
	});
});
