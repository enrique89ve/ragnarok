import type { CSSProperties } from "react";
import { getCardArtPath } from "../../utils/art/artMapping";
import { getTypeIcon } from "../../utils/rarityUtils";
import { getCardById } from "../../data/allCards";
import { GameIcon } from "../../utils/ui/GameIcon";
import type { IconName } from "../../utils/ui/iconMap";
import type { Rarity } from "@shared/schemas/rarity";
import {
  CardArt,
  CardBloodPrice,
  CardCountBadge,
  CardDescription,
  CardElementBadge,
  CardEvolutionStars,
  CardFrame,
  CardManaGem,
  CardNamePlate,
  CardPetStageBadge,
  CardRarityMark,
  CardTribeLine,
} from "../card";
import { toCardFrameType } from "../card/cardFrameProfile";
import {
  cardFrameSurfaceToPresentationSurface,
  getCardKeywordsForSurface,
} from "../card/cardPresentationContract";
import type { CardSize, CardStatsMode } from "../card/types";
import type { NorseElement } from "../../types/NorseTypes";
import type { CardData } from "../../types";
import type {
  CollectionTileCard,
  CollectionTileClasses,
  CollectionTileRenderedFields,
} from "./CollectionCardTile";
import type { CollectionCardRenderAdapter } from "./collectionCardRenderAdapter";

interface CollectionCardRendererProps {
  readonly adapter: CollectionCardRenderAdapter;
  readonly card: CollectionTileCard;
  readonly classes: CollectionTileClasses;
  readonly dataCardSurface?: string;
  readonly disableTooltips: boolean;
  readonly fields?: CollectionTileRenderedFields;
  readonly frameClassName?: string;
  readonly frameSize: CardSize;
  readonly frameStyle?: CSSProperties;
  readonly isHighlighted: boolean;
  readonly isPlayable: boolean;
  readonly masteryTier: number;
  readonly statsMode: CardStatsMode;
}

