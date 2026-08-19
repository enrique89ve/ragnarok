import { describe, expect, it } from "vitest";
import {
  resolveCollectionCardRenderAdapter,
  type CollectionCardRenderInputCard,
} from "./collectionCardRenderAdapter";
import { resolveSimpleCardFrameLayoutAdapter } from "../card/cardFrameLayoutAdapter";
import {
	adaptCardKeywordsForPresentation,
	splitKeywordRows,
} from "../card/cardKeywordPresentationAdapter";

function createCard(
  overrides: Partial<CollectionCardRenderInputCard> = {},
): CollectionCardRenderInputCard {
  return {
    id: -1,
    name: "Contract test card",
    rarity: "common",
    type: "minion",
    heroClass: "neutral",
    quantity: 1,
    collectionSource: "starter",
    manaCost: 0,
    ...overrides,
  };
}

describe("collection card render adapter", () => {
  it("uses the socket frame only when attack and health are rendered", () => {
    const adapter = resolveCollectionCardRenderAdapter({
      card: createCard({ attack: 4, health: 6 }),
    });

    expect(adapter.hasCombatStats).toBe(true);
    expect(adapter.frameAsset).toBe("minimal-war-table-v4");
  });

  it("uses the clean frame when a hero has mana but no combat stats", () => {
    const adapter = resolveCollectionCardRenderAdapter({
      card: createCard({ type: "hero", manaCost: 6 }),
    });

    expect(adapter.hasCombatStats).toBe(false);
    expect(adapter.frameAsset).toBe("minimal-war-table-v4-clean");
  });

  it("uses the clean frame when either combat stat is missing", () => {
    const adapter = resolveCollectionCardRenderAdapter({
      card: createCard({ attack: 4 }),
    });

    expect(adapter.hasCombatStats).toBe(false);
    expect(adapter.frameAsset).toBe("minimal-war-table-v4-clean");
  });

  it("treats runtime null stats as absent", () => {
    const adapter = resolveCollectionCardRenderAdapter({
      card: createCard({ attack: 4, health: null }),
    });

    expect(adapter.hasCombatStats).toBe(false);
    expect(adapter.frameAsset).toBe("minimal-war-table-v4-clean");
  });

  it("uses the clean frame when combat stats are intentionally hidden", () => {
    const adapter = resolveCollectionCardRenderAdapter({
      card: createCard({ attack: 4, health: 6 }),
      fields: { showStats: false },
    });

    expect(adapter.hasCombatStats).toBe(false);
    expect(adapter.frameAsset).toBe("minimal-war-table-v4-clean");
  });

  it("preserves the gameplay frame family for cards with combat stats", () => {
    const adapter = resolveCollectionCardRenderAdapter({
      card: createCard({ attack: 4, health: 6 }),
      frameAsset: "minimal-war-table-v5-gameplay",
    });

    expect(adapter.frameAsset).toBe("minimal-war-table-v5-gameplay");
  });

  it("selects the clean gameplay pair when combat stats are absent", () => {
    const adapter = resolveCollectionCardRenderAdapter({
      card: createCard({ type: "spell" }),
      frameAsset: "minimal-war-table-v5-gameplay",
    });

    expect(adapter.frameAsset).toBe("minimal-war-table-v5-gameplay-clean");
  });
});

describe("gameplay card frame selection", () => {
	it("keeps battlefield cards to stats and keyword symbols", () => {
		const adapter = resolveSimpleCardFrameLayoutAdapter({
			size: "medium",
			statsMode: "battlefield",
			showDescription: true,
			cardType: "minion",
		});

		expect(adapter.surface).toBe("battlefield");
		expect(adapter.showDescriptionText).toBe(false);
		expect(adapter.showName).toBe(false);
		expect(adapter.showKeywords).toBe(true);
		expect(adapter.showElementBadge).toBe(true);
		expect(adapter.showBloodPrice).toBe(true);
		expect(adapter.showEvolution).toBe(false);
		expect(adapter.keywordLabelMode).toBe("compact");
	});

	it("keeps compact deck cards clean while preserving hover identity", () => {
		const adapter = resolveSimpleCardFrameLayoutAdapter({
			size: "small",
			statsMode: "frame",
			showDescription: false,
			cardType: "minion",
		});

		expect(adapter.surface).toBe("compact");
		expect(adapter.showName).toBe(false);
		expect(adapter.showKeywords).toBe(true);
		expect(adapter.showElementBadge).toBe(true);
		expect(adapter.showEvolution).toBe(true);
	});

	it("uses the enlarged socket frame for gameplay minions", () => {
    const adapter = resolveSimpleCardFrameLayoutAdapter({
      size: "medium",
      statsMode: "frame",
      showDescription: false,
      cardType: "minion",
    });

    expect(adapter.surface).toBe("gameplay");
    expect(adapter.frameAsset).toBe("minimal-war-table-v5-gameplay");
    expect(adapter.showElementBadge).toBe(true);
    expect(adapter.showEvolution).toBe(true);
  });

  it("uses the clean enlarged-mana frame for compact gameplay spells", () => {
    const adapter = resolveSimpleCardFrameLayoutAdapter({
      size: "small",
      statsMode: "hidden",
      showDescription: false,
      cardType: "spell",
    });

    expect(adapter.surface).toBe("compact");
    expect(adapter.frameAsset).toBe("minimal-war-table-v5-gameplay-clean");
  });

  it("keeps the denser frame outside gameplay", () => {
    const adapter = resolveSimpleCardFrameLayoutAdapter({
      size: "medium",
      statsMode: "frame",
      showDescription: false,
      cardType: "minion",
      surface: "collection",
    });

    expect(adapter.frameAsset).toBe("minimal-war-table-v4");
  });
});

describe("card keyword presentation adapter", () => {
  it("uses the Canvas compact labels, priority and gameplay limit", () => {
    const presentation = adaptCardKeywordsForPresentation({
      keywords: ["battlecry", "deathrattle", "taunt", "aura", "taunt"],
      surface: "gameplay",
    });

    expect(presentation.entries.map((entry) => entry.keyword)).toEqual([
      "taunt",
      "deathrattle",
      "aura",
    ]);
    expect(presentation.entries.map((entry) => entry.displayLabel)).toEqual([
      "TAUNT",
      "D.RTL",
      "AURA",
    ]);
    expect(presentation.hiddenCount).toBe(0);
    expect(presentation.hiddenSummary).toBe("");
  });

  it("stacks five painted keywords as two above and three below", () => {
    const presentation = adaptCardKeywordsForPresentation({
      keywords: ["taunt", "divine_shield", "lifesteal", "rush", "windfury"],
      surface: "collection",
    });
    const rows = splitKeywordRows(presentation.entries);

    expect(presentation.entries).toHaveLength(5);
    expect(rows.map((row) => row.map((entry) => entry.keyword))).toEqual([
      ["taunt", "divine_shield"],
      ["lifesteal", "rush", "windfury"],
    ]);
  });

  it("stacks four painted keywords as two rows of two", () => {
    const presentation = adaptCardKeywordsForPresentation({
      keywords: ["taunt", "divine_shield", "windfury", "charge"],
      surface: "collection",
    });
    const rows = splitKeywordRows(presentation.entries);

    expect(rows.map((row) => row.map((entry) => entry.keyword))).toEqual([
      ["taunt", "divine_shield"],
      ["windfury", "charge"],
    ]);
  });
});
