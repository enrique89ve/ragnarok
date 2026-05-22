import { MetaPageHeader } from '../../../components/navigation/MetaPageHeader';
import { getRagnarokRuntimePhase } from '@shared/runtimeConfig';
import { getRagnarokNetworkConfig } from '../../config/networkConfig';
import { useNFTUsername } from '../../nft/hooks';

export function WalletHeader() {
	const username = useNFTUsername();
	const runtimePhase = getRagnarokRuntimePhase(getRagnarokNetworkConfig());

	return (
		<MetaPageHeader
			title="Wallet"
			kicker={runtimePhase === 'alfa-testnet' ? 'Alfa Practice · RUNE' : 'Testnet · RUNE'}
			username={username}
			accountSecondary="Wallet"
		/>
	);
}
