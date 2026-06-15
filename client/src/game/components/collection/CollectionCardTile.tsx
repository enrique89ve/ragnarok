import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { motion } from "framer-motion";
import { getTypeIcon } from "../../utils/rarityUtils";
import { GameIcon } from "../../utils/ui/GameIcon";
import type { IconName } from "../../utils/ui/iconMap";
import { getCardArtPath } from "../../utils/art/artMapping";
import type { OwnedCard } from "../packs/types";
import { getCardById } from "../../data/allCards";
import type { NorseElement } from "../../types/NorseTypes";
import type { CardSize, CardStatsMode } from "../card/types";
import {
  CardFrame,
  CardArt,
  CardManaGem,
  CardNamePlate,
  CardCountBadge,
  CardTribeLine,
  CardDescription,
} from "../card";
import {
  collectionSourceLabel,
  type CollectionSource,
} from "./collectionAcquisition";
import { QA_FULL_CATALOG_LABEL } from "../../protocol/qaFullCatalogEntitlement";
import type { Rarity } from "@shared/schemas/rarity";
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

export type CollectionTileRenderedFields = {
  readonly tribe?: string;
  readonly keywords?: readonly string[];
  readonly description?: string;
  readonly keywordLimit?: number | null;
  readonly keywordLabelMode?: "full" | "compact";
  readonly showArt?: boolean;
  readonly showCount?: boolean;
  readonly showMana?: boolean;
  readonly showName?: boolean;
  readonly showRarity?: boolean;
  readonly showStats?: boolean;
};

