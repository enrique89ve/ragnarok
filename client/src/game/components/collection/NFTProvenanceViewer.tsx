import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HiveCardAsset, ProvenanceStamp, CompactedProvenance } from '../../../data/schemas/HiveTypes';
import { getTransactionUrl, getBlockUrl } from '../../../data/blockchain/explorerLinks';

interface NFTProvenanceViewerProps {
	nft: HiveCardAsset | null;
	onClose: () => void;
	onSend?: (nft: HiveCardAsset) => void;
}

const rarityColors: Record<string, string> = {
	common: '#FFFFFF',
	rare: '#0070DD',
	epic: '#A335EE',
	mythic: '#FF8000',
};

const NFTProvenanceViewer: React.FC<NFTProvenanceViewerProps> = ({ nft, onClose, onSend }) => {
	if (!nft) return null;

	const rarityColor = rarityColors[nft.rarity] || rarityColors.common;

	return (
		<AnimatePresence>
			<motion.div
				className="fixed inset-0 bg-black/60 z-[210] flex items-center justify-center"
				onClick={onClose}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
			>
				<motion.div
					className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-[28rem] max-w-[90vw] overflow-hidden"
					onClick={e => e.stopPropagation()}
					initial={{ opacity: 0, scale: 0.9, y: 30 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.9, y: 30 }}
					transition={{ type: 'spring', damping: 25, stiffness: 300 }}
				>
					<div className="px-5 py-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
						<h2 className="text-lg font-bold text-amber-400">NFT Provenance</h2>
						<button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					<div className="p-5 space-y-4 text-sm">
						<div className="flex items-center gap-3">
							<span className="text-xl font-bold" style={{ color: rarityColor }}>{nft.name}</span>
							{nft.foil === 'gold' && <span className="text-xs bg-yellow-600/30 text-yellow-300 px-2 py-0.5 rounded-full">GOLD</span>}
						</div>

						<div className="grid grid-cols-2 gap-3">
							<Field label="UID" value={nft.uid} mono />
							<Field label="Card ID" value={String(nft.cardId)} />
							<Field label="Owner" value={nft.ownerId} mono />
							<Field label="Edition" value={nft.edition.toUpperCase()} />
							<Field label="Rarity" value={nft.rarity.charAt(0).toUpperCase() + nft.rarity.slice(1)} color={rarityColor} />
							<Field label="Level" value={`${nft.level} (${nft.xp} XP)`} />
							{nft.race && <Field label="Race" value={nft.race} />}
							<Field label="Type" value={nft.type} />
						</div>

						{nft.officialMint && (
							<div className="border-t border-gray-700 pt-3 space-y-1">
								<h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider">Official Mint</h3>
								<div className="bg-green-900/20 border border-green-700/30 rounded-lg px-3 py-2 space-y-1">
									<div className="flex items-center justify-between">
										<span className="text-green-300 text-xs font-mono">Signer: {nft.officialMint.signer}</span>
										<a
											href={nft.officialMint.txUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="text-xs bg-green-600/20 text-green-300 hover:bg-green-600/40 px-2 py-1 rounded font-mono transition-colors"
											title={nft.officialMint.trxId}
										>
											{nft.officialMint.trxId.slice(0, 8)}...
										</a>
									</div>
									<div className="flex items-center gap-2 text-xs">
										<a
											href={nft.officialMint.blockUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="text-green-400 hover:text-green-300 font-mono"
										>
											Block #{nft.officialMint.blockNum}
										</a>
										<span className="text-gray-500">
											{new Date(nft.officialMint.timestamp).toLocaleString()}
										</span>
									</div>
								</div>
							</div>
						)}

						<div className="border-t border-gray-700 pt-3 space-y-2">
							<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">On-Chain History</h3>

							{nft.compactedProvenance && (
								<CompactedSummary compacted={nft.compactedProvenance} />
							)}

							{nft.provenanceChain && nft.provenanceChain.length > 0 ? (
								<div className="space-y-1.5 max-h-48 overflow-y-auto">
									{nft.provenanceChain.map((stamp, i) => (
										<StampRow
											key={`${stamp.trxId}-${i}`}
											stamp={stamp}
											index={i + (nft.compactedProvenance?.compactedCount ?? 0)}
										/>
									))}
								</div>
							) : nft.mintTrxId ? (
								<ChainRow
									label="Minted"
									trxId={nft.mintTrxId}
									blockNum={nft.mintBlockNum}
								/>
							) : (
								<p className="text-gray-500 text-xs italic">Mint transaction not recorded (pre-upgrade card)</p>
							)}

							{!nft.provenanceChain && nft.lastTransferTrxId && nft.lastTransferTrxId !== nft.mintTrxId && (
								<ChainRow
									label="Last Transfer"
									trxId={nft.lastTransferTrxId}
									blockNum={nft.lastTransferBlock}
								/>
							)}
						</div>

						{onSend && (
							<button
								onClick={() => onSend(nft)}
								className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
							>
								Send to Friend
							</button>
						)}
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
};

function Field({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
	return (
		<div>
			<span className="text-gray-500 text-xs block">{label}</span>
			<span
				className={`text-white text-sm ${mono ? 'font-mono' : ''} break-all`}
				style={color ? { color } : undefined}
			>
				{value}
			</span>
		</div>
	);
}

function StampRow({ stamp, index }: { stamp: ProvenanceStamp; index: number }) {
	const isMint = stamp.from === '';
	const label = isMint ? 'Minted' : `Transfer #${index}`;
	const detail = isMint
		? `to ${stamp.to}`
		: `${stamp.from} \u2192 ${stamp.to}`;
	const blockHref = stamp.blockUrl || getBlockUrl(stamp.block);
	const txHref = stamp.txUrl || getTransactionUrl(stamp.trxId);

	return (
		<div className="bg-gray-800 rounded-lg px-3 py-2 space-y-1">
			<div className="flex items-center justify-between">
				<span className="text-gray-400 text-xs font-medium">{label}</span>
				<div className="flex items-center gap-2">
					<a
						href={blockHref}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-blue-400 hover:text-blue-300 font-mono"
					>
						Block #{stamp.block}
					</a>
					<a
						href={txHref}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 px-2 py-1 rounded font-mono transition-colors"
						title={stamp.trxId}
					>
						{stamp.trxId.slice(0, 8)}...
					</a>
				</div>
			</div>
			<p className="text-xs text-gray-300 font-mono truncate">{detail}</p>
			{stamp.signer && stamp.signer !== stamp.from && (
				<p className="text-xs text-gray-500 font-mono">Signed by: {stamp.signer}</p>
			)}
		</div>
	);
}

function CompactedSummary({ compacted }: { compacted: CompactedProvenance }) {
	return (
		<div className="bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2 space-y-1">
			<div className="flex items-center justify-between">
				<span className="text-amber-400 text-xs font-medium">
					{compacted.compactedCount} older stamp{compacted.compactedCount !== 1 ? 's' : ''} compacted
				</span>
				<span className="text-gray-500 text-xs font-mono">
					{compacted.totalTransfers} total transfers
				</span>
			</div>
			<div className="flex items-center gap-2 text-xs">
				<span className="text-gray-400">Originally minted to</span>
				<span className="text-gray-300 font-mono">{compacted.firstMint.to}</span>
				<a
					href={compacted.firstMint.txUrl || getTransactionUrl(compacted.firstMint.trxId)}
					target="_blank"
					rel="noopener noreferrer"
					className="text-blue-400 hover:text-blue-300 font-mono"
				>
					{compacted.firstMint.trxId.slice(0, 8)}...
				</a>
			</div>
		</div>
	);
}

function ChainRow({ label, trxId, blockNum }: { label: string; trxId: string; blockNum?: number }) {
	return (
		<div className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
			<span className="text-gray-400 text-xs">{label}</span>
			<div className="flex items-center gap-2">
				{blockNum && (
					<a
						href={getBlockUrl(blockNum)}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-blue-400 hover:text-blue-300 font-mono"
					>
						Block #{blockNum}
					</a>
				)}
				<a
					href={getTransactionUrl(trxId)}
					target="_blank"
					rel="noopener noreferrer"
					className="text-xs bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 px-2 py-1 rounded font-mono transition-colors"
					title={trxId}
				>
					{trxId.slice(0, 8)}...
				</a>
			</div>
		</div>
	);
}

export default NFTProvenanceViewer;
