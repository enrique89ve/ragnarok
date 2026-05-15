import { MetaPageHeader } from '../../../components/navigation/MetaPageHeader';
import { useNFTUsername } from '../../nft/hooks';

export function WalletHeader() {
	const username = useNFTUsername();

	return (
		<MetaPageHeader
			title="Wallet"
			kicker="Testnet · RUNE"
			username={username}
			accountSecondary="Wallet"
		/>
	);
}
