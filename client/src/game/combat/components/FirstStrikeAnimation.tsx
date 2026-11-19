import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { debug } from '../../config/debugConfig';
import { ARENA_VFX_LAYERS, getArenaVfxLayer } from '../arenaVfxTargets';
import { useArenaVfxRoot } from '../arenaVfxContext';
import { CINEMA_READ_MS } from '../feedback/combatFeedback';
import '../styles/poker-drama.css';
import '../styles/first-strike.css';

export type FirstStrikeAnimationProps = {
  readonly target: 'player' | 'opponent';
  readonly damage: number;
  readonly attackerName: string;
  readonly defenderName: string;
  readonly onComplete: () => void;
};

type FirstStrikePhase = 'charge' | 'strike' | 'damage' | 'exit';

const FIRST_STRIKE_CHARGE_MS = CINEMA_READ_MS;
const FIRST_STRIKE_TRAVEL_MS = 700;
const FIRST_STRIKE_DAMAGE_MS = CINEMA_READ_MS;
const FIRST_STRIKE_EXIT_MS = 220;

/**
 * Opening ambush readout. Uses the same center-title anatomy as the phase
 * banner (cinema-lane plate · rails · title / subtitle) in a blood accent:
 *   charge → "FIRST STRIKE" + who ambushes whom
 *   strike → a slash crosses the plate toward the defender's side
 *   damage → subtitle becomes the HP cost; the defender's hero frame flashes
 * Damage numbers stay with the regular hero floaters, never duplicated here.
 */
export const FirstStrikeAnimation: React.FC<FirstStrikeAnimationProps> = ({
  target,
  damage,
  attackerName,
  defenderName,
  onComplete,
}) => {
  const [phase, setPhase] = useState<FirstStrikePhase>('charge');
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  const arenaRoot = useArenaVfxRoot();

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setPortalTarget(arenaRoot ? getArenaVfxLayer(ARENA_VFX_LAYERS.vfx, arenaRoot) : null);
  }, [arenaRoot]);

  useEffect(() => {
    if (!portalTarget) return undefined;

    debug.animation('[FirstStrike] Animation starting, target:', target, 'damage:', damage);
    setPhase('charge');

    const strikeAt = FIRST_STRIKE_CHARGE_MS;
    const damageAt = strikeAt + FIRST_STRIKE_TRAVEL_MS;
    const exitAt = damageAt + FIRST_STRIKE_DAMAGE_MS;
    const timers = [
      setTimeout(() => setPhase('strike'), strikeAt),
      setTimeout(() => setPhase('damage'), damageAt),
      setTimeout(() => setPhase('exit'), exitAt),
      setTimeout(() => {
        debug.animation('[FirstStrike] Animation complete, calling onComplete');
        onCompleteRef.current();
      }, exitAt + FIRST_STRIKE_EXIT_MS),
    ];

    return () => timers.forEach(clearTimeout);
    // Target and damage identify a new presentation; callback identity must
    // not restart an already-running visual.
  }, [target, damage, portalTarget]);

  if (!portalTarget) return null;

  const struck = phase === 'damage' || phase === 'exit';
  const subtitle = struck
    ? `Surprise attack · ${defenderName} loses ${damage} HP`
    : `${attackerName} ambushes ${defenderName}`;

  return ReactDOM.createPortal(
    <div
      className="first-strike"
      data-phase={phase}
      data-target={target}
      role="status"
      aria-live="assertive"
      aria-label={`First strike. ${attackerName} ambushes ${defenderName} for ${damage} damage.`}
    >
      <div className="first-strike__plate cinema-lane-plate">
        <span className="first-strike__line" aria-hidden="true" />
        <span className="first-strike__text">
          <span className="first-strike__title">First Strike</span>
          <span key={struck ? 'cost' : 'intro'} className="first-strike__subtitle">
            {subtitle}
          </span>
        </span>
        <span className="first-strike__line" aria-hidden="true" />
        <span className="first-strike__slash" aria-hidden="true" />
      </div>
      <span className="first-strike__hero-hit" aria-hidden="true" />
    </div>,
    portalTarget,
  );
};

export default FirstStrikeAnimation;
