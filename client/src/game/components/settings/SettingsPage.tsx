import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '../../../lib/routes';
import SettingsPanel from './SettingsPanel';
import { useNFTUsername } from '../../nft/hooks';

export default function SettingsPage() {
	const hiveUsername = useNFTUsername();
	const [saveStatus, setSaveStatus] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	const handleHiveSave = async () => {
		setSaving(true);
		setSaveStatus(null);
		const { saveToHive } = await import('../../stores/saveStateManager');
		const result = await saveToHive();
		setSaveStatus(result.success ? `Saved to Hive! (tx: ${result.trxId?.slice(0, 8)}...)` : `Failed: ${result.error}`);
		setSaving(false);
	};

	const handleHiveRestore = async () => {
		setSaving(true);
		setSaveStatus(null);
		const { restoreFromHive } = await import('../../stores/saveStateManager');
		const result = await restoreFromHive();
		setSaveStatus(result.success ? 'Restored from Hive!' : `Failed: ${result.error}`);
		setSaving(false);
	};

	const handleExportFile = async () => {
		const { exportToFile } = await import('../../stores/saveStateManager');
		await exportToFile();
		setSaveStatus('Save file downloaded.');
	};

	const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setSaving(true);
		setSaveStatus(null);
		const { importFromFile } = await import('../../stores/saveStateManager');
		const result = await importFromFile(file);
		setSaveStatus(result.success ? 'Save restored from file!' : `Failed: ${result.error}`);
		setSaving(false);
		if (fileRef.current) fileRef.current.value = '';
	};

	return (
		<div className="min-h-screen bg-gray-950 text-white">
			<div className="max-w-2xl mx-auto px-4 py-8">
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-3xl font-bold text-amber-400 tracking-wide">Settings</h1>
					<Link
						to={routes.home}
						className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700 transition-colors"
					>
						Back to Menu
					</Link>
				</div>

				{/* ── Portable Save Section ── */}
				<div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-6 mb-6">
					<h2 className="text-lg font-bold text-amber-300 mb-1">Portable Save</h2>
					<p className="text-gray-400 text-sm mb-4">
						Your progress, base cards, decks, and campaign state. NFT cards sync automatically from the blockchain.
					</p>

					{saveStatus && (
						<div className={`mb-4 p-3 rounded-lg text-sm ${saveStatus.startsWith('Failed')
							? 'bg-red-900/30 border border-red-700/40 text-red-300'
							: 'bg-green-900/30 border border-green-700/40 text-green-300'}`}>
							{saveStatus}
						</div>
					)}

					<div className="space-y-3">
						{/* Tier 1: Hive Save */}
						{hiveUsername ? (
							<div className="bg-indigo-900/20 border border-indigo-600/30 rounded-lg p-4">
								<div className="flex items-center gap-2 mb-2">
									<span className="text-indigo-400 text-sm font-bold">Hive Cloud Save</span>
									<span className="text-xs text-indigo-400/60">@{hiveUsername}</span>
								</div>
								<p className="text-gray-400 text-xs mb-3">
									Save to the Hive blockchain. Restores automatically on any device when you log in.
								</p>
								<div className="flex gap-2">
									<button type="button" onClick={handleHiveSave} disabled={saving}
										className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors font-medium">
										{saving ? 'Saving...' : 'Save to Hive'}
									</button>
									<button type="button" onClick={handleHiveRestore} disabled={saving}
										className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors font-medium">
										{saving ? 'Restoring...' : 'Restore from Hive'}
									</button>
								</div>
							</div>
						) : (
							<div className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-4">
								<p className="text-gray-400 text-sm">
									Connect Hive Keychain for automatic cross-device saves. Your progress lives on the blockchain — never lost.
								</p>
							</div>
						)}

						{/* Tier 2: File Export/Import */}
						<div className="bg-gray-800/40 border border-gray-700/40 rounded-lg p-4">
							<div className="text-gray-300 text-sm font-bold mb-2">Local Backup File</div>
							<p className="text-gray-400 text-xs mb-3">
								Download your save as a file. Transfer it via email, USB, or cloud drive to another device.
							</p>
							<div className="flex gap-2">
								<button type="button" onClick={handleExportFile}
									className="flex-1 px-3 py-2 bg-amber-700 hover:bg-amber-600 text-white text-sm rounded-lg transition-colors font-medium">
									Download Save
								</button>
								<label className="flex-1">
									<span className="block px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors font-medium text-center cursor-pointer">
										Restore from File
									</span>
									<input ref={fileRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
								</label>
							</div>
						</div>
					</div>
				</div>

				{/* ── Audio/Visual/Gameplay Settings ── */}
				<div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-6">
					<SettingsPanel />
				</div>
			</div>
		</div>
	);
}