interface CollectionCardTileProps {
  card: CollectionTileCard;
  dataCardSurface?: string;
  disableTooltips?: boolean;
  masteryTier?: number;
  classes?: CollectionTileClasses;
  frameClassName?: string;
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
  stats,
  statsMode = "frame",
}: CollectionCardTileProps) {
  const cardDef = getCardById(card.id);
  const element: NorseElement = card.element ??
    (cardDef && "element" in cardDef && cardDef.element
      ? (cardDef.element as NorseElement)
      : "neutral");
  const sourceLabel = getCollectionSourceLabel(card);
  const attackValue = stats?.attack ?? (
    card.attack !== undefined ? { value: card.attack, tone: "base" as const } : undefined
  );
  const healthValue = stats?.health ?? (
    card.health !== undefined ? { value: card.health, tone: "base" as const } : undefined
  );
  const hasCombatStats =
    fields?.showStats !== false &&
    attackValue !== undefined &&
    healthValue !== undefined;
  const statsLabel = hasCombatStats
    ? `${attackValue.value} ATK / ${healthValue.value} HP`
    : null;
  const frameTitle = [card.name, card.rarity, sourceLabel, statsLabel]
    .filter(Boolean)
    .join(" · ");
  const interactive = onClick !== undefined;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onClick();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={interactive ? { y: -3 } : undefined}
      whileFocus={interactive ? { y: -3 } : undefined}
      transition={{ duration: 0.18, ease: "easeOut" }}
      onClick={onClick}
      onKeyDown={interactive ? handleKeyDown : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role={interactive ? "button" : "img"}
      tabIndex={interactive ? 0 : undefined}
      className={[
        "norse-card-shell",
        `norse-card-shell--rarity-${card.rarity}`,
        "collection-card-shell",
        `collection-card-shell--rarity-${card.rarity}`,
        shellClassName,
      ].filter(Boolean).join(" ")}
      style={{ width: "100%", ...shellStyle }}
      title={frameTitle}
      aria-label={frameTitle}
    >
      <CardFrame
        shape="tile"
        rarity={card.rarity as Rarity}
        element={element}
        size={frameSize}
        render="css"
        interactive={false}
        isHighlighted={isHighlighted}
        isPlayable={isPlayable}
        disableTooltips={disableTooltips}
        statsMode={statsMode}
        data-card-surface={dataCardSurface}
        className={[
          "w-full norse-card-frame collection-card-frame",
          frameClassName,
        ].filter(Boolean).join(" ")}
        style={{ width: "100%", height: "auto", ...frameStyle }}
      >
        {fields?.showArt !== false && (
          <CardArt src={getCardArtPath(card.id) ?? undefined} alt={card.name} />
        )}
        {masteryTier >= 2 && (
          <div className={`mastery-badge mastery-tier-${masteryTier}`}>
            {Array.from({ length: masteryTier }).map((_, i) => (
              <GameIcon
                key={i}
                name="sparkles"
                size={12}
                className="mastery-star"
              />
            ))}
          </div>
        )}
        {fields?.showMana !== false && card.manaCost != null ? (
          <div className="collection-card-frame__mana-corner">
            <CardManaGem cost={card.manaCost} />
          </div>
        ) : fields?.showMana !== false ? (
          <div className="card-frame__type-icon" title={card.type}>
            <GameIcon name={getTypeIcon(card.type)} size={16} />
          </div>
        ) : null}
        {fields?.showCount !== false && (
          <CardCountBadge count={card.quantity} />
        )}
        {hasCombatStats && (
          <>
            <CollectionCardStatBadge kind="attack" stat={attackValue} />
            <CollectionCardStatBadge kind="health" stat={healthValue} />
          </>
        )}
        {fields?.showRarity !== false && <CollectionRarityMarker rarity={card.rarity as Rarity} />}
        {fields?.tribe && <CardTribeLine tribe={fields.tribe} />}
        <CardDescription
          description={fields?.description}
          keywords={fields?.keywords}
          keywordLimit={fields?.keywordLimit}
          keywordLabelMode={fields?.keywordLabelMode}
        />
        <div className={`card-frame__info-overlay ${classes.padding}`}>
          <div className="mt-auto">
            {fields?.showName !== false && (
              <div className="collection-card-frame__footer">
                <div className="collection-card-frame__name-wrap">
                  <CardNamePlate name={card.name} />
                </div>
              </div>
            )}
            {card.mintNumber != null && (
              <div className="text-center mt-1">
                <span className={`mint-badge ${classes.mint}`}>
                  #{card.mintNumber}
                  <span className="text-gray-500 mx-0.5">/</span>
                  {card.maxSupply?.toLocaleString() ?? "???"}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardFrame>
    </motion.div>
  );
}

function CollectionCardStatBadge({
  kind,
  stat,
}: {
  kind: "attack" | "health";
  stat: CollectionTileStatValue;
}) {
  const iconName: IconName = kind === "attack" ? "swords" : "heart";
  const label = kind === "attack" ? "ATK" : "HP";
  const tone = stat.tone ?? "base";

  return (
    <div
      className={`collection-card-frame__stat-badge collection-card-frame__stat-badge--${kind} collection-card-frame__stat-badge--${tone}`}
      aria-label={`${label} ${stat.value}`}
      title={`${label} ${stat.value}`}
    >
      <span className="collection-card-frame__stat-icon" aria-hidden="true">
        <GameIcon name={iconName} size={12} strokeWidth={2.6} />
      </span>
      <span className="collection-card-frame__stat-value">{stat.value}</span>
    </div>
  );
}

function CollectionRarityMarker({ rarity }: { rarity: Rarity }) {
  const markerShape = getCollectionRarityMarkerShape(rarity);

  return (
    <div
      className="collection-card-frame__rarity-marker"
      data-rarity={rarity}
      data-marker-shape={markerShape}
      aria-hidden="true"
    >
      <svg viewBox="0 0 44 16" focusable="false">
        <path
          className="collection-card-frame__rarity-marker-socket-shadow"
          d="M2.8 8H11.6L15.8 4.4H28.2L32.4 8H41.2L37.8 10.3H32L28.1 13.1H15.9L12 10.3H6.2Z"
        />
        <path
          className="collection-card-frame__rarity-marker-socket-wing"
          d="M4.2 8.1H12.6L16.3 5.1H27.7L31.4 8.1H39.8L37.2 9.7H30.9L27.3 12.3H16.7L13.1 9.7H6.8Z"
        />
        <path
          className="collection-card-frame__rarity-marker-socket-ridge"
          d="M6.2 7.6H12.3L16.1 4.8H27.9L31.7 7.6H37.8M6.2 9.6H12.1L16.1 12.2H27.9L31.9 9.6H37.8"
        />
        <path
          className="collection-card-frame__rarity-marker-socket-plate"
          d="M16.2 5.2H27.8L31.1 8.1L27.8 11H16.2L12.9 8.1Z"
        />
        <path
          className="collection-card-frame__rarity-marker-socket-glint"
          d="M16.8 5.8H27.2M16.8 10.4H27.2"
        />
        {markerShape === "diamond" && (
          <>
            <path
              className="collection-card-frame__rarity-marker-shape-shadow"
              d="M22 3 27 7.5 24.6 12.7H19.4L17 7.5Z"
            />
            <path
              className="collection-card-frame__rarity-marker-shape-core"
              d="M22 4.1 25.3 7.8 23.7 11.7H20.3L18.7 7.8Z"
            />
            <path
              className="collection-card-frame__rarity-marker-shape-facet"
              d="M22 4.1 23.4 7.8 22 11.7 20.6 7.8Z"
            />
            <path
              className="collection-card-frame__rarity-marker-shape-line"
              d="M18.7 7.8h6.6M20.6 7.8 20.3 11.7M23.4 7.8 23.7 11.7"
            />
          </>
        )}
        {markerShape === "rhombus" && (
          <>
            <path
              className="collection-card-frame__rarity-marker-shape-shadow"
              d="M22 3.5 27.2 8 22 12.5 16.8 8Z"
            />
            <path
              className="collection-card-frame__rarity-marker-shape-core"
              d="M22 4.6 25.4 8 22 11.4 18.6 8Z"
            />
            <path
              className="collection-card-frame__rarity-marker-shape-facet"
              d="M22 4.6 23.2 8 22 11.4 20.8 8Z"
            />
            <path
              className="collection-card-frame__rarity-marker-shape-line"
              d="M18.6 8h6.8M20.8 8 22 11.4M23.2 8 22 11.4"
            />
          </>
        )}
        {markerShape === "triangle" && (
          <>
            <path
              className="collection-card-frame__rarity-marker-shape-shadow"
              d="M22 3.8 27 12.2H17Z"
            />
            <path
              className="collection-card-frame__rarity-marker-shape-core"
              d="M22 5.2 25.4 11H18.6Z"
            />
            <path
              className="collection-card-frame__rarity-marker-shape-facet"
              d="M22 5.2 23 11H21Z"
            />
            <path
              className="collection-card-frame__rarity-marker-shape-line"
              d="M22 5.2v5.8M18.6 11l3.4-2.7 3.4 2.7"
            />
          </>
        )}
        {markerShape === "hexagon" && (
          <>
            <path
              className="collection-card-frame__rarity-marker-shape-shadow"
              d="M22 3.8 26.1 5.9V10.1L22 12.2 17.9 10.1V5.9Z"
            />
            <path
              className="collection-card-frame__rarity-marker-shape-core"
              d="M22 5.1 24.7 6.5V9.5L22 10.9 19.3 9.5V6.5Z"
            />
            <path
              className="collection-card-frame__rarity-marker-shape-facet"
              d="M22 5.1 23.1 6.5V9.5L22 10.9 20.9 9.5V6.5Z"
            />
            <path
              className="collection-card-frame__rarity-marker-shape-line"
              d="M19.3 6.5h5.4M19.3 9.5h5.4M22 5.1v5.8"
            />
          </>
        )}
      </svg>
    </div>
  );
}

function getCollectionRarityMarkerShape(
  rarity: Rarity,
): "diamond" | "rhombus" | "triangle" | "hexagon" {
  if (rarity === "mythic") return "diamond";
  if (rarity === "epic") return "rhombus";
  if (rarity === "rare") return "triangle";
  return "hexagon";
}
