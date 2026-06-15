import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, HeartPulse, Layers3, RotateCw, Search, Shield, Sparkles } from 'lucide-react';
import { ChessPieceType, ArmySelection as ArmySelectionType, ChessPieceHero, PIECE_BASE_STATS } from '../types/ChessTypes';
import { CHESS_PIECE_HEROES, getDefaultArmySelection, pieceHasSpells } from '../data/ChessPieceConfig';
import { useAudio } from '../../lib/stores/useAudio';
import useGame from '../../lib/stores/useGame';
import { DeckInfo } from '../types';
import { HeroDeckBuilder } from './HeroDeckBuilder';
import { useHeroDeckStore, PieceType } from '../stores/heroDeckStore';
import { HeroDetailPopup } from './HeroDetailPopup';
import { ALL_NORSE_HEROES } from '../data/norseHeroes';
import { preloadImages } from '../utils/assetPreloader';
import { resolveHeroPortrait } from '../utils/art/artMapping';
import { HeroArtImage } from './ui/HeroArtImage';
import { parseNorseElement, type NorseElement } from '../types/NorseTypes';
import { getHeroEditionTier, HERO_TIER_UI } from '../utils/heroRarity';
import { getNFTBridge } from '../nft';
import { useNFTCollection, useNFTUsername } from '../nft/hooks';
import { getHeroDeckStatus, type HeroDeckStatus } from '../deck/heroDeckRules';
import { cardRegistry } from '../data/cardRegistry';
import { AccountSlot } from '../../components/account/AccountSlot';
import { debug } from '../config/debugConfig';
import { useMatchmaking } from '../hooks/useMatchmaking';
import { usePeerStore } from '../stores/peerStore';
import { toast } from 'sonner';
import { PIECE_COLOR_BY_TYPE } from './chess/pieceVisuals';
import { PieceGlyph } from './chess/PieceGlyph';
import './styles/ArmySelectionNorse.css';

interface ArmySelectionProps {
  onComplete: (army: ArmySelectionType) => void;
  onQuickStart?: (army: ArmySelectionType, deckCardIds: number[]) => void;
  onBack?: () => void;
  isMultiplayer?: boolean;
  onMatchmakingStart?: (army: ArmySelectionType) => void | Promise<void>;
  modeSwitch?: React.ReactNode;
}

const PIECE_ORDER: ChessPieceType[] = ['king', 'queen', 'rook', 'bishop', 'knight'];

const PIECE_DISPLAY_INFO: Record<ChessPieceType, { name: string; domain: string; rune: string }> = {
  king: { name: 'Protogenoi', domain: "Odin's Domain", rune: 'ᚲ' },
  queen: { name: 'Sovereign', domain: "Freya's Domain", rune: 'ᛗ' },
  rook: { name: 'Shaper', domain: "Thor's Domain", rune: 'ᚦ' },
  bishop: { name: 'Luminary', domain: "Frigg's Domain", rune: 'ᛒ' },
  knight: { name: 'Ethereal', domain: "Loki's Domain", rune: 'ᛚ' },
  pawn: { name: 'Demigod', domain: 'Common Folk', rune: 'ᛈ' }
};

const MAJOR_PIECES: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];
const CARD_BY_ID = new Map<number, (typeof cardRegistry)[number]>(
  cardRegistry.map(card => [Number(card.id), card]),
);

const NORSE_ELEMENT_DISPLAY: Record<NorseElement, { readonly label: string; readonly sigil: string }> = {
  fire: { label: 'Fire', sigil: 'FIR' },
  water: { label: 'Water', sigil: 'WTR' },
  grass: { label: 'Wild', sigil: 'WLD' },
  electric: { label: 'Storm', sigil: 'STM' },
  light: { label: 'Light', sigil: 'LGT' },
  dark: { label: 'Dark', sigil: 'DRK' },
  ice: { label: 'Frost', sigil: 'ICE' },
  neutral: { label: 'Neutral', sigil: 'NEU' },
};

type DeckDisplayStatus = {
  readonly cardCount: number;
  readonly isComplete: boolean;
  readonly label: string;
  readonly status: HeroDeckStatus;
};

