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
  getCardFrameProfile,
  toCardFrameType,
} from "../card/cardFrameProfile";
import {
  CardFrame,
  CardArt,
  CardManaGem,
  CardNamePlate,
  CardCountBadge,
  CardTribeLine,
  CardDescription,
  CardRarityMark,
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
  const frameProfile = getCardFrameProfile(card.type);
  const attackValue = stats?.attack ?? (
    card.attack !== undefined ? { value: card.attack, tone: "base" as const } : undefined
  );
  const healthValue = stats?.health ?? (
    card.health !== undefined ? { value: card.health, tone: "base" as const } : undefined
  );
  const hasCombatStats =
    fields?.showStats !== false &&
    frameProfile.showCombatStats &&
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
        `collection-card-shell--profile-${frameProfile.id}`,
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
        cardType={toCardFrameType(card.type)}
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
          `collection-card-frame--profile-${frameProfile.id}`,
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
        {fields?.showRarity !== false && <CardRarityMark />}
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
  const digitCount = Math.min(2, String(stat.value).replace(/^-/, "").length);

  return (
    <div
      className={`collection-card-frame__stat-badge collection-card-frame__stat-badge--${kind} collection-card-frame__stat-badge--${tone}`}
      aria-label={`${label} ${stat.value}`}
      title={`${label} ${stat.value}`}
    >
      <span className="collection-card-frame__stat-icon" aria-hidden="true">
        <GameIcon name={iconName} size={12} strokeWidth={2.6} />
      </span>
      <span
        className="collection-card-frame__stat-value"
        data-digit-count={digitCount}
      >
        {stat.value}
      </span>
    </div>
  );
}
