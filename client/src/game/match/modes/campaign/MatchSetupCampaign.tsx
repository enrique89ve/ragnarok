/**
 * <MatchSetupCampaign/> — synchronous wrapper for staged campaign missions.
 *
 * Captures the staged mission once at mount. Campaign completion clears
 * campaignStore.currentMission, but the active MatchContext must remain
 * stable through game-over, retry, and story-bridge rendering.
 */

import React, { useEffect, useState, type ReactNode } from 'react';

import { useCampaignStore } from '../../../campaign';
import { cryptoMatchIdentityFactory, type MatchIdentityFactory } from '../../identityFactory';
import { useMatchStore } from '../../store';
import type { CampaignResolveArgs } from './resolver';
import { resolveCampaign } from './resolver';

type CampaignSetupStatus = 'pending' | 'ready' | 'failed';

interface MatchSetupCampaignProps {
	readonly children: ReactNode;
	readonly fallback?: ReactNode;
	readonly identityFactory?: MatchIdentityFactory;
}

function getStagedCampaignArgs(identityFactory: MatchIdentityFactory): CampaignResolveArgs | null {
	const campaign = useCampaignStore.getState();
	if (!campaign.currentMission) return null;
	return {
		identity: identityFactory.create(),
		missionId: campaign.currentMission,
		difficulty: campaign.currentDifficulty,
		localRunId: campaign.currentRunId,
	};
}

export function MatchSetupCampaign({
	children,
	fallback = null,
	identityFactory = cryptoMatchIdentityFactory,
}: MatchSetupCampaignProps) {
	const [stagedArgs] = useState(() => getStagedCampaignArgs(identityFactory));
	const [status, setStatus] = useState<CampaignSetupStatus>(() => stagedArgs ? 'pending' : 'failed');

	useEffect(() => {
		if (!stagedArgs) return;

		const result = resolveCampaign(stagedArgs);
		if (!result.ok) {
			useCampaignStore.getState().clearCurrent();
			setStatus('failed');
			return;
		}

		useMatchStore.getState().setMatch(result.ctx);
		setStatus('ready');

		return () => {
			useMatchStore.getState().clearMatch();
		};
	}, [stagedArgs]);

	if (status === 'failed') return <>{fallback}</>;
	if (status === 'pending') return null;

	return <>{children}</>;
}
