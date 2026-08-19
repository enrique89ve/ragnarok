import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { motion } from "framer-motion";
import type { OwnedCard } from "../packs/types";
import type { NorseElement } from "../../types/NorseTypes";
import type { CardFrameAsset, CardFrameRender, CardSize, CardStatsMode } from "../card/types";
import {
  collectionSourceLabel,
  type CollectionSource,
} from "./collectionAcquisition";
import { QA_FULL_CATALOG_LABEL } from "../../protocol/qaFullCatalogEntitlement";
import { CollectionCardRenderer } from "./CollectionCardRenderer";
import { resolveCollectionCardRenderAdapter } from "./collectionCardRenderAdapter";
import "./collection.css";

export type CollectionTileCard = OwnedCard & {
  collectionSource: CollectionSource;
  element?: NorseElement;
};

export interface CollectionTileClasses {
  padding: string;
  mint: string;
}

export type CollectionTileStatTone = "base" | "buffed" | "damaged" | "unknown";

export type CollectionTileStatValue = {
  readonly value: number | string;
  readonly tone?: CollectionTileStatTone;
};

export type CollectionTileStats = {
  readonly attack?: CollectionTileStatValue;
  readonly health?: CollectionTileStatValue;
};

export type CollectionTileSemanticMode = "content" | "presentation";

export type CollectionTileRenderedFields = {
  readonly tribe?: string;
  readonly keywords?: readonly string[];
  readonly description?: string;
  readonly keywordLimit?: number | null;
  readonly keywordLabelMode?: "full" | "compact";
  readonly showDescription?: boolean;
  readonly showArt?: boolean;
  readonly showCount?: boolean;
  readonly showMana?: boolean;
  readonly showName?: boolean;
  readonly showRarity?: boolean;
  readonly showStats?: boolean;
  readonly showElementBadge?: boolean;
  readonly showBloodPrice?: boolean;
  readonly showEvolution?: boolean;
  readonly bloodPrice?: number;
  readonly evolutionLevel?: number;
  readonly petStage?: string;
};

interface CollectionCardTileProps {
  card: CollectionTileCard;
  dataCardSurface?: string;
  disableTooltips?: boolean;
  masteryTier?: number;
  classes?: CollectionTileClasses;
  frameClassName?: string;
  frameAsset?: CardFrameAsset;
  frameRender?: CardFrameRender;
  frameStyle?: CSSProperties;
  fields?: CollectionTileRenderedFields;
  frameSize?: CardSize;
  isHighlighted?: boolean;
  isPlayable?: boolean;
  onClick?: () => void;
  onMouseEnter?: (event: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLDivElement>) => void;
  shellClassName?: string;
  shellStyle?: CSSProperties;
  semanticMode?: CollectionTileSemanticMode;
  stats?: CollectionTileStats;
  statsMode?: CardStatsMode;
}

const DEFAULT_CLASSES: CollectionTileClasses = {
  padding: "p-2.5",
  mint: "text-[9px]",
};

export const COLLECTION_CARD_MARKER_SPACE_PX = 6;

function getCollectionSourceLabel(card: CollectionTileCard): string {
  return collectionSourceLabel(
    card.collectionSource,
    QA_FULL_CATALOG_LABEL,
  );
}

export function CollectionCardTile({
  card,
  dataCardSurface,
  disableTooltips = false,
  masteryTier = 0,
  classes = DEFAULT_CLASSES,
  frameClassName,
  frameAsset,
  frameRender = "png",
  frameStyle,
  fields,
  frameSize = "medium",
  isHighlighted = false,
  isPlayable = true,
  onClick,
  onMouseEnter,
  onMouseLeave,
  shellClassName,
  shellStyle,
  semanticMode = "content",
  stats,
  statsMode = "frame",
}: CollectionCardTileProps) {
  // Collection tiles can enter with a small reveal. Gameplay cards must be
  // painted at their authored slot immediately: this component is also used
  // by the hand, battlefield, and poker surfaces, where an entry transform
  // changes the board geometry during a chess -> poker handoff.
  const cardSurface = dataCardSurface ?? "collection";
  const animateEntry = cardSurface === "collection";
  const presentationOnly = semanticMode === "presentation";
  const sourceLabel = getCollectionSourceLabel(card);
  const renderAdapter = resolveCollectionCardRenderAdapter({
    card,
    fields,
    frameAsset,
    frameRender,
    stats,
  });
  const statsLabel = renderAdapter.hasCombatStats
    ? `${renderAdapter.attackValue?.value} ATK / ${renderAdapter.healthValue?.value} HP`
    : null;
  const frameTitle = [card.name, card.rarity, sourceLabel, statsLabel]
    .filter(Boolean)
    .join(" · ");
  const interactive = !presentationOnly && onClick !== undefined;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onClick();
  };

  return (
    <motion.div
      initial={animateEntry ? { opacity: 0, scale: 0.9 } : false}
      animate={animateEntry ? { opacity: 1, scale: 1 } : undefined}
      whileHover={interactive ? { y: -3 } : undefined}
      whileFocus={interactive ? { y: -3 } : undefined}
      transition={{ duration: 0.18, ease: "easeOut" }}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role={presentationOnly ? undefined : interactive ? "button" : "img"}
      tabIndex={interactive ? 0 : undefined}
      className={[
        "norse-card-shell",
        `norse-card-shell--rarity-${card.rarity}`,
        "collection-card-shell",
        `collection-card-shell--rarity-${card.rarity}`,
        `collection-card-shell--surface-${cardSurface}`,
        `collection-card-shell--profile-${renderAdapter.frameProfile.id}`,
        `collection-card-shell--contract-${renderAdapter.contract}`,
        shellClassName,
      ].filter(Boolean).join(" ")}
      style={{ width: "100%", ...shellStyle }}
      title={presentationOnly ? undefined : frameTitle}
      aria-label={presentationOnly ? undefined : frameTitle}
      aria-hidden={presentationOnly ? true : undefined}
    >
      <CollectionCardRenderer
        adapter={renderAdapter}
        card={card}
        classes={classes}
        dataCardSurface={dataCardSurface}
        disableTooltips={disableTooltips}
        fields={fields}
        frameClassName={frameClassName}
        frameSize={frameSize}
        frameStyle={frameStyle}
        isHighlighted={isHighlighted}
        isPlayable={isPlayable}
        masteryTier={masteryTier}
        statsMode={statsMode}
      />
    </motion.div>
  );
}
