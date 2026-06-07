/**
 * <MatchSetupSingle/> — synchronous wrapper for local practice matches.
 *
 * The route owns mode resolution. By the time the coordinator mounts,
 * useMatchStore.activeMatch is already an AI/practice MatchContext.
 */

import { useEffect, useState, type ReactNode } from 'react';

import { cryptoMatchIdentityFactory, type MatchIdentityFactory } from '../../identityFactory';
import { useMatchStore } from '../../store';
import type { SingleResolveArgs } from './resolver';
import { resolveSingle } from './resolver';

interface MatchSetupSingleProps extends Omit<SingleResolveArgs, 'identity'> {
	readonly children: ReactNode;
	readonly fallback?: ReactNode;
	readonly identityFactory?: MatchIdentityFactory;
}

export function MatchSetupSingle({
	children,
	fallback = null,
	identityFactory = cryptoMatchIdentityFactory,
	difficulty,
	deckSource,
	style,
}: MatchSetupSingleProps) {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const ctx = resolveSingle({
			identity: identityFactory.create(),
			difficulty,
			style,
			deckSource,
		});
		useMatchStore.getState().setMatch(ctx);
		setReady(true);

		return () => {
			useMatchStore.getState().clearMatch();
		};
	}, [difficulty, deckSource, identityFactory, style]);

	if (!ready) return <>{fallback}</>;

	return <>{children}</>;
}
