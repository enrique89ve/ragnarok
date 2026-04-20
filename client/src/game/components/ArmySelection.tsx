import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Search, Shield } from 'lucide-react';
import { ChessPieceType, ArmySelection as ArmySelectionType, ChessPieceHero } from '../types/ChessTypes';
import { CHESS_PIECE_HEROES, getDefaultArmySelection, pieceHasSpells } from '../data/ChessPieceConfig';
import { useAudio } from '../../lib/stores/useAudio';
import useGame from '../../lib/stores/useGame';
import { DeckInfo } from '../types';
import { getAllCards } from '../data/cardManagement/cardRegistry';
import { initializeCardDatabase } from '../data/cardManagement/initializeCards';
import { HeroDeckBuilder } from './HeroDeckBuilder';
import { useHeroDeckStore, PieceType } from '../stores/heroDeckStore';
import { HeroDetailPopup } from './HeroDetailPopup';
import { ALL_NORSE_HEROES } from '../data/norseHeroes';
import { preloadImages } from '../utils/assetPreloader';
import { resolveHeroPortrait } from '../utils/art/artMapping';
import { HeroArtImage } from './ui/HeroArtImage';
import { getHeroRarity, RARITY_COLORS } from '../utils/heroRarity';
import { useHoloTracking, getHoloTier } from '../hooks/useHoloTracking';
import './styles/ArmySelectionNorse.css';
import './styles/holoEffect.css';

const ICE_RE = /\b(ymir|buri|niflheim|frost|ice|snow|skadi|jotun|glacier|blizzard|frozen|winter|cold)\b/i;
const FIRE_RE = /\b(surtr|muspel|fire|flame|ember|inferno|burn|ash|volcanic|magma|lava|pyre)\b/i;
const ELECTRIC_RE = /\b(thor|thunder|lightning|storm|spark|tempest|volt)\b/i;
const SHADOW_RE = /\b(hel|helheim|shadow|dark|death|draugr|void|abyss|niflung|undead)\b/i;

const getHeroTheme = (name: string, element?: string): string | null => {
	if (element === 'ice' || ICE_RE.test(name)) return 'ice';
	if (element === 'fire' || FIRE_RE.test(name)) return 'fire';
	if (element === 'electric' || ELECTRIC_RE.test(name)) return 'electric';
	if (element === 'dark' || SHADOW_RE.test(name)) return 'shadow';
	return null;
};
import { debug } from '../config/debugConfig';
import { useMatchmaking } from '../hooks/useMatchmaking';
import { usePeerStore } from '../stores/peerStore';
import { toast } from 'sonner';

interface ArmySelectionProps {
  onComplete: (army: ArmySelectionType) => void;
  onQuickStart?: (army: ArmySelectionType, deckCardIds: number[]) => void;
  onBack?: () => void;
  isMultiplayer?: boolean;
  onMatchmakingStart?: (army: ArmySelectionType) => void;
}

const PIECE_ORDER: ChessPieceType[] = ['king', 'queen', 'rook', 'bishop', 'knight'];

const PIECE_DISPLAY_INFO: Record<ChessPieceType, { name: string; icon: string; color: string; domain: string; rune: string }> = {
  king: { name: 'Protogenoi', icon: '♔', color: '#FFD700', domain: "Odin's Domain", rune: 'ᚲ' },
  queen: { name: 'Sovereign', icon: '♕', color: '#69CCF0', domain: "Freya's Domain", rune: 'ᛗ' },
  rook: { name: 'Shaper', icon: '♖', color: '#C79C6E', domain: "Thor's Domain", rune: 'ᚦ' },
  bishop: { name: 'Luminary', icon: '♗', color: '#FFFFFF', domain: "Frigg's Domain", rune: 'ᛒ' },
  knight: { name: 'Ethereal', icon: '♘', color: '#FFF569', domain: "Loki's Domain", rune: 'ᛚ' },
  pawn: { name: 'Demigod', icon: '♙', color: '#999999', domain: 'Common Folk', rune: 'ᛈ' }
};

const MAJOR_PIECES: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];

