import { getCardById } from "../../data/allCards";
import type { NorseElement } from "../../types/NorseTypes";
import type {
  CardFrameAsset,
  CardFrameRender,
} from "../card/types";
import { getCardFrameProfile } from "../card/cardFrameProfile";
import type {
  CollectionTileCard,
  CollectionTileRenderedFields,
  CollectionTileStatValue,
  CollectionTileStats,
} from "./CollectionCardTile";

export type CollectionCardRenderContract =
  | "minion"
  | "pet"
  | "spell"
  | "weapon"
  | "support";

export interface CollectionCardRenderAdapter {
  readonly contract: CollectionCardRenderContract;
  readonly element: NorseElement;
  readonly frameAsset: CardFrameAsset;
  readonly frameRender: CardFrameRender;
  readonly usesConceptPng: boolean;
  readonly frameProfile: ReturnType<typeof getCardFrameProfile>;
  readonly isPet: boolean;
  readonly attackValue?: CollectionTileStatValue;
  readonly healthValue?: CollectionTileStatValue;
  readonly hasCombatStats: boolean;
}

export type CollectionCardRenderInputCard = Omit<
  CollectionTileCard,
  "attack" | "health"
> & {
  readonly attack?: number | null;
  readonly health?: number | null;
};

export interface CollectionCardRenderAdapterInput {
  readonly card: CollectionCardRenderInputCard;
  readonly fields?: CollectionTileRenderedFields;
  readonly frameAsset?: CardFrameAsset;
  readonly frameRender?: CardFrameRender;
  readonly stats?: CollectionTileStats;
}

function resolveElement(card: CollectionCardRenderInputCard): NorseElement {
  const cardDefinition = getCardById(card.id);
  if (card.element) return card.element;
  if (
    cardDefinition &&
    "element" in cardDefinition &&
    cardDefinition.element
  ) {
    return cardDefinition.element as NorseElement;
  }
  return "neutral";
}

function resolveCombatStat(
  override: CollectionTileStatValue | undefined,
  cardStat: unknown,
): CollectionTileStatValue | undefined {
  if (override && isRenderableStatValue(override.value)) return override;
  return typeof cardStat === "number" && Number.isFinite(cardStat)
    ? { value: cardStat, tone: "base" }
    : undefined;
}

function isRenderableStatValue(value: unknown): value is number | string {
  return (
    (typeof value === "number" && Number.isFinite(value)) ||
    (typeof value === "string" && value.trim().length > 0)
  );
}

function resolveFrameAsset(
  requestedFrameAsset: CardFrameAsset | undefined,
  hasCombatStats: boolean,
): CardFrameAsset {
  if (requestedFrameAsset === "rarity-element") return requestedFrameAsset;
  const useGameplayFrame =
    requestedFrameAsset === "minimal-war-table-v5-gameplay" ||
    requestedFrameAsset === "minimal-war-table-v5-gameplay-clean";
  if (useGameplayFrame) {
    return hasCombatStats
      ? "minimal-war-table-v5-gameplay"
      : "minimal-war-table-v5-gameplay-clean";
  }
  return hasCombatStats ? "minimal-war-table-v4" : "minimal-war-table-v4-clean";
}

export function resolveCollectionCardRenderAdapter({
  card,
  fields,
  frameAsset,
  frameRender = "png",
  stats,
}: CollectionCardRenderAdapterInput): CollectionCardRenderAdapter {
  const cardDefinition = getCardById(card.id);
  const isPet =
    cardDefinition !== undefined &&
    "petStage" in cardDefinition &&
    typeof cardDefinition.petStage === "string";
  const frameProfile = getCardFrameProfile(card.type);
  const attackValue = resolveCombatStat(stats?.attack, card.attack);
  const healthValue = resolveCombatStat(stats?.health, card.health);
  const hasCombatStats =
    fields?.showStats !== false &&
    frameProfile.showCombatStats &&
    attackValue !== undefined &&
    healthValue !== undefined;
  const resolvedFrameAsset = resolveFrameAsset(frameAsset, hasCombatStats);

  return {
    contract: isPet ? "pet" : frameProfile.id,
    element: resolveElement(card),
    frameAsset: resolvedFrameAsset,
    frameRender,
    usesConceptPng:
      frameRender === "png" &&
      resolvedFrameAsset !== "rarity-element",
    frameProfile,
    isPet,
    attackValue,
    healthValue,
    hasCombatStats,
  };
}
