import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	CHALLENGE_SIGNATURE_ALGORITHM,
	type P2PMatchTicket,
	type ServerSignedChallenge,
} from '../../shared/p2pAvailability';
import {
	getP2PMatchPeerView,
	type P2PActiveMatch,
} from '../services/p2pMatchmakingView';
import {
	clearStarterCeremonyClaimsForTests,
	setStarterCeremonyClaim,
} from '../services/starterClaimRegistry';
import {
	resolveQueueUsername,
	resolveSharedQueueStarterClaim,
} from './matchmakingRoutes';

function ticket(peerId: string): P2PMatchTicket {
	return {
		token: `${Buffer.from(JSON.stringify({ peerId }), 'utf8').toString('base64url')}.${'a'.repeat(64)}`,
		roomId: 'room-a',
		peerId,
		expiresAt: 2_000,
	};
}

function challenge(from: string, to: string, peerId: string): ServerSignedChallenge {
	return {
		from,
		to,
		peerId,
		timestamp: 1_000,
		expiresAt: 2_000,
		nonce: `nonce-${from}-${to}-123456`,
		sigAlg: CHALLENGE_SIGNATURE_ALGORITHM,
		serverSig: 'b'.repeat(64),
		matchTicket: ticket(peerId),
	};
}

function activeMatch(): P2PActiveMatch {
	return {
		offerId: 'offer-test',
		player1: 'peer-one',
		player2: 'peer-two',
		createdAt: 1_000,
		player1MatchChallenge: challenge('alice', 'bob', 'peer-one'),
		player2MatchChallenge: challenge('bob', 'alice', 'peer-two'),
		player1MatchTicket: ticket('peer-one'),
		player2MatchTicket: ticket('peer-two'),
		player1QueueTokenHash: '1'.repeat(64),
		player2QueueTokenHash: '2'.repeat(64),
	};
}

describe('matchmakingRoutes P2P ticket boundary', () => {
	it('keeps relay tickets out of the offer and exposes them only after commit', () => {
		const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'matchmakingRoutes.ts');
		const source = readFileSync(sourcePath, 'utf8');

		expect(source).toContain('const peerView = getP2PMatchPeerView(activeMatch, pending.playerB.peerId)');
		expect(source).toContain('const peerView = getP2PMatchPeerView(match, peerId)');
		const offerStart = source.indexOf('function createPendingMatchOffer');
		const commitStart = source.indexOf('function commitPendingMatch');
		expect(source.slice(offerStart, commitStart)).not.toContain('buildP2PMatchTicket');
		expect(source).not.toMatch(/return res\.json\(\{[\s\S]{0,500}player1MatchTicket/);
		expect(source).not.toMatch(/return res\.json\(\{[\s\S]{0,500}player2MatchTicket/);
		expect(source).not.toMatch(/return res\.json\(\{[\s\S]{0,500}match\.player1MatchTicket/);
		expect(source).not.toMatch(/return res\.json\(\{[\s\S]{0,500}match\.player2MatchTicket/);
		expect(source).not.toMatch(/matchTickets:\s*\[/);
		expect(source).not.toMatch(/matchTickets:\s*\{/);
	});

	it('maps each matched peer to only its own relay ticket and queue token', () => {
		const match = activeMatch();

		expect(getP2PMatchPeerView(match, 'peer-one')).toMatchObject({
			isHost: true,
			opponentPeerId: 'peer-two',
			matchTicket: match.player1MatchTicket,
			matchChallenge: match.player1MatchChallenge,
			opponentMatchChallenge: match.player2MatchChallenge,
			queueTokenHash: match.player1QueueTokenHash,
		});

		expect(getP2PMatchPeerView(match, 'peer-two')).toMatchObject({
			isHost: false,
			opponentPeerId: 'peer-one',
			matchTicket: match.player2MatchTicket,
			matchChallenge: match.player2MatchChallenge,
			opponentMatchChallenge: match.player1MatchChallenge,
			queueTokenHash: match.player2QueueTokenHash,
		});

		expect(getP2PMatchPeerView(match, 'unknown-peer')).toBeNull();
	});

	it('requires a reusable Hive web session for shared-network queue entries', () => {
		const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'matchmakingRoutes.ts');
		const source = readFileSync(sourcePath, 'utf8');

		expect(source).toContain('getHiveWebSessionUsername(req)');
		expect(source).toContain('Hive web session required for shared-network matchmaking');
		expect(source).toContain("process.env.VITE_NETWORK_STAGE === 'testnet'");
		expect(source).toContain("process.env.VITE_NETWORK_STAGE === 'mainnet'");
		expect(source).toContain('router.post(\'/queue\', validateQueuePeerId, requireMatchmakingSession');
		expect(resolveQueueUsername({
			authenticatedUsername: 'Alice',
			providedUsername: 'mallory',
		})).toBe('alice');
		expect(resolveQueueUsername({
			authenticatedUsername: undefined,
			providedUsername: 'Bob',
		})).toBe('bob');
	});

	it('requires a server-recorded starter claim before shared-network matchmaking', async () => {
		clearStarterCeremonyClaimsForTests();
		await expect(resolveSharedQueueStarterClaim({
			sharedNetwork: true,
			account: 'alice',
		})).resolves.toEqual({
			ok: false,
			statusCode: 403,
			error: 'starter claim required',
		});

		await setStarterCeremonyClaim('alice', 1_800_000_000_000);
		await expect(resolveSharedQueueStarterClaim({
			sharedNetwork: true,
			account: 'alice',
		})).resolves.toEqual({ ok: true });

		await expect(resolveSharedQueueStarterClaim({
			sharedNetwork: false,
			account: undefined,
		})).resolves.toEqual({ ok: true });
	});

	it('does not issue a relay ticket while a match offer is pending', () => {
		const sourcePath = join(dirname(fileURLToPath(import.meta.url)), 'matchmakingRoutes.ts');
		const source = readFileSync(sourcePath, 'utf8');

		const offerStart = source.indexOf('function createPendingMatchOffer');
		const commitStart = source.indexOf('function commitPendingMatch');
		expect(source.slice(offerStart, commitStart)).not.toContain('tryBuildMatchTickets');
		expect(source.slice(commitStart)).toContain('tryBuildMatchTickets');
	});
});