const ArmySelection: React.FC<ArmySelectionProps> = ({ onComplete, onQuickStart, onBack, isMultiplayer = false, onMatchmakingStart }) => {
  const { playSoundEffect } = useAudio();
  const { setSelectedHero, savedDecks } = useGame();
  const [army, setArmy] = useState<ArmySelectionType>(getDefaultArmySelection());
  const [selectedPieceType, setSelectedPieceType] = useState<ChessPieceType>('king');
  const [deckBuilderOpen, setDeckBuilderOpen] = useState<PieceType | null>(null);
  const [popupHero, setPopupHero] = useState<ChessPieceHero | null>(null);
  
  const { getDeck, loadFromStorage } = useHeroDeckStore();
  
  const { myPeerId, host } = usePeerStore();
  const { status: matchmakingStatus, queuePosition, joinQueue, leaveQueue, error: matchmakingError } = useMatchmaking();
  
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);
  
  useEffect(() => {
    initializeCardDatabase();
    const allCards = getAllCards();
    debug.log(`[ArmySelection] Card registry has ${allCards.length} cards`);

    // Preload hero portraits so grid images appear instantly
    const heroArtPaths: string[] = [];
    for (const hero of Object.values(ALL_NORSE_HEROES)) {
      const art = resolveHeroPortrait(hero.id);
      if (art) heroArtPaths.push(art);
    }
    preloadImages(heroArtPaths);
  }, []);

  const holo = useHoloTracking();

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
    if (!canProceedToBattle) {
      toast.error('Please complete all decks before starting matchmaking');
      return;
    }

    playSoundEffect('button_click');
    
    // Sync selected king hero to global store
    const kingHero = army.king;
    if (kingHero) {
      debug.log(`[ArmySelection] Syncing King hero: ${kingHero.name} (${kingHero.id})`);
      setSelectedHero(kingHero.heroClass, kingHero.id);
    }

    // Initialize peer connection if needed
    if (!myPeerId) {
      try {
        await host();
      } catch {
        toast.error('Failed to initialize connection. Please try again.');
        return;
      }
    }

    // Start matchmaking
    if (onMatchmakingStart) {
      onMatchmakingStart(army);
    } else {
      await joinQueue();
    }
  };

  const isArmyComplete = PIECE_ORDER.every(pieceType => 
    army[pieceType as keyof ArmySelectionType] !== undefined
  );
  
  const getDeckStatus = (pieceType: PieceType): { cardCount: number; isComplete: boolean } => {
    const deck = getDeck(pieceType);
    if (!deck) return { cardCount: 0, isComplete: false };
    return { cardCount: deck.cardIds.length, isComplete: deck.cardIds.length === 30 };
  };
  
  const allDecksComplete = MAJOR_PIECES.every(piece => {
    const hero = army[piece as keyof ArmySelectionType];
    if (!hero) return false;
    const status = getDeckStatus(piece);
    return status.isComplete;
  });
  const selectedHeroCount = PIECE_ORDER.filter(pieceType => !!army[pieceType as keyof ArmySelectionType]).length;
  const completedDeckCount = MAJOR_PIECES.filter(piece => getDeckStatus(piece).isComplete).length;
  
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
  const soloActionLabel = canProceedToBattle
    ? 'Launch Battle'
    : isArmyComplete
      ? 'Complete Loadouts'
      : 'Lock the Line';
  const multiplayerActionLabel = matchmakingStatus === 'queued'
    ? 'Cancel Search'
    : canProceedToBattle
      ? 'Find Opponent'
      : isArmyComplete
        ? 'Complete Loadouts'
        : 'Lock the Line';
  
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
      
      {/* TOP BAR */}
      <div className="norse-top-bar">
        <div className="norse-top-title-group">
          <h1 className="norse-top-title">Muster the Warband</h1>
          <div className="norse-top-status">
            <span className={`norse-status-pill ${selectedHeroCount === PIECE_ORDER.length ? 'complete' : ''}`}>
              {selectedHeroCount}/{PIECE_ORDER.length} heroes locked
            </span>
            <span className={`norse-status-pill ${completedDeckCount === MAJOR_PIECES.length ? 'complete' : ''}`}>
              {completedDeckCount}/{MAJOR_PIECES.length} decks battle ready
            </span>
          </div>
          <div className="norse-launch-rail">
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
          <p className="norse-top-guidance">{deploymentStatus.body}</p>
        </div>
        
        <div className="norse-top-bar-actions">
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
              <span className="norse-piece-icon" style={{ color: info.color }}>
                {info.icon}
              </span>
              <div className="norse-piece-info">
                <div className="norse-piece-name">{info.name}</div>
                <div className="norse-piece-hero">
                  {hero?.name || 'Choose hero'}
                </div>
              </div>
              {hero && (
                <div className="norse-piece-check">
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
              <span style={{ color: PIECE_DISPLAY_INFO[selectedPieceType].color }}>
                {PIECE_DISPLAY_INFO[selectedPieceType].icon}
              </span>
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
            const rarity = getHeroRarity(hero.id);

            return (
              <motion.div
                key={hero.id}
                whileHover={{ y: -4 }}
                onClick={() => {
                  setPopupHero(hero);
                  playSoundEffect('button_click');
                }}
                className={`norse-hero-card rarity-${rarity} ${getHoloTier(rarity) || ''} ${isCurrentSelection ? 'selected' : ''}`}
                onMouseMove={holo.onMouseMove}
                onMouseLeave={holo.onMouseLeave}
              >
                <div className="norse-hero-media">
                  <HeroArtImage
                    heroId={hero.id}
                    heroName={hero.name}
                    portrait={hero.portrait}
                    className="norse-hero-image"
                    fallbackIcon={
                      <div className="norse-hero-placeholder">
                        <span className="norse-hero-placeholder-icon" style={{ color: PIECE_DISPLAY_INFO[selectedPieceType].color }}>
                          {PIECE_DISPLAY_INFO[selectedPieceType].icon}
                        </span>
                      </div>
                    }
                  />
                  {rarity !== 'common' && (
                    <>
                      <div className="holo-foil" />
                      <div className="holo-glitter" />
                      <div className="holo-glare" />
                    </>
                  )}
                  {(() => { const t = getHeroTheme(hero.name, hero.element); return t ? <div className={`card-particles theme-${t}`} /> : null; })()}
                  <div className="norse-hero-gradient-overlay" />
                  {rarity !== 'common' && (
                    <span className={`norse-rarity-badge rarity-${rarity}`}>
                      {RARITY_COLORS[rarity].label}
                    </span>
                  )}
                  <div className="norse-hero-name-overlay">
                    <div className="norse-hero-name">{hero.name}</div>
                    {hero.heroClass.toLowerCase() !== 'neutral' && (
                      <span className={`norse-hero-class-badge ${getClassBadgeClass(hero.heroClass)}`}>
                        {hero.heroClass}
                      </span>
                    )}
                    {['hero-erik-flameheart', 'hero-ragnar-ironside', 'hero-brynhild', 'hero-sigurd', 'king-leif'].includes(hero.id) && (
                      <span className="inline-block ml-1 px-1.5 py-0.5 bg-green-600/80 text-[9px] text-white font-bold rounded uppercase tracking-wider">
                        Starter
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="norse-hero-rune">
                  {PIECE_DISPLAY_INFO[selectedPieceType].rune}
                </div>
                
                <div className="norse-hero-info-panel">
                  <div className="norse-hero-stats">
                    {selectedPieceType !== 'king' && (
                      <>
                        <span className="norse-stat-hp">100 HP</span>
                        <span className="norse-stat-sta">10 STA</span>
                      </>
                    )}
                    {hero.element && hero.element.toLowerCase() !== 'neutral' && (
                      <span className={`norse-element-badge element-${hero.element.toLowerCase()}`}>
                        {hero.element}
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
            const deckStatus = isMajorPiece ? getDeckStatus(pieceType as PieceType) : null;
            
            return (
              <div key={pieceType} className="norse-army-item">
                <div className="norse-army-item-row">
                  <div className="norse-army-portrait">
                    {hero ? (
                      <HeroArtImage
                        heroId={hero.id}
                        heroName={hero.name}
                        portrait={hero.portrait}
                        fallbackIcon={<span style={{ color: info.color }}>{info.icon}</span>}
                      />
                    ) : (
                      <span style={{ color: info.color }}>{info.icon}</span>
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
                      {deckStatus.cardCount}/30
                    </span>
                  )}
                </div>
                
                {isMajorPiece && hero && pieceType !== 'king' && (
                  <button
                    onClick={() => handleOpenDeckBuilder(pieceType as PieceType)}
                    className="norse-edit-deck-btn"
                  >
                    {deckStatus?.isComplete ? 'Refine Deck' : 'Build Deck'}
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
            const status = getDeckStatus(piece);
            return (
              <div key={piece} className="norse-deck-breakdown">
                <span className="norse-deck-breakdown-label">{piece}:</span>
                <span className={`norse-deck-breakdown-value ${status.isComplete ? 'complete' : hero ? 'has-hero' : 'no-hero'}`}>
                  {hero ? `${status.cardCount}/30` : 'Unassigned'}
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
        {isMultiplayer && matchmakingStatus === 'queued' && (
          <div className="norse-matchmaking-status">
            <div className="norse-matchmaking-status-line">
              <Search size={15} strokeWidth={2.1} />
              <span>Searching for an opponent</span>
            </div>
            {queuePosition !== null && (
              <div className="norse-queue-position">
                Position in queue: {queuePosition}
              </div>
            )}
          </div>
        )}

        {isMultiplayer && matchmakingError && (
          <div className="norse-matchmaking-error">
            {matchmakingError}
          </div>
        )}
        
        {/* Main action button - Matchmaking for multiplayer, Start Battle for solo */}
        {isMultiplayer ? (
          <motion.button
            whileHover={canProceedToBattle && matchmakingStatus !== 'queued' ? { scale: 1.02 } : undefined}
            whileTap={canProceedToBattle && matchmakingStatus !== 'queued' ? { scale: 0.98 } : undefined}
            onClick={matchmakingStatus === 'queued' ? leaveQueue : handleMatchmaking}
            disabled={!canProceedToBattle && matchmakingStatus !== 'queued'}
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
            {soloActionLabel}
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
