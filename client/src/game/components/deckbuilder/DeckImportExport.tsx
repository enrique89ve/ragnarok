import React, { useState } from 'react';
import { encodeDeck, decodeDeck, deckCodeToUrl, validateDeckCode } from '../../utils/deckCode';
import type { HeroDeck } from '../../stores/heroDeckStore';

interface DeckImportExportProps {
	deck: HeroDeck | null;
	onImport: (heroId: string, heroClass: string, cardIds: number[]) => void;
}

export default function DeckImportExport({ deck, onImport }: DeckImportExportProps) {
	const [showDialog, setShowDialog] = useState(false);
	const [mode, setMode] = useState<'export' | 'import'>('export');
	const [importCode, setImportCode] = useState('');
	const [importError, setImportError] = useState('');
	const [copied, setCopied] = useState(false);

	const deckCode = deck ? encodeDeck(deck) : '';

	const handleCopyCode = async () => {
		if (!deckCode) return;
		await navigator.clipboard.writeText(deckCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleCopyUrl = async () => {
		if (!deckCode) return;
		await navigator.clipboard.writeText(deckCodeToUrl(deckCode));
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleImport = () => {
		setImportError('');
		const trimmed = importCode.trim();
		if (!trimmed) {
			setImportError('Please paste a deck code');
			return;
		}

		if (!validateDeckCode(trimmed)) {
			setImportError('Invalid deck code or contains unknown cards');
			return;
		}

		const result = decodeDeck(trimmed);
		if (!result) {
			setImportError('Failed to decode deck');
			return;
		}

		onImport(result.heroId, result.heroClass, result.cardIds);
		setShowDialog(false);
		setImportCode('');
	};

	return (
		<>
			<div className="flex gap-2">
				<button
					onClick={() => { setMode('export'); setShowDialog(true); setCopied(false); }}
					disabled={!deck || deck.cardIds.length === 0}
					className="px-3 py-1.5 bg-amber-700/60 hover:bg-amber-600/60 disabled:bg-gray-700/40 disabled:text-gray-500 text-amber-200 rounded-lg text-xs font-medium transition-colors border border-amber-600/40"
				>
					Export Deck
				</button>
				<button
					onClick={() => { setMode('import'); setShowDialog(true); setImportError(''); setImportCode(''); }}
					className="px-3 py-1.5 bg-gray-700/60 hover:bg-gray-600/60 text-gray-300 rounded-lg text-xs font-medium transition-colors border border-gray-600/40"
				>
					Import Deck
				</button>
			</div>

			{showDialog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
					<div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-96 max-w-[90vw] shadow-2xl">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-bold text-amber-400">
								{mode === 'export' ? 'Export Deck' : 'Import Deck'}
							</h3>
							<button
								onClick={() => setShowDialog(false)}
								className="text-gray-500 hover:text-gray-300 text-xl leading-none"
							>
								x
							</button>
						</div>

						{mode === 'export' ? (
							<>
								<p className="text-xs text-gray-400 mb-3">
									Share this code with others to let them import your deck.
								</p>
								<textarea
									readOnly
									value={deckCode}
									rows={3}
									className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm text-gray-200 font-mono focus:outline-none resize-none"
								/>
								<div className="flex gap-2 mt-3">
									<button
										onClick={handleCopyCode}
										className="flex-1 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition-colors"
									>
										{copied ? 'Copied!' : 'Copy Code'}
									</button>
									<button
										onClick={handleCopyUrl}
										className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-semibold transition-colors"
									>
										Copy URL
									</button>
								</div>
							</>
						) : (
							<>
								<p className="text-xs text-gray-400 mb-3">
									Paste a deck code to import it. This will replace your current deck.
								</p>
								<textarea
									value={importCode}
									onChange={(e) => { setImportCode(e.target.value); setImportError(''); }}
									rows={3}
									placeholder="Paste deck code here..."
									className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm text-gray-200 font-mono placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-none"
								/>
								{importError && (
									<p className="text-red-400 text-xs mt-2">{importError}</p>
								)}
								<button
									onClick={handleImport}
									disabled={!importCode.trim()}
									className="w-full mt-3 px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-semibold transition-colors"
								>
									Import Deck
								</button>
							</>
						)}
					</div>
				</div>
			)}
		</>
	);
}