function getDeckStatusLabel(status: HeroDeckStatus): string {
  switch (status.kind) {
    case 'ready':
      return `${status.cardCount}/30`;
    case 'missing':
      return 'Missing';
    case 'piece_mismatch':
      return 'Wrong Piece';
    case 'hero_mismatch':
      return 'Wrong Hero';
    case 'class_mismatch':
      return 'Wrong Class';
    case 'incomplete':
      return `${status.cardCount}/30`;
    case 'invalid':
      return 'Invalid';
  }
}

const ArmySelection: React.FC<ArmySelectionProps> = ({ onComplete, onQuickStart, onBack, isMultiplayer = false, onMatchmakingStart, modeSwitch }) => {
  const { playSoundEffect } = useAudio();
  const setSelectedHero = useGame(state => state.setSelectedHero);
  const savedDecks = useGame(state => state.savedDecks);
  const [army, setArmy] = useState<ArmySelectionType>(getDefaultArmySelection());
  const [selectedPieceType, setSelectedPieceType] = useState<ChessPieceType>('king');
  const [deckBuilderOpen, setDeckBuilderOpen] = useState<PieceType | null>(null);
  const [popupHero, setPopupHero] = useState<ChessPieceHero | null>(null);
  const [matchmakingStarting, setMatchmakingStarting] = useState(false);

  const heroDecks = useHeroDeckStore(state => state.decks);
  const loadFromStorage = useHeroDeckStore(state => state.loadFromStorage);
  const hiveUsername = useNFTUsername();
  const nftCollection = useNFTCollection();

  const myPeerId = usePeerStore(state => state.myPeerId);
  const prepareForMatchmaking = usePeerStore(state => state.prepareForMatchmaking);
  const { status: matchmakingStatus, queuePosition, joinQueue, leaveQueue, error: matchmakingError } = useMatchmaking();
  const [loadedHeroArtIds, setLoadedHeroArtIds] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    debug.log(`[ArmySelection] Card registry has ${cardRegistry.length} cards`);

    // Preload hero portraits so grid images appear instantly
    const heroArtPaths: string[] = [];
    for (const hero of Object.values(ALL_NORSE_HEROES)) {
      const art = resolveHeroPortrait(hero.id);
      if (art) heroArtPaths.push(art);
    }
    preloadImages(heroArtPaths);
  }, []);

  const markHeroArtReady = useCallback((heroId: string) => {
    setLoadedHeroArtIds(prev => {
      if (prev.has(heroId)) return prev;
      const next = new Set(prev);
      next.add(heroId);
      return next;
    });
  }, []);

  const validDecks = useMemo(() => {
    return Array.isArray(savedDecks) ? savedDecks.filter(d => d && typeof d === 'object') : [];
  }, [savedDecks]);

  const handleQuickStart = (deck: DeckInfo) => {
    if (!onQuickStart || !isArmyComplete) return;
    const cardIds: number[] = [];
    for (const [id, count] of Object.entries(deck.cards || {})) {
      const cardId = parseInt(id, 10);
      const cardCount = typeof count === 'number' ? Math.floor(count) : 0;
      if (!isNaN(cardId) && cardCount > 0) {
        for (let i = 0; i < cardCount; i++) {
          cardIds.push(cardId);
        }
      }
    }
    playSoundEffect('game_start');
    onQuickStart(army, cardIds);
  };

  const currentHeroOptions = useMemo(() => {
    return CHESS_PIECE_HEROES[selectedPieceType] || [];
  }, [selectedPieceType]);

  const currentSelection = useMemo(() => {
    return army[selectedPieceType as keyof ArmySelectionType];
  }, [army, selectedPieceType]);

  const handlePieceTypeClick = (pieceType: ChessPieceType) => {
    setSelectedPieceType(pieceType);
    playSoundEffect('button_click');
  };

  const handleHeroSelect = (hero: ChessPieceHero) => {
    setArmy(prev => ({
      ...prev,
      [selectedPieceType]: hero
    }));
    playSoundEffect('card_click');
  };

  const handleConfirm = () => {
    playSoundEffect('button_click');

    // Sync selected king hero to global store to ensure correct hero state
    const kingHero = army.king;
    if (kingHero) {
      debug.log(`[ArmySelection] Syncing King hero: ${kingHero.name} (${kingHero.id})`);
      setSelectedHero(kingHero.heroClass, kingHero.id);
    }

    onComplete(army);
  };

  const handleMatchmaking = async () => {
    if (matchmakingStarting) return;

    if (!canProceedToBattle) {
      toast.error('Please complete all decks before starting matchmaking');
      return;
    }

    setMatchmakingStarting(true);

    try {
      playSoundEffect('button_click');

      // Sync selected king hero to global store
      const kingHero = army.king;
      if (kingHero) {
        debug.log(`[ArmySelection] Syncing King hero: ${kingHero.name} (${kingHero.id})`);
        setSelectedHero(kingHero.heroClass, kingHero.id);
      }

      if (onMatchmakingStart) {
        await onMatchmakingStart(army);
        return;
      }

      const currentPeerId = usePeerStore.getState().myPeerId;
      if (!currentPeerId) {
        prepareForMatchmaking();
      }

      const queued = await joinQueue();
      if (!queued) {
        throw new Error('Failed to join matchmaking queue');
      }
    } catch (err: unknown) {
      debug.error('[ArmySelection] Failed to start matchmaking:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to start matchmaking. Please try again.');
    } finally {
      setMatchmakingStarting(false);
    }
  };

  const isArmyComplete = PIECE_ORDER.every(pieceType =>
    army[pieceType as keyof ArmySelectionType] !== undefined
  );

  const deckValidationContext = useMemo(() => {
    const nftBridge = getNFTBridge();
    return {
      getCardById: (cardId: number) => CARD_BY_ID.get(cardId),
      getOwnedCopies: (cardId: number) => nftBridge.getOwnedCopies(cardId),
      enforceOwnership: nftBridge.isHiveMode(),
    };
  }, [hiveUsername, nftCollection]);

  const getDeckStatus = (pieceType: PieceType, hero: ChessPieceHero): DeckDisplayStatus => {
    const status = getHeroDeckStatus(heroDecks[pieceType], {
      ...deckValidationContext,
      pieceType,
      heroId: hero.id,
      heroClass: hero.heroClass,
    });

    return {
      cardCount: status.cardCount,
      isComplete: status.isReady,
      label: getDeckStatusLabel(status),
      status,
    };
  };

  const allDecksComplete = MAJOR_PIECES.every(piece => {
    const hero = army[piece as keyof ArmySelectionType];
    if (!hero) return false;
    const status = getDeckStatus(piece, hero);
    return status.isComplete;
  });
  const selectedHeroCount = PIECE_ORDER.filter(pieceType => !!army[pieceType as keyof ArmySelectionType]).length;
  const completedDeckCount = MAJOR_PIECES.filter(piece => {
    const hero = army[piece as keyof ArmySelectionType];
    return hero ? getDeckStatus(piece, hero).isComplete : false;
  }).length;

  const canProceedToBattle = isArmyComplete && allDecksComplete;
  const deploymentStatus = !isArmyComplete
    ? {
      title: 'Lock the command line',
      body: 'Assign a hero to every battlefield role before you move into loadout prep.',
    }
    : !allDecksComplete
      ? {
        title: 'Complete the spell loadouts',
        body: 'Every major piece needs a finished 30-card deck before the warband can launch.',
      }
      : {
        title: 'Warband ready for launch',
        body: 'Commanders are locked, spell decks are tuned, and the line can move straight into battle.',
      };
  const launchSteps = [
    {
      label: 'Command',
      detail: `${selectedHeroCount}/${PIECE_ORDER.length} locked`,
      complete: isArmyComplete,
      active: !isArmyComplete,
    },
    {
      label: 'Loadouts',
      detail: `${completedDeckCount}/${MAJOR_PIECES.length} decks ready`,
      complete: allDecksComplete,
      active: isArmyComplete && !allDecksComplete,
    },
    {
      label: 'Launch',
      detail: isMultiplayer ? 'enter queue' : 'enter battle',
      complete: canProceedToBattle,
      active: canProceedToBattle,
    },
  ];
  const singleActionLabel = canProceedToBattle
    ? 'Launch Battle'
    : isArmyComplete
      ? 'Complete Loadouts'
      : 'Lock the Line';
  const multiplayerActionLabel = matchmakingStarting
    ? 'Starting Search...'
    : matchmakingStatus === 'queued'
    ? 'Cancel Search'
    : canProceedToBattle
      ? 'Find Opponent'
      : isArmyComplete
        ? 'Complete Loadouts'
        : 'Lock the Line';
  const matchmakingButtonReady = canProceedToBattle && matchmakingStatus !== 'queued' && !matchmakingStarting;
  const displayedMatchmakingError = matchmakingError;

  const handleOpenDeckBuilder = (pieceType: PieceType) => {
    setDeckBuilderOpen(pieceType);
    playSoundEffect('button_click');
  };

  const handleCloseDeckBuilder = () => {
    setDeckBuilderOpen(null);
  };

  const getClassBadgeClass = (heroClass: string): string => {
    return `class-${heroClass.toLowerCase()}`;
  };

  // Render the entire ArmySelection as a PORTAL to document.body
  // Uses CSS Grid layout - no inline style overrides needed
  return ReactDOM.createPortal(
    <div className="norse-army-selection">
      <div className="norse-army-bg" />
      <div className="norse-lightning-overlay" />
      <div className="norse-rotate-device" role="status" aria-live="polite">
        <div className="norse-rotate-device-panel">
          <RotateCw className="norse-rotate-device-icon" size={30} strokeWidth={2.1} />
          <div className="norse-rotate-device-title">Turn Phone Sideways</div>
          <div className="norse-rotate-device-copy">Warband setup opens in landscape.</div>
        </div>
      </div>

      {/* TOP BAR */}
      <div className="norse-top-bar">
        <div className="norse-top-title-group">
          <h1 className="norse-top-title">Muster the Warband</h1>
          <div className="norse-launch-rail" role="status" aria-label={deploymentStatus.body}>
            {launchSteps.map((step) => (
              <div
                key={step.label}
                className={`norse-launch-step ${step.complete ? 'complete' : ''} ${step.active ? 'active' : ''}`}
              >
                <span className="norse-launch-step-marker">
                  {step.complete ? <CheckCircle2 size={13} strokeWidth={2.4} /> : step.label.slice(0, 1)}
                </span>
                <span className="norse-launch-step-copy">
                  <strong>{step.label}</strong>
                  <span>{step.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="norse-top-bar-actions">
          {modeSwitch}
          <AccountSlot username={hiveUsername} tier="premium" />

          {validDecks.length > 0 && onQuickStart && !isMultiplayer && (
            <div className="norse-quick-decks">
              {validDecks.slice(0, 3).map((deck) => {
                const cardCount = Object.values(deck.cards || {}).reduce((sum: number, count) => sum + (typeof count === 'number' ? count : 0), 0);
                return (
                  <button
                    key={deck.id || deck.name}
                    onClick={() => handleQuickStart(deck)}
                    disabled={!isArmyComplete}
                    className="norse-quick-deck-btn"
                  >
                    Load {deck.name || 'Ready Deck'} · {cardCount}/30
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* LEFT SIDEBAR - PIECE SELECTOR */}
      <div className="norse-piece-sidebar norse-stone-panel norse-rune-border">
        {PIECE_ORDER.map((pieceType) => {
          const info = PIECE_DISPLAY_INFO[pieceType];
          const isSelected = selectedPieceType === pieceType;
          const hero = army[pieceType as keyof ArmySelectionType];

          return (
            <motion.button
              key={pieceType}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePieceTypeClick(pieceType)}
              className={`norse-piece-btn ${isSelected ? 'selected' : ''}`}
            >
              <PieceGlyph
                pieceType={pieceType}
                fallbackColor={PIECE_COLOR_BY_TYPE[pieceType]}
                size="clamp(29px, 7.2cqh, 42px)"
                className="norse-piece-glyph"
              />
              <div className="norse-piece-info">
                <div className="norse-piece-name">{info.name}</div>
                <div className="norse-piece-hero">
                  {hero?.name || 'Choose hero'}
                </div>
              </div>
              {hero && (
                <div className="norse-piece-check" aria-hidden="true">
                  <CheckCircle2 size={16} strokeWidth={2.2} />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* CENTER PANEL - HERO GRID */}
      <div className="norse-hero-panel norse-stone-panel norse-rune-border">
            <div className="norse-panel-header">
              <div>
                <div className="norse-panel-title">
                  <PieceGlyph
                    pieceType={selectedPieceType}
                    fallbackColor={PIECE_COLOR_BY_TYPE[selectedPieceType]}
                    size="clamp(26px, 6.5cqh, 34px)"
                    className="norse-panel-piece-glyph"
                  />
                  {PIECE_DISPLAY_INFO[selectedPieceType].name} Heroes
                </div>
                <div className="norse-panel-subtitle">
                  {PIECE_DISPLAY_INFO[selectedPieceType].domain}
                </div>
          </div>
          <span className={`norse-spell-badge ${pieceHasSpells(selectedPieceType) ? 'has-spells' : 'no-spells'}`}>
            {pieceHasSpells(selectedPieceType) ? '10-card spell loadout' : 'Command slot · no spell deck'}
          </span>
        </div>

        <div className="norse-hero-grid">
          {currentHeroOptions.map((hero) => {
            const isCurrentSelection = currentSelection?.id === hero.id;
            const editionTier = getHeroEditionTier(hero.id);
            const visualRarity = editionTier === 'starter' ? 'common' : editionTier;
            const isHeroArtReady = loadedHeroArtIds.has(hero.id);
            const pieceStats = PIECE_BASE_STATS[selectedPieceType];
            const element = parseNorseElement(hero.element);
            const elementDisplay = element ? NORSE_ELEMENT_DISPLAY[element] : undefined;

            return (
              <motion.div
                key={hero.id}
                whileHover={{ y: -4 }}
                onClick={() => {
                  setPopupHero(hero);
                  playSoundEffect('button_click');
                }}
                className={`norse-hero-card rarity-${visualRarity} ${isHeroArtReady ? 'art-ready' : 'art-loading'} ${isCurrentSelection ? 'selected' : ''}`}
              >
                <div className="norse-hero-media">
                  <HeroArtImage
                    heroId={hero.id}
                    heroName={hero.name}
                    portrait={hero.portrait}
                    className="norse-hero-image"
                    onReady={() => markHeroArtReady(hero.id)}
                    fallbackIcon={
                      <div className="norse-hero-placeholder">
                        <PieceGlyph
                          pieceType={selectedPieceType}
                          fallbackColor={PIECE_COLOR_BY_TYPE[selectedPieceType]}
                          size="clamp(42px, 20.8cqw, 68px)"
                          className="norse-hero-placeholder-glyph"
                        />
                      </div>
                    }
                  />
                  {isHeroArtReady && (
                    <>
                      <div className="norse-hero-gradient-overlay" />
                      {editionTier !== 'common' && editionTier !== 'starter' && (
                        <span className={`norse-rarity-badge rarity-${editionTier}`}>
                          {HERO_TIER_UI[editionTier].label}
                        </span>
                      )}
                      <div className="norse-hero-name-overlay">
                        <div className="norse-hero-name">{hero.name}</div>
                        {hero.heroClass.toLowerCase() !== 'neutral' && (
                          <span className={`norse-hero-class-badge ${getClassBadgeClass(hero.heroClass)}`}>
                            {hero.heroClass}
                          </span>
                        )}
                        {hero.mythology && (
                          <span className={`inline-block ml-1 px-1.5 py-0.5 bg-blue-600/80 text-[9px] text-white font-bold rounded uppercase tracking-wider faction-${hero.mythology}`}>
                            {hero.mythology}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {isHeroArtReady && (
                  <>
                    <div className="norse-hero-rune">
                      {PIECE_DISPLAY_INFO[selectedPieceType].rune}
                    </div>

                    <div className="norse-hero-info-panel">
                      <div className="norse-hero-stats">
                        <span className="norse-stat-chip norse-stat-health" aria-label={`${pieceStats.baseHealth} health`}>
                          <HeartPulse size={12} strokeWidth={2.2} />
                          <span className="norse-stat-value">{pieceStats.baseHealth}</span>
                          <span className="norse-stat-label">HP</span>
                        </span>
                        <span className="norse-stat-chip norse-stat-loadout" aria-label={pieceStats.hasSpells ? `${pieceStats.spellSlots} card spell deck` : 'command seat'}>
                          <Layers3 size={12} strokeWidth={2.2} />
                          <span className="norse-stat-value">{pieceStats.hasSpells ? pieceStats.spellSlots : 'CMD'}</span>
                          <span className="norse-stat-label">{pieceStats.hasSpells ? 'Deck' : 'Seat'}</span>
                        </span>
                        {element && element !== 'neutral' && elementDisplay && (
                          <span className={`norse-stat-chip norse-stat-element element-${element}`} aria-label={`${elementDisplay.label} element`}>
                            <Sparkles size={12} strokeWidth={2.2} />
                            <span className="norse-stat-value">{elementDisplay.sigil}</span>
                            <span className="norse-stat-label">{elementDisplay.label}</span>
                          </span>
                        )}
                      </div>
                      {hero.description && (
                        <div className="norse-hero-desc-preview">{hero.description}</div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHeroSelect(hero);
                        }}
                        className={`norse-select-btn ${isCurrentSelection ? 'selected' : ''}`}
                      >
                        {isCurrentSelection ? 'Locked In' : 'Choose Hero'}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* RIGHT SIDEBAR - YOUR ARMY & DECKS */}
      <div className="norse-army-sidebar norse-stone-panel norse-rune-border">
        <div className="norse-army-header">
          <div className="norse-army-title">Battle Line & Loadouts</div>
        </div>

        <div className="norse-army-list">
          {PIECE_ORDER.map((pieceType) => {
            const info = PIECE_DISPLAY_INFO[pieceType];
            const hero = army[pieceType as keyof ArmySelectionType];
            const isMajorPiece = MAJOR_PIECES.includes(pieceType as PieceType);
            const deckStatus = isMajorPiece && hero ? getDeckStatus(pieceType as PieceType, hero) : null;

            return (
              <div key={pieceType} className="norse-army-item">
                <div className="norse-army-item-row">
                  <div className="norse-army-portrait">
                    {hero ? (
                      <HeroArtImage
                        heroId={hero.id}
                        heroName={hero.name}
                        portrait={hero.portrait}
                        className="norse-army-portrait-image"
                        objectFit="cover"
                        fallbackIcon={
                          <PieceGlyph
                            pieceType={pieceType}
                            fallbackColor={PIECE_COLOR_BY_TYPE[pieceType]}
                            size="clamp(23px, 6.5cqw, 36px)"
                            className="norse-army-item-glyph"
                          />
                        }
                      />
                    ) : (
                      <PieceGlyph
                        pieceType={pieceType}
                        fallbackColor={PIECE_COLOR_BY_TYPE[pieceType]}
                        size="clamp(23px, 6.5cqw, 36px)"
                        className="norse-army-item-glyph"
                      />
                    )}
                  </div>
                  <div className="norse-army-item-info">
                    <div className="norse-army-item-name">
                      {hero?.name || <span className="norse-empty-text">Awaiting hero</span>}
                    </div>
                    <div className="norse-army-item-deck">
                      {pieceType === 'king' ? 'Command seat' : `${info.name} deck`}
                    </div>
                  </div>
                  {isMajorPiece && deckStatus && (
                    <span className={`norse-deck-count ${deckStatus.isComplete ? 'complete' : 'incomplete'}`}>
                      {deckStatus.label}
                    </span>
                  )}
                </div>

                {isMajorPiece && hero && pieceType !== 'king' && (
                  <button
                    onClick={() => handleOpenDeckBuilder(pieceType as PieceType)}
                    className="norse-edit-deck-btn"
                  >
                    {deckStatus?.isComplete ? 'Refine Deck' : deckStatus?.status.kind === 'hero_mismatch' ? 'Rebuild Deck' : 'Build Deck'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="norse-army-footer">
          <div className="norse-deck-status">
            <span className="norse-deck-status-label">Deck Status</span>
            <span className={`norse-deck-status-value ${allDecksComplete ? 'complete' : 'incomplete'}`}>
              {allDecksComplete ? 'Battle Ready' : 'Needs Loadouts'}
            </span>
          </div>

          {MAJOR_PIECES.map(piece => {
            const hero = army[piece as keyof ArmySelectionType];
            const status = hero ? getDeckStatus(piece, hero) : null;
            return (
              <div key={piece} className="norse-deck-breakdown">
                <span className="norse-deck-breakdown-label">{piece}:</span>
                <span className={`norse-deck-breakdown-value ${status?.isComplete ? 'complete' : hero ? 'has-hero' : 'no-hero'}`}>
                  {status ? status.label : 'Unassigned'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="norse-bottom-bar">
        <div className="norse-bottom-bar-left">
          <div className="norse-battle-status">
            <div className="norse-battle-status-icon">
              <Shield size={18} strokeWidth={2.1} />
            </div>
            <div className="norse-battle-status-copy">
              <span className="norse-battle-status-title">{deploymentStatus.title}</span>
              <span className="norse-battle-status-text">{deploymentStatus.body}</span>
            </div>
          </div>
          {onBack && (
            <button onClick={onBack} className="norse-back-btn">
              <ArrowLeft size={16} strokeWidth={2.2} />
              <span>Back</span>
            </button>
          )}
        </div>

        {/* Matchmaking status for multiplayer */}
        {isMultiplayer && (matchmakingStarting || matchmakingStatus === 'queued') && (
          <div className="norse-matchmaking-status">
            <div className="norse-matchmaking-status-line">
              <Search size={15} strokeWidth={2.1} />
              <span>{matchmakingStarting ? 'Starting matchmaking' : 'Searching for an opponent'}</span>
            </div>
            {!matchmakingStarting && queuePosition !== null && (
              <div className="norse-queue-position">
                Position in queue: {queuePosition}
              </div>
            )}
          </div>
        )}

        {isMultiplayer && displayedMatchmakingError && (
          <div className="norse-matchmaking-error">
            {displayedMatchmakingError}
          </div>
        )}

        {/* Main action button - Matchmaking for multiplayer, Start Battle for single-player */}
        {isMultiplayer ? (
          <motion.button
            whileHover={matchmakingButtonReady ? { scale: 1.02 } : undefined}
            whileTap={matchmakingButtonReady ? { scale: 0.98 } : undefined}
            onClick={matchmakingStatus === 'queued' ? leaveQueue : handleMatchmaking}
            disabled={matchmakingStarting || (!canProceedToBattle && matchmakingStatus !== 'queued')}
            className="norse-battle-btn"
          >
            {multiplayerActionLabel}
          </motion.button>
        ) : (
          <motion.button
            whileHover={canProceedToBattle ? { scale: 1.02 } : undefined}
            whileTap={canProceedToBattle ? { scale: 0.98 } : undefined}
            onClick={handleConfirm}
            disabled={!canProceedToBattle}
            className="norse-battle-btn"
          >
            {singleActionLabel}
          </motion.button>
        )}
      </div>

      {/* DECK BUILDER MODAL */}
      <AnimatePresence>
        {deckBuilderOpen && army[deckBuilderOpen as keyof ArmySelectionType] && (
          <HeroDeckBuilder
            pieceType={deckBuilderOpen}
            heroId={army[deckBuilderOpen as keyof ArmySelectionType]!.id}
            heroClass={army[deckBuilderOpen as keyof ArmySelectionType]!.heroClass}
            heroName={army[deckBuilderOpen as keyof ArmySelectionType]!.name}
            heroPortrait={resolveHeroPortrait(army[deckBuilderOpen as keyof ArmySelectionType]!.id, army[deckBuilderOpen as keyof ArmySelectionType]!.portrait)}
            onClose={handleCloseDeckBuilder}
            onSave={() => {
              playSoundEffect('card_draw');
            }}
          />
        )}
      </AnimatePresence>

      {/* HERO DETAIL POPUP */}
      <HeroDetailPopup
        hero={popupHero}
        isOpen={!!popupHero}
        onClose={() => setPopupHero(null)}
        onSelect={() => {
          if (popupHero) {
            handleHeroSelect(popupHero);
          }
        }}
      />
    </div>,
    document.body
  );
};

export default ArmySelection;
