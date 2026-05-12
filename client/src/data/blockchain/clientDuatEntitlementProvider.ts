import type { DuatEntitlementProvider } from '../../../../shared/protocol-core/types';

export const clientDuatEntitlementProvider: DuatEntitlementProvider = {
	async getDuatEntitlement(account) {
		const { getDuatEntitlement } = await import('../../../../shared/protocol-core/duatSnapshot');
		const entitlement = await getDuatEntitlement(account);
		if (!entitlement || entitlement.packsEarned <= 0) return null;

		return entitlement;
	},
};