export function CollectionCardRenderer({
  adapter,
  card,
  classes,
  dataCardSurface,
  disableTooltips,
  fields,
  frameClassName,
  frameSize,
  frameStyle,
  isHighlighted,
  isPlayable,
  masteryTier,
  statsMode,
}: CollectionCardRendererProps) {
  const presentationSurface = cardFrameSurfaceToPresentationSurface(
    dataCardSurface ?? "collection",
  );
  const cardDefinition = getCardById(card.id);
  const renderedKeywords =
    fields?.keywords ??
    (presentationSurface === "collection"
      ? getCardKeywordsForSurface(cardDefinition?.keywords, presentationSurface)
      : []);
  const renderedDescription = fields?.showDescription
    ? fields.description ?? card.description ?? cardDefinition?.description
    : fields?.description;
  const keywordLabelMode = fields?.keywordLabelMode ?? "compact";
  const topChrome = resolveCardTopChrome(adapter.element, fields, cardDefinition);

  return (
    <CardFrame
      shape="tile"
      rarity={card.rarity as Rarity}
      element={adapter.element}
      cardType={toCardFrameType(card.type)}
      size={frameSize}
      render={adapter.frameRender}
      frameAsset={adapter.frameAsset}
      interactive={false}
      isHighlighted={isHighlighted}
      isPlayable={isPlayable}
      disableTooltips={disableTooltips}
      statsMode={statsMode}
      data-card-surface={dataCardSurface}
      className={[
        "w-full norse-card-frame collection-card-frame",
        `norse-card-frame--surface-${dataCardSurface ?? "collection"}`,
        `collection-card-frame--profile-${adapter.frameProfile.id}`,
        adapter.isPet ? "collection-card-frame--pet" : "",
        `collection-card-frame--contract-${adapter.contract}`,
        adapter.usesConceptPng ? "collection-card-frame--png-concept" : "",
        topChrome.showElementBadge ? "norse-card-frame--has-element" : "",
        topChrome.showBloodPrice ? "norse-card-frame--has-blood-price" : "",
        topChrome.showPetStage ? "norse-card-frame--has-pet-stage" : "",
        topChrome.showEvolutionStars ? "norse-card-frame--has-evolution" : "",
        frameClassName,
      ].filter(Boolean).join(" ")}
      style={{ width: "100%", height: "auto", ...frameStyle }}
    >
      {fields?.showArt !== false && (
        <CardArt src={getCardArtPath(card.id) ?? undefined} alt={card.name} />
      )}
      {masteryTier >= 2 && (
        <div className={`mastery-badge mastery-tier-${masteryTier}`}>
          {Array.from({ length: masteryTier }).map((_, index) => (
            <GameIcon
              key={index}
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
        <div
          className="card-frame__type-icon"
          title={dataCardSurface === "mulligan" ? undefined : card.type}
        >
          <GameIcon name={getTypeIcon(card.type)} size={16} />
        </div>
      ) : null}
      {topChrome.showElementBadge && (
        <CardElementBadge element={topChrome.element} />
      )}
      {(topChrome.showBloodPrice ||
        topChrome.showPetStage ||
        topChrome.showEvolutionStars) && (
        <div className="collection-card-frame__top-center">
          {topChrome.showBloodPrice && (
            <CardBloodPrice value={topChrome.bloodPrice} />
          )}
          {topChrome.showPetStage && (
            <CardPetStageBadge stage={topChrome.petStageNumber} />
          )}
          {topChrome.showEvolutionStars && (
            <CardEvolutionStars level={topChrome.evolutionLevel} />
          )}
        </div>
      )}
      {fields?.showCount !== false && <CardCountBadge count={card.quantity} />}
      {adapter.hasCombatStats && (
        <>
          <CollectionCardStatBadge
            kind="attack"
            stat={adapter.attackValue!}
            showNativeTitle={dataCardSurface !== "mulligan"}
          />
          <CollectionCardStatBadge
            kind="health"
            stat={adapter.healthValue!}
            showNativeTitle={dataCardSurface !== "mulligan"}
          />
        </>
      )}
      {fields?.showRarity !== false && <CardRarityMark />}
      <div className={`card-frame__info-overlay ${classes.padding}`}>
        <div className="collection-card-frame__lower-content">
          <CardDescription
            description={renderedDescription}
            keywords={renderedKeywords}
            keywordLimit={fields?.keywordLimit}
            keywordLabelMode={keywordLabelMode}
            surface={presentationSurface}
          />
          <div className="collection-card-frame__footer-rail">
            {(fields?.showName !== false || fields?.tribe) && (
              <div className="collection-card-frame__footer">
                {fields?.showName !== false && (
                  <div className="collection-card-frame__name-wrap">
                    <CardNamePlate name={card.name} />
                  </div>
                )}
                {fields?.tribe && <CardTribeLine tribe={fields.tribe} />}
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
      </div>
    </CardFrame>
  );
}

function readOptionalNumber(
  source: object | undefined,
  key: string,
): number | undefined {
  if (!source || !(key in source)) return undefined;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readOptionalString(
  source: object | undefined,
  key: string,
): string | undefined {
  if (!source || !(key in source)) return undefined;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function resolveCardTopChrome(
  element: NorseElement,
  fields: CollectionTileRenderedFields | undefined,
  cardDefinition: CardData | undefined,
) {
  const bloodPrice =
    fields?.bloodPrice ?? readOptionalNumber(cardDefinition, "bloodPrice") ?? 0;
  const petStageNumber = petStageToNumber(
    fields?.petStage ?? readOptionalString(cardDefinition, "petStage"),
  );
  const evolutionLevel =
    fields?.evolutionLevel ??
    readOptionalNumber(cardDefinition, "evolutionLevel") ??
    0;
  const showEvolution = fields?.showEvolution !== false;
  const showPetStage = showEvolution && petStageNumber > 0;
  return {
    element,
    showElementBadge: fields?.showElementBadge !== false && element !== "neutral",
    bloodPrice,
    showBloodPrice: fields?.showBloodPrice !== false && bloodPrice > 0,
    petStageNumber,
    showPetStage,
    evolutionLevel,
    showEvolutionStars: showEvolution && !showPetStage && evolutionLevel > 0,
  };
}

function petStageToNumber(stage: string | undefined): number {
  switch (stage) {
    case "basic":
      return 1;
    case "adept":
      return 2;
    case "master":
      return 3;
    default:
      return 0;
  }
}

function CollectionCardStatBadge({
  kind,
  stat,
  showNativeTitle,
}: {
  readonly kind: "attack" | "health";
  readonly stat: { readonly value: number | string; readonly tone?: string };
  readonly showNativeTitle: boolean;
}) {
  const iconName: IconName = kind === "attack" ? "swords" : "heart";
  const label = kind === "attack" ? "ATK" : "HP";
  const tone = stat.tone ?? "base";
  const digitCount = Math.min(2, String(stat.value).replace(/^-/, "").length);

  return (
    <div
      className={`collection-card-frame__stat-badge collection-card-frame__stat-badge--${kind} collection-card-frame__stat-badge--${tone}`}
      aria-label={`${label} ${stat.value}`}
      title={showNativeTitle ? `${label} ${stat.value}` : undefined}
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
