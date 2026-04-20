import React from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAudio } from '../../../lib/stores/useAudio';
import { HiveKeychainLogin } from '../HiveKeychainLogin';

function SliderControl({ label, value, onChange, min = 0, max = 1, step = 0.05 }: {
	label: string;
	value: number;
	onChange: (v: number) => void;
	min?: number;
	max?: number;
	step?: number;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<span className="text-sm text-gray-300 min-w-[140px]">{label}</span>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(parseFloat(e.target.value))}
				className="flex-1 accent-amber-500 h-2 bg-gray-700 rounded-lg cursor-pointer"
			/>
			<span className="text-xs text-gray-500 w-10 text-right">{Math.round(value * 100)}%</span>
		</div>
	);
}

function ToggleControl({ label, description, checked, onChange }: {
	label: string;
	description?: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<div>
				<span className="text-sm text-gray-300">{label}</span>
				{description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
			</div>
			<button
				onClick={() => onChange(!checked)}
				className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-amber-500' : 'bg-gray-600'}`}
			>
				<span
					className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
				/>
			</button>
		</div>
	);
}

function SectionHeader({ title }: { title: string }) {
	return (
		<h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/80 mb-3 mt-6 first:mt-0">
			{title}
		</h3>
	);
}

export default function SettingsPanel() {
	const settings = useSettingsStore();
	const audioStore = useAudio();

	const handleMusicVolume = (v: number) => {
		settings.setSetting('musicVolume', v);
		audioStore.setMusicVolume(v);
	};

	const handleSfxVolume = (v: number) => {
		settings.setSetting('sfxVolume', v);
		audioStore.setSoundVolume(v);
	};

	const handleMusicToggle = (v: boolean) => {
		settings.setSetting('musicEnabled', v);
		if (audioStore.musicEnabled !== v) audioStore.toggleMusic();
	};

	const handleSfxToggle = (v: boolean) => {
		settings.setSetting('sfxEnabled', v);
		if (audioStore.soundEnabled !== v) audioStore.toggleSound();
	};

	return (
		<div className="space-y-2">
			<SectionHeader title="Audio" />
			<ToggleControl label="Music" checked={settings.musicEnabled} onChange={handleMusicToggle} />
			<SliderControl label="Music Volume" value={settings.musicVolume} onChange={handleMusicVolume} />
			<ToggleControl label="Sound Effects" checked={settings.sfxEnabled} onChange={handleSfxToggle} />
			<SliderControl label="SFX Volume" value={settings.sfxVolume} onChange={handleSfxVolume} />

			<SectionHeader title="Visual" />
			<ToggleControl
				label="Animations"
				description="Disable for better performance on slower devices"
				checked={settings.animationsEnabled}
				onChange={(v) => settings.setSetting('animationsEnabled', v)}
			/>
			<ToggleControl
				label="Enhanced VFX"
				description="GPU spell circles, shader effects, and elemental particles"
				checked={settings.enhancedVFX}
				onChange={(v) => settings.setSetting('enhancedVFX', v)}
			/>
			<ToggleControl
				label="Reduce Motion"
				description="Minimize screen shake and particle effects"
				checked={settings.reduceMotion}
				onChange={(v) => settings.setSetting('reduceMotion', v)}
			/>
			<div className="flex items-center justify-between gap-4">
				<span className="text-sm text-gray-300">Card Quality</span>
				<select
					value={settings.cardQuality}
					onChange={(e) => settings.setSetting('cardQuality', e.target.value as 'low' | 'medium' | 'high')}
					className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-amber-500"
				>
					<option value="low">Low</option>
					<option value="medium">Medium</option>
					<option value="high">High</option>
				</select>
			</div>

			<SectionHeader title="Gameplay" />
			<ToggleControl
				label="Auto End Turn"
				description="Automatically end turn when no actions available"
				checked={settings.autoEndTurn}
				onChange={(v) => settings.setSetting('autoEndTurn', v)}
			/>
			<ToggleControl
				label="Confirm Attacks"
				description="Show confirmation before attacking"
				checked={settings.confirmAttacks}
				onChange={(v) => settings.setSetting('confirmAttacks', v)}
			/>
			<ToggleControl
				label="Show Damage Numbers"
				checked={settings.showDamageNumbers}
				onChange={(v) => settings.setSetting('showDamageNumbers', v)}
			/>

			<SectionHeader title="Account" />
			<div className="py-2">
				<HiveKeychainLogin />
			</div>

			<div className="pt-6 border-t border-gray-700/50 mt-6">
				<button
					onClick={settings.resetToDefaults}
					className="px-4 py-2 bg-red-900/40 hover:bg-red-800/50 text-red-300 rounded-lg text-sm border border-red-700/40 transition-colors"
				>
					Reset to Defaults
				</button>
			</div>
		</div>
	);
}
