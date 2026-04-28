/*
  CinematicPhase — renders the chapter intro cinematic during the
  round FSM's `cinematic` state. Thin wrapper around CinematicCrawl
  whose only job is to translate the FSM state's `cinematic.intro`
  payload into the crawl's prop, and proxy onComplete back to the
  coordinator that dispatches CINEMATIC_DONE.

  Lazy-loaded by the coordinator so casual / multiplayer routes that
  never enter the cinematic phase do not bundle CinematicCrawl.
*/

import React from 'react';
import type { CinematicIntro } from '../../../campaign/campaignTypes';
import CinematicCrawl from '../../campaign/CinematicCrawl';

export type CinematicPhaseProps = {
	readonly intro: CinematicIntro;
	readonly onComplete: () => void;
};

const CinematicPhase: React.FC<CinematicPhaseProps> = ({ intro, onComplete }) => {
	return <CinematicCrawl intro={intro} onComplete={onComplete} />;
};

export default CinematicPhase;
