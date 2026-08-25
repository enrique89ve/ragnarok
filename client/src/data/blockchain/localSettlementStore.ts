import {
	commitLocalSettlement,
} from './replayDB';
import type {
	LocalSettlementCommitResult,
	LocalSettlementStore,
} from '../../../../shared/protocol-core/localSettlement';

export const indexedDbLocalSettlementStore: LocalSettlementStore = {
	commit: async (record): Promise<LocalSettlementCommitResult> => commitLocalSettlement(record),
};
