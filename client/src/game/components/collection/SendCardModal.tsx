import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HiveCardAsset } from '../../../data/schemas/HiveTypes';
import { getNFTBridge } from '../../nft';
import { toast } from 'sonner';

interface SendCardModalProps {
	nft: HiveCardAsset | null;
	onClose: () => void;
	onSuccess?: () => void;
}

const HIVE_USERNAME_RE = /^[a-z][a-z0-9.-]{2,15}$/;

const SendCardModal: React.FC<SendCardModalProps> = ({ nft, onClose, onSuccess }) => {
	const [recipient, setRecipient] = useState('');
	const [memo, setMemo] = useState('');
	const [sending, setSending] = useState(false);
	const [confirmed, setConfirmed] = useState(false);

	if (!nft) return null;

	const currentUser = getNFTBridge().getUsername() ?? '';
	const validRecipient = HIVE_USERNAME_RE.test(recipient) && recipient !== currentUser;

	const handleSend = async () => {
		if (!validRecipient || sending) return;

		if (!confirmed) {
			setConfirmed(true);
			return;
		}

		setSending(true);
		try {
			const bridge = getNFTBridge();
			const result = await bridge.transferCard(nft.uid, recipient, memo || undefined);
			if (result.success) {
				bridge.removeCard(nft.uid);
				bridge.emitCardTransferred(nft.uid, currentUser, recipient);
				toast.success(`Sent ${nft.name} to @${recipient}`);
				onSuccess?.();
				onClose();
			} else {
				toast.error(result.error || 'Transfer failed');
				setConfirmed(false);
			}
		} catch {
			toast.error('Transfer failed — check Keychain');
			setConfirmed(false);
		} finally {
			setSending(false);
		}
	};

	return (
		<AnimatePresence>
			<motion.div
				className="fixed inset-0 bg-black/60 z-[220] flex items-center justify-center"
				onClick={onClose}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
			>
				<motion.div
					className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-[26rem] max-w-[90vw] overflow-hidden"
					onClick={e => e.stopPropagation()}
					initial={{ opacity: 0, scale: 0.9, y: 30 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.9, y: 30 }}
					transition={{ type: 'spring', damping: 25, stiffness: 300 }}
				>
					<div className="px-5 py-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
						<h2 className="text-lg font-bold text-blue-400">Send Card</h2>
						<button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					<div className="p-5 space-y-4">
						<div className="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
							<div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center text-lg font-bold text-amber-400">
								{nft.name.charAt(0)}
							</div>
							<div>
								<p className="text-white font-semibold text-sm">{nft.name}</p>
								<p className="text-gray-400 text-xs font-mono">{nft.uid.slice(0, 12)}...</p>
							</div>
						</div>

						<div>
							<label className="text-xs text-gray-400 block mb-1">Recipient (Hive username)</label>
							<input
								type="text"
								value={recipient}
								onChange={e => { setRecipient(e.target.value.toLowerCase()); setConfirmed(false); }}
								placeholder="username"
								className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
								disabled={sending}
							/>
							{recipient && !validRecipient && (
								<p className="text-red-400 text-xs mt-1">
									{recipient === currentUser ? 'Cannot send to yourself' : 'Invalid Hive username'}
								</p>
							)}
						</div>

						<div>
							<label className="text-xs text-gray-400 block mb-1">Memo (optional)</label>
							<input
								type="text"
								value={memo}
								onChange={e => setMemo(e.target.value)}
								placeholder="Gift for you!"
								className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
								disabled={sending}
								maxLength={100}
							/>
						</div>

						{confirmed && (
							<motion.div
								className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-center"
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
							>
								<p className="text-red-300 text-sm font-semibold">This action is irreversible!</p>
								<p className="text-red-400 text-xs mt-1">
									{nft.name} will be transferred to @{recipient} on the Hive blockchain.
								</p>
							</motion.div>
						)}

						<button
							onClick={handleSend}
							disabled={!validRecipient || sending}
							className={`w-full py-2.5 font-semibold rounded-lg transition-colors ${
								confirmed
									? 'bg-red-600 hover:bg-red-500 text-white'
									: 'bg-blue-600 hover:bg-blue-500 text-white'
							} disabled:opacity-40 disabled:cursor-not-allowed`}
						>
							{sending ? 'Signing with Keychain...' : confirmed ? 'Confirm Send' : 'Send Card'}
						</button>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
};

export default SendCardModal;
