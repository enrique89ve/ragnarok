/* eslint-disable no-undef, complexity */
import type { AnimationArchetype, AnimationElement } from '../combat/data/heroAnimationProfiles';

export type SoundType =
	| 'card_play'
	| 'card_draw'
	| 'attack'
	| 'damage'
	| 'heal'
	| 'coin'
	| 'mythic'
	| 'spell'
	| 'freeze'
	| 'deathrattle'
	| 'battlecry'
	| 'discover'
	| 'secret_trigger'
	| 'game_start'
	| 'victory'
	| 'defeat'
	| 'card_hover'
	| 'card_click'
	| 'button_click'
	| 'error'
	| 'hero_power'
	| 'attack_prepare'
	| 'spell_charge'
	| 'spell_cast'
	| 'spell_impact'
	| 'fire_impact'
	| 'mythic_entrance'
	| 'turn_start'
	| 'turn_end'
	| 'damage_hero'
	| 'mana_fill'
	| 'mana_spend'
	| 'fatigue'
	| 'emote'
	| 'combat_melee'
	| 'combat_ranged'
	| 'combat_magic'
	| 'combat_divine'
	| 'combat_nature'
	| 'combat_shadow'
	| 'combat_brace'
	| 'norse_horn'
	| 'sword_clash'
	| 'rune_whisper'
	| 'timer_warning';

export class ProceduralAudio {
	private ctx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private reverbNode: ConvolverNode | null = null;
	private enabled = true;
	private volume = 0.7;

	private getContext(): AudioContext {
		if (!this.ctx) {
			this.ctx = new AudioContext();
			this.masterGain = this.ctx.createGain();
			this.masterGain.gain.value = this.volume;
			this.masterGain.connect(this.ctx.destination);
			this.reverbNode = this.createReverb(this.ctx);
		}
		if (this.ctx.state === 'suspended') this.ctx.resume();
		return this.ctx;
	}

	private getMaster(): GainNode {
		this.getContext();
		return this.masterGain!;
	}

	private getReverb(): ConvolverNode {
		this.getContext();
		return this.reverbNode!;
	}

	private createReverb(ctx: AudioContext): ConvolverNode {
		const convolver = ctx.createConvolver();
		const rate = ctx.sampleRate;
		const length = rate * 3.0;
		const impulse = ctx.createBuffer(2, length, rate);
		for (let ch = 0; ch < 2; ch++) {
			const data = impulse.getChannelData(ch);
			for (let i = 0; i < length; i++) {
				data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 1.6);
			}
		}
		convolver.buffer = impulse;
		const wet = ctx.createGain();
		wet.gain.value = 0.45;
		convolver.connect(wet);
		wet.connect(this.masterGain!);
		return convolver;
	}

	private createNoise(duration: number): AudioBuffer {
		const ctx = this.getContext();
		const length = ctx.sampleRate * duration;
		const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < length; i++) {
			data[i] = Math.random() * 2 - 1;
		}
		return buffer;
	}

	private playTone(
		freq: number,
		duration: number,
		type: OscillatorType,
		attack: number,
		decay: number,
		gainVal = 0.3,
		destination?: AudioNode
	): OscillatorNode {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = type;
		osc.frequency.value = freq;
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(gainVal, now + attack);
		gain.gain.linearRampToValueAtTime(0, now + attack + decay);
		osc.connect(gain);
		gain.connect(destination || this.getMaster());
		osc.start(now);
		osc.stop(now + duration);
		return osc;
	}

	private playNoise(
		duration: number,
		filterFreq: number,
		filterType: BiquadFilterType,
		gainVal = 0.2,
		destination?: AudioNode
	): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		const source = ctx.createBufferSource();
		source.buffer = this.createNoise(duration);
		const filter = ctx.createBiquadFilter();
		filter.type = filterType;
		filter.frequency.value = filterFreq;
		filter.Q.value = 1;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(gainVal, now);
		gain.gain.linearRampToValueAtTime(0, now + duration);
		source.connect(filter);
		filter.connect(gain);
		gain.connect(destination || this.getMaster());
		source.start(now);
		source.stop(now + duration);
	}

	private playSweep(
		startFreq: number,
		endFreq: number,
		duration: number,
		type: OscillatorType,
		attack: number,
		decay: number,
		gainVal = 0.3,
		destination?: AudioNode
	): OscillatorNode {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(startFreq, now);
		osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(gainVal, now + attack);
		gain.gain.linearRampToValueAtTime(0, now + attack + decay);
		osc.connect(gain);
		gain.connect(destination || this.getMaster());
		osc.start(now);
		osc.stop(now + duration);
		return osc;
	}

	private playFilteredNoiseBurst(
		startTime: number,
		duration: number,
		filterFreq: number,
		filterType: BiquadFilterType,
		gainVal = 0.2,
		destination?: AudioNode,
		Q = 1.5
	): void {
		const ctx = this.getContext();
		const source = ctx.createBufferSource();
		source.buffer = this.createNoise(duration);
		const filter = ctx.createBiquadFilter();
		filter.type = filterType;
		filter.frequency.value = filterFreq;
		filter.Q.value = Q;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(gainVal, startTime);
		gain.gain.linearRampToValueAtTime(0, startTime + duration);
		source.connect(filter);
		filter.connect(gain);
		gain.connect(destination || this.getMaster());
		source.start(startTime);
		source.stop(startTime + duration);
	}

	private playScheduledTone(
		startTime: number,
		freq: number,
		duration: number,
		type: OscillatorType,
		gainVal: number,
		destination?: AudioNode
	): OscillatorNode {
		const ctx = this.getContext();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = type;
		osc.frequency.value = freq;
		gain.gain.setValueAtTime(0, startTime);
		gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.01);
		gain.gain.linearRampToValueAtTime(0, startTime + duration);
		osc.connect(gain);
		gain.connect(destination || this.getMaster());
		osc.start(startTime);
		osc.stop(startTime + duration);
		return osc;
	}

	play(type: SoundType | string): void {
		if (!this.enabled) return;
		try {
			switch (type as SoundType) {
				case 'card_play': this.soundCardPlay(); break;
				case 'card_draw': this.soundCardDraw(); break;
				case 'attack': this.soundAttack(); break;
				case 'damage': this.soundDamage(); break;
				case 'heal': this.soundHeal(); break;
				case 'coin': this.soundCoin(); break;
				case 'mythic': this.soundLegendary(); break;
				case 'spell': this.soundSpell(); break;
				case 'freeze': this.soundFreeze(); break;
				case 'deathrattle': this.soundDeathrattle(); break;
				case 'battlecry': this.soundBattlecry(); break;
				case 'discover': this.soundDiscover(); break;
				case 'secret_trigger': this.soundSecretTrigger(); break;
				case 'game_start': this.soundGameStart(); break;
				case 'victory': this.soundVictory(); break;
				case 'defeat': this.soundDefeat(); break;
				case 'card_hover': this.soundCardHover(); break;
				case 'card_click': this.soundCardClick(); break;
				case 'button_click': this.soundButtonClick(); break;
				case 'error': this.soundError(); break;
				case 'hero_power': this.soundHeroPower(); break;
				case 'attack_prepare': this.soundAttackPrepare(); break;
				case 'spell_charge': this.soundSpellCharge(); break;
				case 'spell_cast': this.soundSpellCast(); break;
				case 'spell_impact': this.soundSpellImpact(); break;
				case 'fire_impact': this.soundFireImpact(); break;
				case 'mythic_entrance': this.soundLegendaryEntrance(); break;
				case 'turn_start': this.soundTurnStart(); break;
				case 'turn_end': this.soundTurnEnd(); break;
				case 'damage_hero': this.soundDamageHero(); break;
				case 'mana_fill': this.soundManaFill(); break;
				case 'mana_spend': this.soundManaSpend(); break;
				case 'fatigue': this.soundFatigue(); break;
				case 'emote': this.soundEmote(); break;
				case 'combat_melee': this.soundCombatMelee(); break;
				case 'combat_ranged': this.soundCombatRanged(); break;
				case 'combat_magic': this.soundCombatMagic(); break;
				case 'combat_divine': this.soundCombatDivine(); break;
				case 'combat_nature': this.soundCombatNature(); break;
				case 'combat_shadow': this.soundCombatShadow(); break;
				case 'combat_brace': this.soundCombatBrace(); break;
				case 'norse_horn': this.soundNorseHorn(); break;
				case 'sword_clash': this.soundSwordClash(); break;
				case 'rune_whisper': this.soundRuneWhisper(); break;
				case 'timer_warning': this.soundTimerWarning(); break;
				default: this.soundButtonClick(); break;
			}
		} catch {
			// silently ignore audio errors
		}
	}

	playCombatSound(archetype: AnimationArchetype, element: AnimationElement, intensity = 0.7): void {
		if (!this.enabled) return;
		try {
			const archetypeMap: Record<AnimationArchetype, () => void> = {
				melee_strike: () => this.soundCombatMeleeElemental(element, intensity),
				ranged_shot: () => this.soundCombatRangedElemental(element, intensity),
				magic_blast: () => this.soundCombatMagicElemental(element, intensity),
				divine_radiance: () => this.soundCombatDivineElemental(element, intensity),
				nature_surge: () => this.soundCombatNatureElemental(element, intensity),
				shadow_strike: () => this.soundCombatShadowElemental(element, intensity),
			};
			archetypeMap[archetype]();
		} catch {
			// silently ignore
		}
	}

	setVolume(v: number): void {
		this.volume = Math.max(0, Math.min(1, v));
		if (this.masterGain) {
			this.masterGain.gain.value = this.volume;
		}
	}

	setEnabled(e: boolean): void {
		this.enabled = e;
	}

	getEnabled(): boolean {
		return this.enabled;
	}

	getVolume(): number {
		return this.volume;
	}

	// ═══════════════════════════════════════════
	//  ELEMENT MODULATION HELPERS
	// ═══════════════════════════════════════════

	private getElementFreqOffset(element: AnimationElement): number {
		switch (element) {
			case 'fire': return 50;
			case 'ice': return -20;
			case 'electric': return 30;
			case 'water': return -30;
			case 'light': return 20;
			case 'dark': return -40;
			case 'grass': return -10;
			default: return 0;
		}
	}

	private addElementLayer(element: AnimationElement, intensity: number): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		const g = intensity * 0.15;

		switch (element) {
			case 'fire': {
				const crackle = ctx.createBufferSource();
				crackle.buffer = this.createNoise(0.3);
				const f = ctx.createBiquadFilter();
				f.type = 'bandpass';
				f.frequency.setValueAtTime(3000, now);
				f.frequency.linearRampToValueAtTime(800, now + 0.3);
				f.Q.value = 3;
				const gain = ctx.createGain();
				gain.gain.setValueAtTime(g, now);
				gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
				crackle.connect(f);
				f.connect(gain);
				gain.connect(this.getMaster());
				crackle.start(now);
				crackle.stop(now + 0.3);
				break;
			}
			case 'ice': {
				for (let i = 0; i < 4; i++) {
					const t = now + i * 0.06;
					const freq = 3000 + Math.random() * 3000;
					this.playScheduledTone(t, freq, 0.05, 'sine', g * 0.8);
				}
				break;
			}
			case 'electric': {
				const buzz = ctx.createOscillator();
				const lfo = ctx.createOscillator();
				const lfoGain = ctx.createGain();
				const buzzGain = ctx.createGain();
				buzz.type = 'sawtooth';
				buzz.frequency.value = 120;
				lfo.type = 'square';
				lfo.frequency.value = 15;
				lfoGain.gain.value = 60;
				lfo.connect(lfoGain);
				lfoGain.connect(buzz.frequency);
				buzzGain.gain.setValueAtTime(g, now);
				buzzGain.gain.linearRampToValueAtTime(0, now + 0.25);
				buzz.connect(buzzGain);
				buzzGain.connect(this.getMaster());
				buzz.start(now);
				buzz.stop(now + 0.25);
				lfo.start(now);
				lfo.stop(now + 0.25);
				break;
			}
			case 'water': {
				this.playFilteredNoiseBurst(now, 0.4, 400, 'bandpass', g, this.getReverb(), 2);
				break;
			}
			case 'light': {
				this.playScheduledTone(now, 880, 0.5, 'triangle', g * 0.6, this.getReverb());
				this.playScheduledTone(now + 0.05, 1320, 0.4, 'triangle', g * 0.3, this.getReverb());
				break;
			}
			case 'dark': {
				const d1 = ctx.createOscillator();
				const d2 = ctx.createOscillator();
				const dg = ctx.createGain();
				d1.type = 'sawtooth';
				d1.frequency.value = 50;
				d2.type = 'sawtooth';
				d2.frequency.value = 53;
				dg.gain.setValueAtTime(g, now);
				dg.gain.linearRampToValueAtTime(0, now + 0.4);
				d1.connect(dg);
				d2.connect(dg);
				dg.connect(this.getMaster());
				d1.start(now);
				d2.start(now);
				d1.stop(now + 0.4);
				d2.stop(now + 0.4);
				break;
			}
			case 'grass': {
				const wobble = ctx.createOscillator();
				const wobbleLfo = ctx.createOscillator();
				const wobbleLfoGain = ctx.createGain();
				const wobbleGain = ctx.createGain();
				wobble.type = 'sine';
				wobble.frequency.value = 300;
				wobbleLfo.type = 'sine';
				wobbleLfo.frequency.value = 3;
				wobbleLfoGain.gain.value = 40;
				wobbleLfo.connect(wobbleLfoGain);
				wobbleLfoGain.connect(wobble.frequency);
				wobbleGain.gain.setValueAtTime(g * 0.5, now);
				wobbleGain.gain.linearRampToValueAtTime(0, now + 0.4);
				wobble.connect(wobbleGain);
				wobbleGain.connect(this.getReverb());
				wobble.start(now);
				wobble.stop(now + 0.4);
				wobbleLfo.start(now);
				wobbleLfo.stop(now + 0.4);
				break;
			}
		}
	}

	// ═══════════════════════════════════════════
	//  NORSE HORN — Gjallarhorn
	// ═══════════════════════════════════════════

	private soundNorseHorn(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Main horn — deep sawtooth through ascending fifths (octave lower)
		const horn = ctx.createOscillator();
		const hornGain = ctx.createGain();
		horn.type = 'sawtooth';
		horn.frequency.setValueAtTime(55, now);
		horn.frequency.linearRampToValueAtTime(82, now + 1.0);
		horn.frequency.linearRampToValueAtTime(110, now + 2.0);
		horn.frequency.linearRampToValueAtTime(82, now + 3.0);
		hornGain.gain.setValueAtTime(0, now);
		hornGain.gain.linearRampToValueAtTime(0.25, now + 0.5);
		hornGain.gain.linearRampToValueAtTime(0.3, now + 1.2);
		hornGain.gain.linearRampToValueAtTime(0.2, now + 2.8);
		hornGain.gain.linearRampToValueAtTime(0, now + 3.5);
		const hornFilter = ctx.createBiquadFilter();
		hornFilter.type = 'lowpass';
		hornFilter.frequency.setValueAtTime(400, now);
		hornFilter.frequency.linearRampToValueAtTime(800, now + 1.2);
		hornFilter.frequency.linearRampToValueAtTime(500, now + 3.5);
		horn.connect(hornFilter);
		hornFilter.connect(hornGain);
		hornGain.connect(this.getMaster());
		hornGain.connect(this.getReverb());
		horn.start(now);
		horn.stop(now + 3.5);

		// Sub-bass foundation (very deep)
		const sub = ctx.createOscillator();
		const subGain = ctx.createGain();
		sub.type = 'sine';
		sub.frequency.value = 30;
		subGain.gain.setValueAtTime(0, now);
		subGain.gain.linearRampToValueAtTime(0.25, now + 0.4);
		subGain.gain.linearRampToValueAtTime(0.15, now + 2.0);
		subGain.gain.linearRampToValueAtTime(0, now + 3.5);
		sub.connect(subGain);
		subGain.connect(this.getMaster());
		sub.start(now);
		sub.stop(now + 3.5);

		// Breath noise (horn air)
		const breath = ctx.createBufferSource();
		breath.buffer = this.createNoise(3.5);
		const breathFilter = ctx.createBiquadFilter();
		breathFilter.type = 'bandpass';
		breathFilter.frequency.setValueAtTime(200, now);
		breathFilter.frequency.linearRampToValueAtTime(400, now + 1.2);
		breathFilter.frequency.linearRampToValueAtTime(200, now + 3.5);
		breathFilter.Q.value = 1.5;
		const breathGain = ctx.createGain();
		breathGain.gain.setValueAtTime(0, now);
		breathGain.gain.linearRampToValueAtTime(0.06, now + 0.4);
		breathGain.gain.linearRampToValueAtTime(0.04, now + 2.8);
		breathGain.gain.linearRampToValueAtTime(0, now + 3.5);
		breath.connect(breathFilter);
		breathFilter.connect(breathGain);
		breathGain.connect(this.getMaster());
		breath.start(now);
		breath.stop(now + 3.5);

		// Deep drum hits
		this.playFilteredNoiseBurst(now + 0.05, 0.15, 100, 'lowpass', 0.4);
		this.playFilteredNoiseBurst(now + 1.0, 0.12, 100, 'lowpass', 0.3);
		this.playFilteredNoiseBurst(now + 2.0, 0.12, 100, 'lowpass', 0.35);
	}

	// ═══════════════════════════════════════════
	//  SWORD CLASH — Two blades meeting
	// ═══════════════════════════════════════════

	private soundSwordClash(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// First blade strike
		this.playFilteredNoiseBurst(now, 0.08, 8000, 'highpass', 0.35);
		// Second blade ring (30ms offset)
		this.playFilteredNoiseBurst(now + 0.03, 0.1, 6000, 'highpass', 0.3);

		// Metallic resonance
		const ring = ctx.createOscillator();
		const ringGain = ctx.createGain();
		ring.type = 'sine';
		ring.frequency.setValueAtTime(800, now);
		ring.frequency.exponentialRampToValueAtTime(400, now + 0.3);
		ringGain.gain.setValueAtTime(0.25, now);
		ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
		ring.connect(ringGain);
		ringGain.connect(this.getMaster());
		ringGain.connect(this.getReverb());
		ring.start(now);
		ring.stop(now + 0.3);

		// Sub thud
		const thud = ctx.createOscillator();
		const thudGain = ctx.createGain();
		thud.type = 'sine';
		thud.frequency.value = 60;
		thudGain.gain.setValueAtTime(0.2, now);
		thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
		thud.connect(thudGain);
		thudGain.connect(this.getMaster());
		thud.start(now);
		thud.stop(now + 0.15);
	}

	// ═══════════════════════════════════════════
	//  RUNE WHISPER — Subtle magic
	// ═══════════════════════════════════════════

	private soundRuneWhisper(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Quiet bandpass breath
		this.playFilteredNoiseBurst(now, 0.15, 1500, 'bandpass', 0.04, undefined, 8);

		// Detuned sine pair (mystical shimmer)
		const s1 = ctx.createOscillator();
		const s2 = ctx.createOscillator();
		const sGain = ctx.createGain();
		s1.type = 'sine';
		s1.frequency.value = 600;
		s2.type = 'sine';
		s2.frequency.value = 603;
		sGain.gain.setValueAtTime(0.04, now);
		sGain.gain.linearRampToValueAtTime(0, now + 0.15);
		s1.connect(sGain);
		s2.connect(sGain);
		sGain.connect(this.getMaster());
		sGain.connect(this.getReverb());
		s1.start(now);
		s2.start(now);
		s1.stop(now + 0.15);
		s2.stop(now + 0.15);
	}

	// ═══════════════════════════════════════════
	//  TIMER WARNING — Norse war drum strike
	//  Deep taiko-style hit for 10-second warning
	// ═══════════════════════════════════════════

	private soundTimerWarning(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Deep drum body — sine sweep from 80Hz down to 40Hz
		const drum = ctx.createOscillator();
		const drumGain = ctx.createGain();
		drum.type = 'sine';
		drum.frequency.setValueAtTime(80, now);
		drum.frequency.exponentialRampToValueAtTime(40, now + 0.4);
		drumGain.gain.setValueAtTime(0.6, now);
		drumGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
		drum.connect(drumGain);
		drumGain.connect(this.getMaster());
		drum.start(now);
		drum.stop(now + 0.7);

		// Sub-bass thud — even lower for chest impact
		const sub = ctx.createOscillator();
		const subGain = ctx.createGain();
		sub.type = 'sine';
		sub.frequency.setValueAtTime(50, now);
		sub.frequency.exponentialRampToValueAtTime(25, now + 0.5);
		subGain.gain.setValueAtTime(0.45, now);
		subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
		sub.connect(subGain);
		subGain.connect(this.getMaster());
		sub.start(now);
		sub.stop(now + 0.6);

		// Skin slap — filtered noise for the attack transient
		this.playFilteredNoiseBurst(now, 0.06, 200, 'lowpass', 0.5);

		// Overtone ring — adds warmth and resonance
		const ring = ctx.createOscillator();
		const ringGain = ctx.createGain();
		ring.type = 'triangle';
		ring.frequency.setValueAtTime(120, now);
		ring.frequency.exponentialRampToValueAtTime(60, now + 0.3);
		ringGain.gain.setValueAtTime(0.15, now);
		ringGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
		ring.connect(ringGain);
		ringGain.connect(this.getReverb());
		ring.start(now);
		ring.stop(now + 0.5);
	}

	// ═══════════════════════════════════════════
	//  COMBAT BRACE — Shield block
	// ═══════════════════════════════════════════

	private soundCombatBrace(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Shield impact — heavy lowpass burst
		this.playFilteredNoiseBurst(now, 0.15, 500, 'lowpass', 0.4);

		// Resonant body
		const body = ctx.createOscillator();
		const bodyGain = ctx.createGain();
		body.type = 'sine';
		body.frequency.setValueAtTime(180, now);
		body.frequency.exponentialRampToValueAtTime(100, now + 0.3);
		bodyGain.gain.setValueAtTime(0.3, now);
		bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
		body.connect(bodyGain);
		bodyGain.connect(this.getMaster());
		body.start(now);
		body.stop(now + 0.35);

		// Metallic ring (sword hitting shield rim)
		const ring = ctx.createOscillator();
		const ringGain = ctx.createGain();
		ring.type = 'sine';
		ring.frequency.value = 2500;
		ringGain.gain.setValueAtTime(0.12, now + 0.02);
		ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
		ring.connect(ringGain);
		ringGain.connect(this.getMaster());
		ring.start(now + 0.02);
		ring.stop(now + 0.2);

		// Wood creak
		this.playFilteredNoiseBurst(now + 0.05, 0.08, 1200, 'bandpass', 0.1, undefined, 4);
	}

	// ═══════════════════════════════════════════
	//  COMBAT ARCHETYPE SOUNDS (base)
	// ═══════════════════════════════════════════

	private soundCombatMelee(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Sword slash sweep
		this.playSweep(200, 80, 0.2, 'sawtooth', 0.01, 0.18, 0.3);

		// Metal ring
		this.playFilteredNoiseBurst(now, 0.12, 6000, 'highpass', 0.3);

		// Thud on contact
		const thud = ctx.createOscillator();
		const thudGain = ctx.createGain();
		thud.type = 'sine';
		thud.frequency.value = 60;
		thudGain.gain.setValueAtTime(0.25, now + 0.1);
		thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
		thud.connect(thudGain);
		thudGain.connect(this.getMaster());
		thud.start(now + 0.1);
		thud.stop(now + 0.3);

		// Secondary slash trail
		this.playFilteredNoiseBurst(now + 0.05, 0.08, 3000, 'bandpass', 0.15);
	}

	private soundCombatRanged(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Arrow whoosh (noise sweep)
		const whoosh = ctx.createBufferSource();
		whoosh.buffer = this.createNoise(0.4);
		const whooshFilter = ctx.createBiquadFilter();
		whooshFilter.type = 'bandpass';
		whooshFilter.frequency.setValueAtTime(1000, now);
		whooshFilter.frequency.linearRampToValueAtTime(4000, now + 0.3);
		whooshFilter.Q.value = 2;
		const whooshGain = ctx.createGain();
		whooshGain.gain.setValueAtTime(0.05, now);
		whooshGain.gain.linearRampToValueAtTime(0.25, now + 0.15);
		whooshGain.gain.linearRampToValueAtTime(0, now + 0.4);
		whoosh.connect(whooshFilter);
		whooshFilter.connect(whooshGain);
		whooshGain.connect(this.getMaster());
		whoosh.start(now);
		whoosh.stop(now + 0.4);

		// Bowstring twang
		this.playScheduledTone(now, 400, 0.08, 'triangle', 0.15);

		// Impact thud at end
		const thud = ctx.createOscillator();
		const thudGain = ctx.createGain();
		thud.type = 'sine';
		thud.frequency.value = 80;
		thudGain.gain.setValueAtTime(0.2, now + 0.3);
		thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
		thud.connect(thudGain);
		thudGain.connect(this.getMaster());
		thud.start(now + 0.3);
		thud.stop(now + 0.5);
	}

	private soundCombatMagic(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Rising energy chord (root + fifth + octave)
		const root = ctx.createOscillator();
		const fifth = ctx.createOscillator();
		const oct = ctx.createOscillator();
		const chordGain = ctx.createGain();
		root.type = 'sine';
		root.frequency.setValueAtTime(220, now);
		root.frequency.linearRampToValueAtTime(440, now + 0.4);
		fifth.type = 'sine';
		fifth.frequency.setValueAtTime(330, now);
		fifth.frequency.linearRampToValueAtTime(660, now + 0.4);
		oct.type = 'sine';
		oct.frequency.setValueAtTime(440, now);
		oct.frequency.linearRampToValueAtTime(880, now + 0.4);

		// LFO tremolo
		const lfo = ctx.createOscillator();
		const lfoGain = ctx.createGain();
		lfo.type = 'sine';
		lfo.frequency.value = 6;
		lfoGain.gain.value = 0.08;
		lfo.connect(lfoGain);
		lfoGain.connect(chordGain.gain);

		chordGain.gain.setValueAtTime(0.05, now);
		chordGain.gain.linearRampToValueAtTime(0.2, now + 0.3);
		chordGain.gain.linearRampToValueAtTime(0, now + 0.6);
		root.connect(chordGain);
		fifth.connect(chordGain);
		oct.connect(chordGain);
		chordGain.connect(this.getMaster());
		chordGain.connect(this.getReverb());
		root.start(now); root.stop(now + 0.6);
		fifth.start(now); fifth.stop(now + 0.6);
		oct.start(now); oct.stop(now + 0.6);
		lfo.start(now); lfo.stop(now + 0.6);

		// Burst at peak
		this.playFilteredNoiseBurst(now + 0.35, 0.15, 2000, 'bandpass', 0.2, this.getReverb());
	}

	private soundCombatDivine(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Choir-like harmonics fading in
		const freqs = [220, 440, 880];
		freqs.forEach((freq, i) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = 'triangle';
			osc.frequency.value = freq;
			gain.gain.setValueAtTime(0, now);
			gain.gain.linearRampToValueAtTime(0.12 / (i + 1), now + 0.3);
			gain.gain.linearRampToValueAtTime(0.08 / (i + 1), now + 0.5);
			gain.gain.linearRampToValueAtTime(0, now + 0.7);
			osc.connect(gain);
			gain.connect(this.getMaster());
			gain.connect(this.getReverb());
			osc.start(now);
			osc.stop(now + 0.7);
		});

		// Shimmer
		const shimmer = ctx.createOscillator();
		const shimmerGain = ctx.createGain();
		shimmer.type = 'sine';
		shimmer.frequency.setValueAtTime(3000, now + 0.2);
		shimmer.frequency.linearRampToValueAtTime(5000, now + 0.6);
		shimmerGain.gain.setValueAtTime(0, now + 0.2);
		shimmerGain.gain.linearRampToValueAtTime(0.06, now + 0.35);
		shimmerGain.gain.linearRampToValueAtTime(0, now + 0.7);
		shimmer.connect(shimmerGain);
		shimmerGain.connect(this.getReverb());
		shimmer.start(now + 0.2);
		shimmer.stop(now + 0.7);
	}

	private soundCombatNature(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Wind sweep
		const wind = ctx.createBufferSource();
		wind.buffer = this.createNoise(0.5);
		const windFilter = ctx.createBiquadFilter();
		windFilter.type = 'bandpass';
		windFilter.frequency.setValueAtTime(200, now);
		windFilter.frequency.linearRampToValueAtTime(2000, now + 0.3);
		windFilter.frequency.linearRampToValueAtTime(600, now + 0.5);
		windFilter.Q.value = 1.5;
		const windGain = ctx.createGain();
		windGain.gain.setValueAtTime(0.05, now);
		windGain.gain.linearRampToValueAtTime(0.2, now + 0.2);
		windGain.gain.linearRampToValueAtTime(0, now + 0.5);
		wind.connect(windFilter);
		windFilter.connect(windGain);
		windGain.connect(this.getMaster());
		windGain.connect(this.getReverb());
		wind.start(now);
		wind.stop(now + 0.5);

		// Organic wobble
		const wobble = ctx.createOscillator();
		const wobbleLfo = ctx.createOscillator();
		const wobbleLfoGain = ctx.createGain();
		const wobbleGain = ctx.createGain();
		wobble.type = 'sine';
		wobble.frequency.value = 250;
		wobbleLfo.type = 'sine';
		wobbleLfo.frequency.value = 4;
		wobbleLfoGain.gain.value = 50;
		wobbleLfo.connect(wobbleLfoGain);
		wobbleLfoGain.connect(wobble.frequency);
		wobbleGain.gain.setValueAtTime(0, now);
		wobbleGain.gain.linearRampToValueAtTime(0.1, now + 0.15);
		wobbleGain.gain.linearRampToValueAtTime(0, now + 0.5);
		wobble.connect(wobbleGain);
		wobbleGain.connect(this.getMaster());
		wobble.start(now);
		wobble.stop(now + 0.5);
		wobbleLfo.start(now);
		wobbleLfo.stop(now + 0.5);
	}

	private soundCombatShadow(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Detuned dark drones
		const d1 = ctx.createOscillator();
		const d2 = ctx.createOscillator();
		const droneGain = ctx.createGain();
		d1.type = 'sawtooth';
		d1.frequency.value = 50;
		d2.type = 'sawtooth';
		d2.frequency.value = 53;
		droneGain.gain.setValueAtTime(0, now);
		droneGain.gain.linearRampToValueAtTime(0.15, now + 0.1);
		droneGain.gain.linearRampToValueAtTime(0.12, now + 0.3);
		droneGain.gain.linearRampToValueAtTime(0, now + 0.5);
		d1.connect(droneGain);
		d2.connect(droneGain);
		droneGain.connect(this.getMaster());
		d1.start(now); d1.stop(now + 0.5);
		d2.start(now); d2.stop(now + 0.5);

		// Reverse-ish noise (fade in then cut)
		const revNoise = ctx.createBufferSource();
		revNoise.buffer = this.createNoise(0.3);
		const revFilter = ctx.createBiquadFilter();
		revFilter.type = 'lowpass';
		revFilter.frequency.value = 1000;
		const revGain = ctx.createGain();
		revGain.gain.setValueAtTime(0, now + 0.1);
		revGain.gain.linearRampToValueAtTime(0.2, now + 0.35);
		revGain.gain.setValueAtTime(0, now + 0.36);
		revNoise.connect(revFilter);
		revFilter.connect(revGain);
		revGain.connect(this.getMaster());
		revNoise.start(now + 0.1);
		revNoise.stop(now + 0.4);

		// High sinister ping
		this.playScheduledTone(now + 0.35, 1800, 0.12, 'sine', 0.1, this.getReverb());
	}

	// ═══════════════════════════════════════════
	//  COMBAT SOUNDS WITH ELEMENT MODULATION
	// ═══════════════════════════════════════════

	private soundCombatMeleeElemental(element: AnimationElement, intensity: number): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		const freqOff = this.getElementFreqOffset(element);

		this.playSweep(200 + freqOff, 80, 0.2, 'sawtooth', 0.01, 0.18, 0.3 * intensity);
		this.playFilteredNoiseBurst(now, 0.12, 6000, 'highpass', 0.3 * intensity);

		const thud = ctx.createOscillator();
		const thudGain = ctx.createGain();
		thud.type = 'sine';
		thud.frequency.value = 60;
		thudGain.gain.setValueAtTime(0.25 * intensity, now + 0.1);
		thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
		thud.connect(thudGain);
		thudGain.connect(this.getMaster());
		thud.start(now + 0.1);
		thud.stop(now + 0.3);

		this.addElementLayer(element, intensity);
	}

	private soundCombatRangedElemental(element: AnimationElement, intensity: number): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		const whoosh = ctx.createBufferSource();
		whoosh.buffer = this.createNoise(0.4);
		const wf = ctx.createBiquadFilter();
		wf.type = 'bandpass';
		wf.frequency.setValueAtTime(1000, now);
		wf.frequency.linearRampToValueAtTime(4000, now + 0.3);
		wf.Q.value = 2;
		const wg = ctx.createGain();
		wg.gain.setValueAtTime(0.05, now);
		wg.gain.linearRampToValueAtTime(0.25 * intensity, now + 0.15);
		wg.gain.linearRampToValueAtTime(0, now + 0.4);
		whoosh.connect(wf);
		wf.connect(wg);
		wg.connect(this.getMaster());
		whoosh.start(now);
		whoosh.stop(now + 0.4);

		this.playScheduledTone(now, 400, 0.08, 'triangle', 0.15 * intensity);

		const thud = ctx.createOscillator();
		const thudGain = ctx.createGain();
		thud.type = 'sine';
		thud.frequency.value = 80;
		thudGain.gain.setValueAtTime(0.2 * intensity, now + 0.3);
		thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
		thud.connect(thudGain);
		thudGain.connect(this.getMaster());
		thud.start(now + 0.3);
		thud.stop(now + 0.5);

		this.addElementLayer(element, intensity);
	}

	private soundCombatMagicElemental(element: AnimationElement, intensity: number): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		const freqOff = this.getElementFreqOffset(element);
		const baseFreq = 220 + freqOff;

		const root = ctx.createOscillator();
		const fifth = ctx.createOscillator();
		const chordGain = ctx.createGain();
		root.type = 'sine';
		root.frequency.setValueAtTime(baseFreq, now);
		root.frequency.linearRampToValueAtTime(baseFreq * 2, now + 0.4);
		fifth.type = 'sine';
		fifth.frequency.setValueAtTime(baseFreq * 1.5, now);
		fifth.frequency.linearRampToValueAtTime(baseFreq * 3, now + 0.4);

		const lfo = ctx.createOscillator();
		const lfoGain = ctx.createGain();
		lfo.type = 'sine';
		lfo.frequency.value = 6;
		lfoGain.gain.value = 0.08 * intensity;
		lfo.connect(lfoGain);
		lfoGain.connect(chordGain.gain);

		chordGain.gain.setValueAtTime(0.05, now);
		chordGain.gain.linearRampToValueAtTime(0.2 * intensity, now + 0.3);
		chordGain.gain.linearRampToValueAtTime(0, now + 0.6);
		root.connect(chordGain);
		fifth.connect(chordGain);
		chordGain.connect(this.getMaster());
		chordGain.connect(this.getReverb());
		root.start(now); root.stop(now + 0.6);
		fifth.start(now); fifth.stop(now + 0.6);
		lfo.start(now); lfo.stop(now + 0.6);

		this.playFilteredNoiseBurst(now + 0.35, 0.15, 2000, 'bandpass', 0.2 * intensity, this.getReverb());
		this.addElementLayer(element, intensity);
	}

	private soundCombatDivineElemental(element: AnimationElement, intensity: number): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		const freqs = [220, 440, 880];
		freqs.forEach((freq, i) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = 'triangle';
			osc.frequency.value = freq;
			const g = (0.12 / (i + 1)) * intensity;
			gain.gain.setValueAtTime(0, now);
			gain.gain.linearRampToValueAtTime(g, now + 0.3);
			gain.gain.linearRampToValueAtTime(g * 0.6, now + 0.5);
			gain.gain.linearRampToValueAtTime(0, now + 0.7);
			osc.connect(gain);
			gain.connect(this.getMaster());
			gain.connect(this.getReverb());
			osc.start(now);
			osc.stop(now + 0.7);
		});

		this.addElementLayer(element, intensity);
	}

	private soundCombatNatureElemental(element: AnimationElement, intensity: number): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		const wind = ctx.createBufferSource();
		wind.buffer = this.createNoise(0.5);
		const wf = ctx.createBiquadFilter();
		wf.type = 'bandpass';
		wf.frequency.setValueAtTime(200, now);
		wf.frequency.linearRampToValueAtTime(2000, now + 0.3);
		wf.Q.value = 1.5;
		const wg = ctx.createGain();
		wg.gain.setValueAtTime(0.05, now);
		wg.gain.linearRampToValueAtTime(0.2 * intensity, now + 0.2);
		wg.gain.linearRampToValueAtTime(0, now + 0.5);
		wind.connect(wf);
		wf.connect(wg);
		wg.connect(this.getMaster());
		wg.connect(this.getReverb());
		wind.start(now);
		wind.stop(now + 0.5);

		this.addElementLayer(element, intensity);
	}

	private soundCombatShadowElemental(element: AnimationElement, intensity: number): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		const d1 = ctx.createOscillator();
		const d2 = ctx.createOscillator();
		const dg = ctx.createGain();
		d1.type = 'sawtooth';
		d1.frequency.value = 50;
		d2.type = 'sawtooth';
		d2.frequency.value = 53;
		dg.gain.setValueAtTime(0, now);
		dg.gain.linearRampToValueAtTime(0.15 * intensity, now + 0.1);
		dg.gain.linearRampToValueAtTime(0, now + 0.5);
		d1.connect(dg);
		d2.connect(dg);
		dg.connect(this.getMaster());
		d1.start(now); d1.stop(now + 0.5);
		d2.start(now); d2.stop(now + 0.5);

		this.playScheduledTone(now + 0.35, 1800, 0.12, 'sine', 0.1 * intensity, this.getReverb());
		this.addElementLayer(element, intensity);
	}

	// ═══════════════════════════════════════════
	//  CARD & UI SOUNDS — Norse-themed
	// ═══════════════════════════════════════════

	private soundCardPlay(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Rune whisper
		this.playFilteredNoiseBurst(now, 0.1, 1500, 'bandpass', 0.05, undefined, 6);

		// Stone table thud
		this.playFilteredNoiseBurst(now + 0.03, 0.08, 300, 'lowpass', 0.25);

		// Brief resonance
		const thud = ctx.createOscillator();
		const thudGain = ctx.createGain();
		thud.type = 'sine';
		thud.frequency.value = 150;
		thudGain.gain.setValueAtTime(0.2, now + 0.03);
		thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
		thud.connect(thudGain);
		thudGain.connect(this.getMaster());
		thud.start(now + 0.03);
		thud.stop(now + 0.15);
	}

	private soundCardDraw(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Rune whisper
		this.playFilteredNoiseBurst(now, 0.08, 1200, 'bandpass', 0.04, undefined, 6);

		// Parchment slide (noise sweep)
		const slide = ctx.createBufferSource();
		slide.buffer = this.createNoise(0.15);
		const slideFilter = ctx.createBiquadFilter();
		slideFilter.type = 'bandpass';
		slideFilter.frequency.setValueAtTime(800, now);
		slideFilter.frequency.linearRampToValueAtTime(2000, now + 0.15);
		slideFilter.Q.value = 2;
		const slideGain = ctx.createGain();
		slideGain.gain.setValueAtTime(0.15, now);
		slideGain.gain.linearRampToValueAtTime(0, now + 0.15);
		slide.connect(slideFilter);
		slideFilter.connect(slideGain);
		slideGain.connect(this.getMaster());
		slide.start(now);
		slide.stop(now + 0.15);
	}

	private soundAttack(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Sword slash
		this.playSweep(300, 100, 0.2, 'sawtooth', 0.01, 0.18, 0.3);

		// Metal ring
		this.playFilteredNoiseBurst(now, 0.1, 5000, 'highpass', 0.3);

		// Whoosh
		this.playFilteredNoiseBurst(now, 0.15, 2000, 'bandpass', 0.15);

		// Contact thud
		const thud = ctx.createOscillator();
		const thudGain = ctx.createGain();
		thud.type = 'sine';
		thud.frequency.value = 80;
		thudGain.gain.setValueAtTime(0.2, now + 0.08);
		thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
		thud.connect(thudGain);
		thudGain.connect(this.getMaster());
		thud.start(now + 0.08);
		thud.stop(now + 0.25);
	}

	private soundDamage(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Shield/armor impact
		this.playFilteredNoiseBurst(now, 0.1, 400, 'lowpass', 0.35);

		// Resonant bell
		const bell = ctx.createOscillator();
		const bellGain = ctx.createGain();
		bell.type = 'sine';
		bell.frequency.setValueAtTime(120, now);
		bell.frequency.exponentialRampToValueAtTime(60, now + 0.3);
		bellGain.gain.setValueAtTime(0.3, now);
		bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
		bell.connect(bellGain);
		bellGain.connect(this.getMaster());
		bell.start(now);
		bell.stop(now + 0.3);

		// Crunch
		this.playFilteredNoiseBurst(now + 0.02, 0.08, 2000, 'bandpass', 0.2);
	}

	private soundDamageHero(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Deep sub-bass thud
		const sub = ctx.createOscillator();
		const subGain = ctx.createGain();
		sub.type = 'sine';
		sub.frequency.setValueAtTime(40, now);
		sub.frequency.linearRampToValueAtTime(20, now + 0.5);
		subGain.gain.setValueAtTime(0.5, now);
		subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
		sub.connect(subGain);
		subGain.connect(this.getMaster());
		sub.start(now);
		sub.stop(now + 0.5);

		// Heavy impact
		this.playFilteredNoiseBurst(now, 0.15, 600, 'lowpass', 0.45);

		// Crunch layers
		this.playFilteredNoiseBurst(now, 0.1, 3000, 'bandpass', 0.2);
		this.playFilteredNoiseBurst(now + 0.03, 0.08, 5000, 'highpass', 0.12);

		// Body resonance
		const body = ctx.createOscillator();
		const bodyGain = ctx.createGain();
		body.type = 'square';
		body.frequency.setValueAtTime(100, now);
		body.frequency.linearRampToValueAtTime(40, now + 0.2);
		bodyGain.gain.setValueAtTime(0.12, now);
		bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
		body.connect(bodyGain);
		bodyGain.connect(this.getMaster());
		body.start(now);
		body.stop(now + 0.2);
	}

	private soundHeal(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Deep chime triad (C-E-G, octave lower)
		const notes = [262, 330, 392];
		notes.forEach((freq, i) => {
			const t = now + i * 0.12;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = 'triangle';
			osc.frequency.value = freq;
			gain.gain.setValueAtTime(0, t);
			gain.gain.linearRampToValueAtTime(0.15, t + 0.04);
			gain.gain.linearRampToValueAtTime(0, t + 0.3);
			osc.connect(gain);
			gain.connect(this.getMaster());
			gain.connect(this.getReverb());
			osc.start(t);
			osc.stop(t + 0.3);
		});

		// Nature wind breath
		this.playFilteredNoiseBurst(now, 0.35, 500, 'bandpass', 0.04, this.getReverb(), 2);
	}

	private soundSpell(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Rune charge — rising sweep with detuned pair
		const s1 = ctx.createOscillator();
		const s2 = ctx.createOscillator();
		const sGain = ctx.createGain();
		s1.type = 'sine';
		s1.frequency.setValueAtTime(200, now);
		s1.frequency.exponentialRampToValueAtTime(1500, now + 0.4);
		s2.type = 'sine';
		s2.frequency.setValueAtTime(203, now);
		s2.frequency.exponentialRampToValueAtTime(1505, now + 0.4);
		sGain.gain.setValueAtTime(0.05, now);
		sGain.gain.linearRampToValueAtTime(0.2, now + 0.3);
		sGain.gain.linearRampToValueAtTime(0, now + 0.5);
		s1.connect(sGain);
		s2.connect(sGain);
		sGain.connect(this.getMaster());
		sGain.connect(this.getReverb());
		s1.start(now); s1.stop(now + 0.5);
		s2.start(now); s2.stop(now + 0.5);

		// Whoosh
		this.playFilteredNoiseBurst(now + 0.2, 0.2, 2000, 'bandpass', 0.12, this.getReverb());
	}

	private soundSpellCast(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Rune release — descending sweep
		this.playSweep(1500, 300, 0.3, 'sine', 0.01, 0.28, 0.22, this.getReverb());
		this.playSweep(1505, 303, 0.3, 'sine', 0.01, 0.28, 0.15);

		// Burst
		this.playFilteredNoiseBurst(now, 0.12, 2500, 'bandpass', 0.2);

		// Reverb tail
		this.playFilteredNoiseBurst(now + 0.1, 0.25, 1000, 'bandpass', 0.06, this.getReverb());
	}

	private soundSpellCharge(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Rising rune energy
		const s1 = ctx.createOscillator();
		const s2 = ctx.createOscillator();
		const gain = ctx.createGain();
		s1.type = 'sine';
		s1.frequency.setValueAtTime(200, now);
		s1.frequency.exponentialRampToValueAtTime(2000, now + 0.6);
		s2.type = 'sine';
		s2.frequency.setValueAtTime(205, now);
		s2.frequency.exponentialRampToValueAtTime(2050, now + 0.6);

		// Growing tremolo
		const lfo = ctx.createOscillator();
		const lfoG = ctx.createGain();
		lfo.type = 'sine';
		lfo.frequency.setValueAtTime(2, now);
		lfo.frequency.linearRampToValueAtTime(12, now + 0.6);
		lfoG.gain.value = 0.1;
		lfo.connect(lfoG);
		lfoG.connect(gain.gain);

		gain.gain.setValueAtTime(0.04, now);
		gain.gain.linearRampToValueAtTime(0.18, now + 0.5);
		gain.gain.linearRampToValueAtTime(0, now + 0.7);
		s1.connect(gain);
		s2.connect(gain);
		gain.connect(this.getMaster());
		gain.connect(this.getReverb());
		s1.start(now); s1.stop(now + 0.7);
		s2.start(now); s2.stop(now + 0.7);
		lfo.start(now); lfo.stop(now + 0.7);
	}

	private soundSpellImpact(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Energy burst
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(120, now);
		osc.frequency.linearRampToValueAtTime(40, now + 0.3);
		gain.gain.setValueAtTime(0.35, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
		osc.connect(gain);
		gain.connect(this.getMaster());
		osc.start(now);
		osc.stop(now + 0.35);

		this.playFilteredNoiseBurst(now, 0.15, 800, 'lowpass', 0.3);
		this.playFilteredNoiseBurst(now, 0.08, 5000, 'highpass', 0.12);
	}

	private soundFireImpact(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Fire roar
		this.playSweep(200, 60, 0.35, 'sawtooth', 0.01, 0.33, 0.28);

		// Crackle
		const crackle = ctx.createBufferSource();
		crackle.buffer = this.createNoise(0.3);
		const cf = ctx.createBiquadFilter();
		cf.type = 'bandpass';
		cf.frequency.setValueAtTime(3000, now);
		cf.frequency.linearRampToValueAtTime(800, now + 0.3);
		cf.Q.value = 3;
		const cg = ctx.createGain();
		cg.gain.setValueAtTime(0.22, now);
		cg.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
		crackle.connect(cf);
		cf.connect(cg);
		cg.connect(this.getMaster());
		crackle.start(now);
		crackle.stop(now + 0.3);

		// Sub thud
		const thud = ctx.createOscillator();
		const thudGain = ctx.createGain();
		thud.type = 'sine';
		thud.frequency.value = 50;
		thudGain.gain.setValueAtTime(0.2, now);
		thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
		thud.connect(thudGain);
		thudGain.connect(this.getMaster());
		thud.start(now);
		thud.stop(now + 0.2);
	}

	private soundCoin(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Heavy gold coin clink
		const t1 = ctx.createOscillator();
		const g1 = ctx.createGain();
		t1.type = 'triangle';
		t1.frequency.value = 800;
		g1.gain.setValueAtTime(0.25, now);
		g1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
		t1.connect(g1);
		g1.connect(this.getMaster());
		t1.start(now);
		t1.stop(now + 0.1);

		const t2 = ctx.createOscillator();
		const g2 = ctx.createGain();
		t2.type = 'triangle';
		t2.frequency.value = 1200;
		g2.gain.setValueAtTime(0.2, now + 0.06);
		g2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
		t2.connect(g2);
		g2.connect(this.getMaster());
		t2.start(now + 0.06);
		t2.stop(now + 0.18);

		// Brief low ring tail
		this.playScheduledTone(now + 0.06, 1000, 0.12, 'sine', 0.06, this.getReverb());
	}

	private soundFreeze(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Ice cracks — deliberate mid-frequency tones (not random high pings)
		for (let i = 0; i < 5; i++) {
			const t = now + i * 0.06;
			const freq = 800 + Math.random() * 1200;
			this.playScheduledTone(t, freq, 0.05, 'sine', 0.1);
		}

		// Crystalline noise (lower)
		this.playFilteredNoiseBurst(now, 0.3, 3000, 'highpass', 0.1);

		// Cold air
		this.playFilteredNoiseBurst(now + 0.1, 0.3, 1500, 'bandpass', 0.06, this.getReverb(), 3);
	}

	private soundLegendary(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Deep norse horn fanfare
		const horn = ctx.createOscillator();
		const hornGain = ctx.createGain();
		const hornFilter = ctx.createBiquadFilter();
		horn.type = 'sawtooth';
		horn.frequency.setValueAtTime(55, now);
		horn.frequency.linearRampToValueAtTime(82, now + 0.5);
		horn.frequency.linearRampToValueAtTime(110, now + 1.0);
		hornFilter.type = 'lowpass';
		hornFilter.frequency.setValueAtTime(300, now);
		hornFilter.frequency.linearRampToValueAtTime(600, now + 0.6);
		hornGain.gain.setValueAtTime(0, now);
		hornGain.gain.linearRampToValueAtTime(0.22, now + 0.25);
		hornGain.gain.linearRampToValueAtTime(0.14, now + 1.0);
		hornGain.gain.linearRampToValueAtTime(0, now + 1.6);
		horn.connect(hornFilter);
		hornFilter.connect(hornGain);
		hornGain.connect(this.getMaster());
		hornGain.connect(this.getReverb());
		horn.start(now);
		horn.stop(now + 1.6);

		// Sub-bass
		const sub = ctx.createOscillator();
		const subGain = ctx.createGain();
		sub.type = 'sine';
		sub.frequency.value = 30;
		subGain.gain.setValueAtTime(0, now);
		subGain.gain.linearRampToValueAtTime(0.18, now + 0.2);
		subGain.gain.linearRampToValueAtTime(0, now + 1.2);
		sub.connect(subGain);
		subGain.connect(this.getMaster());
		sub.start(now);
		sub.stop(now + 1.2);

		// Deep drum
		this.playFilteredNoiseBurst(now, 0.12, 100, 'lowpass', 0.35);
	}

	private soundLegendaryEntrance(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Deep drum impact
		this.playFilteredNoiseBurst(now, 0.18, 100, 'lowpass', 0.45);

		// Main deep horn
		const horn1 = ctx.createOscillator();
		const horn1Gain = ctx.createGain();
		const horn1Filter = ctx.createBiquadFilter();
		horn1.type = 'sawtooth';
		horn1.frequency.setValueAtTime(55, now + 0.1);
		horn1.frequency.linearRampToValueAtTime(82, now + 0.8);
		horn1.frequency.linearRampToValueAtTime(110, now + 1.4);
		horn1Filter.type = 'lowpass';
		horn1Filter.frequency.setValueAtTime(300, now + 0.1);
		horn1Filter.frequency.linearRampToValueAtTime(800, now + 1.0);
		horn1Gain.gain.setValueAtTime(0, now + 0.1);
		horn1Gain.gain.linearRampToValueAtTime(0.25, now + 0.5);
		horn1Gain.gain.linearRampToValueAtTime(0.18, now + 1.6);
		horn1Gain.gain.linearRampToValueAtTime(0, now + 2.5);
		horn1.connect(horn1Filter);
		horn1Filter.connect(horn1Gain);
		horn1Gain.connect(this.getMaster());
		horn1Gain.connect(this.getReverb());
		horn1.start(now + 0.1);
		horn1.stop(now + 2.5);

		// Harmony fifth (low)
		const chord = ctx.createOscillator();
		const chordGain = ctx.createGain();
		const chordFilter = ctx.createBiquadFilter();
		chord.type = 'sawtooth';
		chord.frequency.value = 165;
		chordFilter.type = 'lowpass';
		chordFilter.frequency.value = 600;
		chordGain.gain.setValueAtTime(0, now + 0.7);
		chordGain.gain.linearRampToValueAtTime(0.1, now + 1.0);
		chordGain.gain.linearRampToValueAtTime(0, now + 2.5);
		chord.connect(chordFilter);
		chordFilter.connect(chordGain);
		chordGain.connect(this.getMaster());
		chordGain.connect(this.getReverb());
		chord.start(now + 0.7);
		chord.stop(now + 2.5);

		// Sub-bass
		const sub = ctx.createOscillator();
		const subGain = ctx.createGain();
		sub.type = 'sine';
		sub.frequency.value = 30;
		subGain.gain.setValueAtTime(0, now);
		subGain.gain.linearRampToValueAtTime(0.22, now + 0.3);
		subGain.gain.linearRampToValueAtTime(0.1, now + 2.0);
		subGain.gain.linearRampToValueAtTime(0, now + 2.5);
		sub.connect(subGain);
		subGain.connect(this.getMaster());
		sub.start(now);
		sub.stop(now + 2.5);

		// Drum sequence
		this.playFilteredNoiseBurst(now + 1.0, 0.12, 100, 'lowpass', 0.3);
		this.playFilteredNoiseBurst(now + 1.6, 0.1, 100, 'lowpass', 0.25);
	}

	private soundBattlecry(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Deep war shout — ascending sawtooth
		const shout = ctx.createOscillator();
		const shoutGain = ctx.createGain();
		const shoutFilter = ctx.createBiquadFilter();
		shout.type = 'sawtooth';
		shout.frequency.setValueAtTime(55, now);
		shout.frequency.linearRampToValueAtTime(165, now + 0.25);
		shout.frequency.linearRampToValueAtTime(120, now + 0.5);
		shoutFilter.type = 'lowpass';
		shoutFilter.frequency.setValueAtTime(300, now);
		shoutFilter.frequency.linearRampToValueAtTime(800, now + 0.2);
		shoutFilter.frequency.linearRampToValueAtTime(500, now + 0.5);
		shoutGain.gain.setValueAtTime(0, now);
		shoutGain.gain.linearRampToValueAtTime(0.28, now + 0.08);
		shoutGain.gain.linearRampToValueAtTime(0.18, now + 0.3);
		shoutGain.gain.linearRampToValueAtTime(0, now + 0.5);
		shout.connect(shoutFilter);
		shoutFilter.connect(shoutGain);
		shoutGain.connect(this.getMaster());
		shoutGain.connect(this.getReverb());
		shout.start(now);
		shout.stop(now + 0.5);

		// Deep crowd roar
		this.playFilteredNoiseBurst(now, 0.4, 250, 'lowpass', 0.18);
	}

	private soundDeathrattle(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Death bell — low sine with long decay
		const bell = ctx.createOscillator();
		const bellGain = ctx.createGain();
		bell.type = 'sine';
		bell.frequency.value = 80;
		bellGain.gain.setValueAtTime(0.3, now);
		bellGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
		bell.connect(bellGain);
		bellGain.connect(this.getMaster());
		bellGain.connect(this.getReverb());
		bell.start(now);
		bell.stop(now + 1.0);

		// Dissonant harmonic
		const dis = ctx.createOscillator();
		const disGain = ctx.createGain();
		dis.type = 'sine';
		dis.frequency.value = 113; // minor second above fundamental
		disGain.gain.setValueAtTime(0.1, now);
		disGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
		dis.connect(disGain);
		disGain.connect(this.getMaster());
		disGain.connect(this.getReverb());
		dis.start(now);
		dis.stop(now + 0.6);

		// Low noise rumble
		this.playFilteredNoiseBurst(now + 0.05, 0.5, 200, 'lowpass', 0.15, this.getReverb());
	}

	private soundDiscover(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// 3 ascending low rune whispers
		const freqs = [400, 500, 600];
		freqs.forEach((freq, i) => {
			const t = now + i * 0.14;
			const s1 = ctx.createOscillator();
			const s2 = ctx.createOscillator();
			const gain = ctx.createGain();
			s1.type = 'sine';
			s1.frequency.value = freq;
			s2.type = 'sine';
			s2.frequency.value = freq + 3;
			gain.gain.setValueAtTime(0, t);
			gain.gain.linearRampToValueAtTime(0.12, t + 0.03);
			gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
			s1.connect(gain);
			s2.connect(gain);
			gain.connect(this.getMaster());
			gain.connect(this.getReverb());
			s1.start(t); s1.stop(t + 0.2);
			s2.start(t); s2.stop(t + 0.2);
		});
	}

	private soundSecretTrigger(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Low noise sweep (rune reveal)
		const noise = ctx.createBufferSource();
		noise.buffer = this.createNoise(0.35);
		const nf = ctx.createBiquadFilter();
		nf.type = 'bandpass';
		nf.frequency.setValueAtTime(300, now);
		nf.frequency.linearRampToValueAtTime(2000, now + 0.3);
		nf.Q.value = 2;
		const ng = ctx.createGain();
		ng.gain.setValueAtTime(0, now);
		ng.gain.linearRampToValueAtTime(0.2, now + 0.15);
		ng.gain.linearRampToValueAtTime(0, now + 0.35);
		noise.connect(nf);
		nf.connect(ng);
		ng.connect(this.getMaster());
		noise.start(now);
		noise.stop(now + 0.35);

		// Deep chord reveal
		const chord = [400, 600, 800];
		chord.forEach(freq => {
			this.playScheduledTone(now + 0.15, freq, 0.35, 'sine', 0.1, this.getReverb());
		});
	}

	private soundGameStart(): void {
		this.soundNorseHorn();
	}

	private soundVictory(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Triumphant ascending deep horn fifths
		const notes = [
			{ freq: 55, time: 0, dur: 0.5 },
			{ freq: 82, time: 0.4, dur: 0.5 },
			{ freq: 110, time: 0.8, dur: 0.7 },
			{ freq: 165, time: 1.3, dur: 1.0 },
		];

		notes.forEach(n => {
			const t = now + n.time;
			const horn = ctx.createOscillator();
			const hornGain = ctx.createGain();
			const hornFilter = ctx.createBiquadFilter();
			horn.type = 'sawtooth';
			horn.frequency.value = n.freq;
			hornFilter.type = 'lowpass';
			hornFilter.frequency.value = n.freq * 3;
			hornGain.gain.setValueAtTime(0, t);
			hornGain.gain.linearRampToValueAtTime(0.2, t + 0.1);
			hornGain.gain.linearRampToValueAtTime(0.12, t + n.dur * 0.7);
			hornGain.gain.linearRampToValueAtTime(0, t + n.dur);
			horn.connect(hornFilter);
			hornFilter.connect(hornGain);
			hornGain.connect(this.getMaster());
			hornGain.connect(this.getReverb());
			horn.start(t);
			horn.stop(t + n.dur);
		});

		// Deep drum hits
		this.playFilteredNoiseBurst(now, 0.12, 100, 'lowpass', 0.4);
		this.playFilteredNoiseBurst(now + 0.4, 0.1, 100, 'lowpass', 0.3);
		this.playFilteredNoiseBurst(now + 0.8, 0.12, 100, 'lowpass', 0.35);
		this.playFilteredNoiseBurst(now + 1.3, 0.15, 100, 'lowpass', 0.4);

		// Sub-bass swell
		const sub = ctx.createOscillator();
		const subGain = ctx.createGain();
		sub.type = 'sine';
		sub.frequency.value = 30;
		subGain.gain.setValueAtTime(0, now);
		subGain.gain.linearRampToValueAtTime(0.2, now + 0.5);
		subGain.gain.linearRampToValueAtTime(0.15, now + 1.8);
		subGain.gain.linearRampToValueAtTime(0, now + 2.3);
		sub.connect(subGain);
		subGain.connect(this.getMaster());
		sub.start(now);
		sub.stop(now + 2.3);
	}

	private soundDefeat(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Mournful descending deep horn (minor)
		const notes = [110, 98, 82]; // A-G-E minor descent (octave lower)
		notes.forEach((freq, i) => {
			const t = now + i * 0.4;
			const horn = ctx.createOscillator();
			const hornGain = ctx.createGain();
			const hornFilter = ctx.createBiquadFilter();
			horn.type = 'sawtooth';
			horn.frequency.value = freq;
			hornFilter.type = 'lowpass';
			hornFilter.frequency.value = 400;
			hornGain.gain.setValueAtTime(0, t);
			hornGain.gain.linearRampToValueAtTime(0.18, t + 0.06);
			hornGain.gain.linearRampToValueAtTime(0.1, t + 0.35);
			hornGain.gain.linearRampToValueAtTime(0, t + 0.5);
			horn.connect(hornFilter);
			hornFilter.connect(hornGain);
			hornGain.connect(this.getMaster());
			hornGain.connect(this.getReverb());
			horn.start(t);
			horn.stop(t + 0.5);
		});

		// Deep rumble
		const rumble = ctx.createOscillator();
		const rumbleGain = ctx.createGain();
		rumble.type = 'sine';
		rumble.frequency.value = 25;
		rumbleGain.gain.setValueAtTime(0.2, now);
		rumbleGain.gain.linearRampToValueAtTime(0, now + 1.5);
		rumble.connect(rumbleGain);
		rumbleGain.connect(this.getMaster());
		rumble.start(now);
		rumble.stop(now + 1.5);

		// Fading low noise
		this.playFilteredNoiseBurst(now, 1.0, 200, 'lowpass', 0.08, this.getReverb());
	}

	private soundHeroPower(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Deep rune activation chord
		const root = ctx.createOscillator();
		const fifth = ctx.createOscillator();
		const chordGain = ctx.createGain();
		root.type = 'sine';
		root.frequency.setValueAtTime(110, now);
		root.frequency.linearRampToValueAtTime(165, now + 0.3);
		fifth.type = 'sine';
		fifth.frequency.setValueAtTime(165, now);
		fifth.frequency.linearRampToValueAtTime(220, now + 0.3);
		chordGain.gain.setValueAtTime(0, now);
		chordGain.gain.linearRampToValueAtTime(0.15, now + 0.1);
		chordGain.gain.linearRampToValueAtTime(0.1, now + 0.3);
		chordGain.gain.linearRampToValueAtTime(0, now + 0.5);
		root.connect(chordGain);
		fifth.connect(chordGain);
		chordGain.connect(this.getMaster());
		chordGain.connect(this.getReverb());
		root.start(now); root.stop(now + 0.5);
		fifth.start(now); fifth.stop(now + 0.5);

		// Deep subtle horn
		const horn = ctx.createOscillator();
		const hornGain = ctx.createGain();
		const hornFilter = ctx.createBiquadFilter();
		horn.type = 'sawtooth';
		horn.frequency.value = 82;
		hornFilter.type = 'lowpass';
		hornFilter.frequency.value = 350;
		hornGain.gain.setValueAtTime(0, now + 0.1);
		hornGain.gain.linearRampToValueAtTime(0.08, now + 0.2);
		hornGain.gain.linearRampToValueAtTime(0, now + 0.5);
		horn.connect(hornFilter);
		hornFilter.connect(hornGain);
		hornGain.connect(this.getMaster());
		horn.start(now + 0.1);
		horn.stop(now + 0.5);
	}

	private soundAttackPrepare(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Sword unsheathing — rising highpass noise
		const unsheathe = ctx.createBufferSource();
		unsheathe.buffer = this.createNoise(0.35);
		const uf = ctx.createBiquadFilter();
		uf.type = 'highpass';
		uf.frequency.setValueAtTime(2000, now);
		uf.frequency.linearRampToValueAtTime(6000, now + 0.3);
		const ug = ctx.createGain();
		ug.gain.setValueAtTime(0.05, now);
		ug.gain.linearRampToValueAtTime(0.2, now + 0.2);
		ug.gain.linearRampToValueAtTime(0, now + 0.35);
		unsheathe.connect(uf);
		uf.connect(ug);
		ug.connect(this.getMaster());
		unsheathe.start(now);
		unsheathe.stop(now + 0.35);

		// Tension drone
		const drone = ctx.createOscillator();
		const droneGain = ctx.createGain();
		drone.type = 'sine';
		drone.frequency.setValueAtTime(80, now);
		drone.frequency.linearRampToValueAtTime(120, now + 0.4);
		droneGain.gain.setValueAtTime(0, now);
		droneGain.gain.linearRampToValueAtTime(0.1, now + 0.3);
		droneGain.gain.linearRampToValueAtTime(0, now + 0.5);
		drone.connect(droneGain);
		droneGain.connect(this.getMaster());
		drone.start(now);
		drone.stop(now + 0.5);
	}

	private soundTurnStart(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Single deep horn note
		const horn = ctx.createOscillator();
		const hornGain = ctx.createGain();
		const hornFilter = ctx.createBiquadFilter();
		horn.type = 'sawtooth';
		horn.frequency.value = 110;
		hornFilter.type = 'lowpass';
		hornFilter.frequency.value = 500;
		hornGain.gain.setValueAtTime(0, now);
		hornGain.gain.linearRampToValueAtTime(0.15, now + 0.06);
		hornGain.gain.linearRampToValueAtTime(0.08, now + 0.35);
		hornGain.gain.linearRampToValueAtTime(0, now + 0.5);
		horn.connect(hornFilter);
		hornFilter.connect(hornGain);
		hornGain.connect(this.getMaster());
		hornGain.connect(this.getReverb());
		horn.start(now);
		horn.stop(now + 0.5);

		// Deep drum hit
		this.playFilteredNoiseBurst(now, 0.1, 100, 'lowpass', 0.25);
	}

	private soundTurnEnd(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Descending deep horn note
		const horn = ctx.createOscillator();
		const hornGain = ctx.createGain();
		const hornFilter = ctx.createBiquadFilter();
		horn.type = 'sawtooth';
		horn.frequency.setValueAtTime(110, now);
		horn.frequency.linearRampToValueAtTime(82, now + 0.3);
		hornFilter.type = 'lowpass';
		hornFilter.frequency.value = 400;
		hornGain.gain.setValueAtTime(0.12, now);
		hornGain.gain.linearRampToValueAtTime(0, now + 0.35);
		horn.connect(hornFilter);
		hornFilter.connect(hornGain);
		hornGain.connect(this.getMaster());
		horn.start(now);
		horn.stop(now + 0.35);
	}

	private soundCardHover(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Very quiet low rune whisper
		const s1 = ctx.createOscillator();
		const s2 = ctx.createOscillator();
		const gain = ctx.createGain();
		s1.type = 'sine';
		s1.frequency.value = 400;
		s2.type = 'sine';
		s2.frequency.value = 403;
		gain.gain.setValueAtTime(0.03, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
		s1.connect(gain);
		s2.connect(gain);
		gain.connect(this.getMaster());
		s1.start(now);
		s2.start(now);
		s1.stop(now + 0.05);
		s2.stop(now + 0.05);
	}

	private soundCardClick(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Stone tap
		this.playFilteredNoiseBurst(now, 0.04, 400, 'lowpass', 0.15);

		const tap = ctx.createOscillator();
		const tapGain = ctx.createGain();
		tap.type = 'sine';
		tap.frequency.value = 400;
		tapGain.gain.setValueAtTime(0.12, now);
		tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
		tap.connect(tapGain);
		tapGain.connect(this.getMaster());
		tap.start(now);
		tap.stop(now + 0.06);
	}

	private soundButtonClick(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Wood knock
		this.playFilteredNoiseBurst(now, 0.04, 800, 'bandpass', 0.12, undefined, 3);

		const knock = ctx.createOscillator();
		const knockGain = ctx.createGain();
		knock.type = 'sine';
		knock.frequency.setValueAtTime(300, now);
		knock.frequency.exponentialRampToValueAtTime(150, now + 0.06);
		knockGain.gain.setValueAtTime(0.15, now);
		knockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
		knock.connect(knockGain);
		knockGain.connect(this.getMaster());
		knock.start(now);
		knock.stop(now + 0.08);
	}

	private soundError(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Deep dissonant buzz
		const o1 = ctx.createOscillator();
		const o2 = ctx.createOscillator();
		const gain = ctx.createGain();
		o1.type = 'sawtooth';
		o1.frequency.value = 150;
		o2.type = 'sawtooth';
		o2.frequency.value = 158;
		gain.gain.setValueAtTime(0.15, now);
		gain.gain.linearRampToValueAtTime(0, now + 0.3);

		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.value = 600;
		o1.connect(filter);
		o2.connect(filter);
		filter.connect(gain);
		gain.connect(this.getMaster());
		o1.start(now);
		o2.start(now);
		o1.stop(now + 0.3);
		o2.stop(now + 0.3);
	}

	private soundManaFill(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Deep rune chime
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(600, now);
		osc.frequency.linearRampToValueAtTime(800, now + 0.2);
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
		osc.connect(gain);
		gain.connect(this.getMaster());
		gain.connect(this.getReverb());
		osc.start(now);
		osc.stop(now + 0.35);

		// Low harmonic
		this.playScheduledTone(now + 0.02, 1200, 0.25, 'sine', 0.04, this.getReverb());
	}

	private soundManaSpend(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Soft descending spend
		this.playSweep(600, 350, 0.15, 'sine', 0.01, 0.13, 0.1);
		this.playFilteredNoiseBurst(now, 0.06, 1500, 'highpass', 0.04);
	}

	private soundFatigue(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Deep warning drone
		const drone = ctx.createOscillator();
		const droneGain = ctx.createGain();
		drone.type = 'sine';
		drone.frequency.value = 40;
		droneGain.gain.setValueAtTime(0.22, now);
		droneGain.gain.linearRampToValueAtTime(0, now + 0.7);
		drone.connect(droneGain);
		droneGain.connect(this.getMaster());
		drone.start(now);
		drone.stop(now + 0.7);

		// Deep dissonant sawtooth
		const warn = ctx.createOscillator();
		const warnGain = ctx.createGain();
		const warnFilter = ctx.createBiquadFilter();
		warn.type = 'sawtooth';
		warn.frequency.value = 220;
		warnFilter.type = 'lowpass';
		warnFilter.frequency.value = 500;
		warnGain.gain.setValueAtTime(0, now + 0.1);
		warnGain.gain.linearRampToValueAtTime(0.12, now + 0.15);
		warnGain.gain.linearRampToValueAtTime(0, now + 0.4);
		warn.connect(warnFilter);
		warnFilter.connect(warnGain);
		warnGain.connect(this.getMaster());
		warn.start(now + 0.1);
		warn.stop(now + 0.4);
	}

	private soundEmote(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;

		// Quick deep horn pip
		const horn = ctx.createOscillator();
		const hornGain = ctx.createGain();
		const hornFilter = ctx.createBiquadFilter();
		horn.type = 'sawtooth';
		horn.frequency.value = 165;
		hornFilter.type = 'lowpass';
		hornFilter.frequency.value = 500;
		hornGain.gain.setValueAtTime(0.12, now);
		hornGain.gain.linearRampToValueAtTime(0, now + 0.12);
		horn.connect(hornFilter);
		hornFilter.connect(hornGain);
		hornGain.connect(this.getMaster());
		horn.start(now);
		horn.stop(now + 0.12);
	}

	playPetSound(family: string): void {
		if (!this.enabled) return;
		const key = family.toLowerCase().replace(/[^a-z]/g, '');
		const handler = this.petSoundHandlers[key];
		if (handler) {
			try { handler(); } catch { /* ignore audio errors */ }
		} else {
			try { this.petGenericBeast(); } catch { /* ignore */ }
		}
	}

	private petSoundHandlers: Record<string, () => void> = {
		wolves: () => this.petWolf(),
		serpents: () => this.petSerpent(),
		ravens: () => this.petRaven(),
		stags: () => this.petStag(),
		bears: () => this.petBear(),
		drakes: () => this.petDrake(),
		ents: () => this.petEnt(),
		valkyries: () => this.petValkyrie(),
		draugr: () => this.petDraugr(),
		giants: () => this.petGiant(),
		muspelheim: () => this.petMuspelheim(),
		tideborn: () => this.petTideborn(),
		rootkin: () => this.petRootkin(),
		stormkin: () => this.petStormkin(),
		hellhounds: () => this.petHellhound(),
		bifrost: () => this.petBifrost(),
		freyjascompanions: () => this.petFreyjaCat(),
		celestialhorses: () => this.petHorse(),
		yggdrasilwatchers: () => this.petYggdrasilWatcher(),
		norseseaspiritss: () => this.petSeaSpirit(),
		norseseaspirites: () => this.petSeaSpirit(),
		norsesea: () => this.petSeaSpirit(),
		norseseaspirits: () => this.petSeaSpirit(),
		aesirsbeasts: () => this.petAesirBeast(),
		primordialbeasts: () => this.petPrimordialBeast(),
		doomheralds: () => this.petDoomHerald(),
		warsteeds: () => this.petWarSteed(),
		thorsgoats: () => this.petGoat(),
		dwarvenforgemasters: () => this.petDwarvenForge(),
		norns: () => this.petNorn(),
		trolls: () => this.petTroll(),
		ljosalfar: () => this.petLjosalfar(),
		svartalfar: () => this.petSvartalfar(),
		disir: () => this.petDisir(),
		fylgja: () => this.petFylgja(),
		huldrefolk: () => this.petHuldrefolk(),
		einherjarwarriors: () => this.petEinherjarWarrior(),
		ratatoskrmessengers: () => this.petRatatoskr(),
		naglfar: () => this.petNaglfar(),
		muspelphoenixes: () => this.petPhoenix(),
		ivaldiconstructs: () => this.petIvaldiConstruct(),
	};

	private petWolf(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Howl: descending sawtooth with vibrato
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		const lfo = ctx.createOscillator();
		const lfoGain = ctx.createGain();
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(400, now);
		osc.frequency.linearRampToValueAtTime(200, now + 0.5);
		lfo.frequency.value = 6;
		lfoGain.gain.value = 15;
		lfo.connect(lfoGain);
		lfoGain.connect(osc.frequency);
		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.value = 800;
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
		gain.gain.setValueAtTime(0.2, now + 0.3);
		gain.gain.linearRampToValueAtTime(0, now + 0.6);
		osc.connect(filter);
		filter.connect(gain);
		gain.connect(this.getMaster());
		lfo.start(now);
		osc.start(now);
		osc.stop(now + 0.6);
		lfo.stop(now + 0.6);
	}

	private petSerpent(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Hiss: highpass filtered noise
		const noise = ctx.createBufferSource();
		noise.buffer = this.createNoise(0.5);
		const filter = ctx.createBiquadFilter();
		filter.type = 'highpass';
		filter.frequency.setValueAtTime(4000, now);
		filter.frequency.linearRampToValueAtTime(8000, now + 0.2);
		filter.frequency.linearRampToValueAtTime(5000, now + 0.5);
		filter.Q.value = 3;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
		gain.gain.setValueAtTime(0.15, now + 0.25);
		gain.gain.linearRampToValueAtTime(0, now + 0.5);
		noise.connect(filter);
		filter.connect(gain);
		gain.connect(this.getMaster());
		noise.start(now);
		noise.stop(now + 0.5);
	}

	private petRaven(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Caw: two sharp squawks
		for (let i = 0; i < 2; i++) {
			const t = now + i * 0.15;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = 'square';
			osc.frequency.setValueAtTime(900 + i * 100, t);
			osc.frequency.linearRampToValueAtTime(600, t + 0.08);
			gain.gain.setValueAtTime(0.15, t);
			gain.gain.linearRampToValueAtTime(0, t + 0.1);
			const filter = ctx.createBiquadFilter();
			filter.type = 'bandpass';
			filter.frequency.value = 1200;
			filter.Q.value = 2;
			osc.connect(filter);
			filter.connect(gain);
			gain.connect(this.getMaster());
			osc.start(t);
			osc.stop(t + 0.1);
		}
		this.playFilteredNoiseBurst(now, 0.12, 3000, 'bandpass', 0.08);
	}

	private petStag(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Bellow: low sweep + antler clash
		this.playSweep(200, 120, 0.4, 'sawtooth', 0.03, 0.35, 0.15);
		this.playFilteredNoiseBurst(now + 0.1, 0.08, 4000, 'highpass', 0.12);
		const thud = ctx.createOscillator();
		const thudGain = ctx.createGain();
		thud.type = 'sine';
		thud.frequency.value = 60;
		thudGain.gain.setValueAtTime(0.2, now + 0.15);
		thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
		thud.connect(thudGain);
		thudGain.connect(this.getMaster());
		thud.start(now + 0.15);
		thud.stop(now + 0.35);
	}

	private petBear(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Deep roar: low sawtooth rumble with growl modulation
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		const lfo = ctx.createOscillator();
		const lfoGain = ctx.createGain();
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(90, now);
		osc.frequency.linearRampToValueAtTime(120, now + 0.15);
		osc.frequency.linearRampToValueAtTime(80, now + 0.5);
		lfo.frequency.value = 20;
		lfoGain.gain.value = 25;
		lfo.connect(lfoGain);
		lfoGain.connect(osc.frequency);
		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.value = 400;
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.25, now + 0.08);
		gain.gain.setValueAtTime(0.22, now + 0.3);
		gain.gain.linearRampToValueAtTime(0, now + 0.55);
		osc.connect(filter);
		filter.connect(gain);
		gain.connect(this.getMaster());
		lfo.start(now);
		osc.start(now);
		osc.stop(now + 0.55);
		lfo.stop(now + 0.55);
	}

	private petDrake(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Dragon roar: rising sweep + fire crackle
		this.playSweep(150, 500, 0.4, 'sawtooth', 0.05, 0.35, 0.18);
		this.playFilteredNoiseBurst(now + 0.15, 0.3, 2000, 'bandpass', 0.12, undefined, 3);
		// Fire crackle
		for (let i = 0; i < 5; i++) {
			this.playFilteredNoiseBurst(now + 0.2 + i * 0.05, 0.04, 5000 + Math.random() * 3000, 'highpass', 0.06);
		}
	}

	private petEnt(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Creaking wood: slow filtered noise + low groan
		const noise = ctx.createBufferSource();
		noise.buffer = this.createNoise(0.6);
		const filter = ctx.createBiquadFilter();
		filter.type = 'bandpass';
		filter.frequency.setValueAtTime(300, now);
		filter.frequency.linearRampToValueAtTime(600, now + 0.3);
		filter.frequency.linearRampToValueAtTime(200, now + 0.6);
		filter.Q.value = 8;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
		gain.gain.linearRampToValueAtTime(0, now + 0.6);
		noise.connect(filter);
		filter.connect(gain);
		gain.connect(this.getMaster());
		noise.start(now);
		noise.stop(now + 0.6);
		this.playTone(70, 0.5, 'sine', 0.1, 0.4, 0.1);
	}

	private petValkyrie(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// War cry: choir-like harmonics
		const freqs = [440, 554, 659];
		freqs.forEach(f => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(f, now);
			osc.frequency.linearRampToValueAtTime(f * 1.05, now + 0.3);
			gain.gain.setValueAtTime(0, now);
			gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
			gain.gain.setValueAtTime(0.08, now + 0.25);
			gain.gain.linearRampToValueAtTime(0, now + 0.4);
			osc.connect(gain);
			gain.connect(this.getReverb());
			osc.start(now);
			osc.stop(now + 0.4);
		});
		this.playFilteredNoiseBurst(now, 0.15, 6000, 'highpass', 0.06);
	}

	private petDraugr(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Undead moan: low distorted sweep
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		const distortion = ctx.createWaveShaper();
		const curve = new Float32Array(256);
		for (let i = 0; i < 256; i++) {
			const x = (i / 128) - 1;
			curve[i] = (Math.PI + 200) * x / (Math.PI + 200 * Math.abs(x));
		}
		distortion.curve = curve;
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(80, now);
		osc.frequency.linearRampToValueAtTime(120, now + 0.2);
		osc.frequency.linearRampToValueAtTime(60, now + 0.5);
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
		gain.gain.linearRampToValueAtTime(0, now + 0.5);
		osc.connect(distortion);
		distortion.connect(gain);
		gain.connect(this.getReverb());
		osc.start(now);
		osc.stop(now + 0.5);
	}

	private petGiant(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Ground stomp: deep thud + rumble
		const thud = ctx.createOscillator();
		const thudGain = ctx.createGain();
		thud.type = 'sine';
		thud.frequency.value = 40;
		thudGain.gain.setValueAtTime(0.3, now);
		thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
		thud.connect(thudGain);
		thudGain.connect(this.getMaster());
		thud.start(now);
		thud.stop(now + 0.4);
		this.playFilteredNoiseBurst(now, 0.25, 200, 'lowpass', 0.15);
		this.playFilteredNoiseBurst(now + 0.05, 0.15, 3000, 'bandpass', 0.08);
	}

	private petMuspelheim(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Fire crackle: rapid noise bursts + low roar
		for (let i = 0; i < 8; i++) {
			const t = now + i * 0.04;
			this.playFilteredNoiseBurst(t, 0.03, 4000 + Math.random() * 4000, 'highpass', 0.06 + Math.random() * 0.04);
		}
		this.playSweep(100, 200, 0.3, 'sawtooth', 0.02, 0.25, 0.1);
	}

	private petTideborn(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Water splash: filtered noise with sweep
		const noise = ctx.createBufferSource();
		noise.buffer = this.createNoise(0.4);
		const filter = ctx.createBiquadFilter();
		filter.type = 'bandpass';
		filter.frequency.setValueAtTime(2000, now);
		filter.frequency.linearRampToValueAtTime(500, now + 0.4);
		filter.Q.value = 1;
		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0.2, now);
		gain.gain.linearRampToValueAtTime(0, now + 0.4);
		noise.connect(filter);
		filter.connect(gain);
		gain.connect(this.getReverb());
		noise.start(now);
		noise.stop(now + 0.4);
		this.playTone(200, 0.2, 'sine', 0.01, 0.18, 0.06);
	}

	private petRootkin(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Earth rumble: very low sine + crackle
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(35, now);
		osc.frequency.linearRampToValueAtTime(50, now + 0.2);
		osc.frequency.linearRampToValueAtTime(30, now + 0.5);
		gain.gain.setValueAtTime(0.2, now);
		gain.gain.linearRampToValueAtTime(0, now + 0.5);
		osc.connect(gain);
		gain.connect(this.getMaster());
		osc.start(now);
		osc.stop(now + 0.5);
		for (let i = 0; i < 4; i++) {
			this.playFilteredNoiseBurst(now + 0.1 + i * 0.08, 0.03, 2000, 'bandpass', 0.04);
		}
	}

	private petStormkin(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Thunder crack: sharp noise burst + low rumble
		this.playFilteredNoiseBurst(now, 0.08, 6000, 'highpass', 0.25);
		const rumble = ctx.createOscillator();
		const rumbleGain = ctx.createGain();
		rumble.type = 'sine';
		rumble.frequency.value = 50;
		rumbleGain.gain.setValueAtTime(0.2, now + 0.05);
		rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
		rumble.connect(rumbleGain);
		rumbleGain.connect(this.getMaster());
		rumble.start(now + 0.05);
		rumble.stop(now + 0.5);
		this.playFilteredNoiseBurst(now + 0.08, 0.3, 300, 'lowpass', 0.1);
	}

	private petHellhound(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Snarling bark: distorted wolf variant
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		const distortion = ctx.createWaveShaper();
		const curve = new Float32Array(256);
		for (let i = 0; i < 256; i++) {
			const x = (i / 128) - 1;
			curve[i] = Math.tanh(x * 5);
		}
		distortion.curve = curve;
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(350, now);
		osc.frequency.linearRampToValueAtTime(180, now + 0.15);
		osc.frequency.linearRampToValueAtTime(250, now + 0.25);
		osc.frequency.linearRampToValueAtTime(150, now + 0.35);
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
		gain.gain.linearRampToValueAtTime(0, now + 0.4);
		osc.connect(distortion);
		distortion.connect(gain);
		gain.connect(this.getMaster());
		osc.start(now);
		osc.stop(now + 0.4);
		this.playFilteredNoiseBurst(now, 0.15, 2000, 'bandpass', 0.08);
	}

	private petBifrost(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Crystal chime: high harmonics cascading
		const freqs = [1200, 1600, 2000, 2400];
		freqs.forEach((f, i) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = 'sine';
			osc.frequency.value = f;
			gain.gain.setValueAtTime(0, now + i * 0.06);
			gain.gain.linearRampToValueAtTime(0.08, now + i * 0.06 + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.35);
			osc.connect(gain);
			gain.connect(this.getReverb());
			osc.start(now + i * 0.06);
			osc.stop(now + i * 0.06 + 0.35);
		});
	}

	private petFreyjaCat(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Cat yowl: filtered oscillator sweep
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'triangle';
		osc.frequency.setValueAtTime(500, now);
		osc.frequency.linearRampToValueAtTime(900, now + 0.15);
		osc.frequency.linearRampToValueAtTime(600, now + 0.35);
		const filter = ctx.createBiquadFilter();
		filter.type = 'bandpass';
		filter.frequency.value = 800;
		filter.Q.value = 5;
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.15, now + 0.03);
		gain.gain.setValueAtTime(0.12, now + 0.2);
		gain.gain.linearRampToValueAtTime(0, now + 0.35);
		osc.connect(filter);
		filter.connect(gain);
		gain.connect(this.getMaster());
		osc.start(now);
		osc.stop(now + 0.35);
	}

	private petHorse(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Neigh: rising whinny + hoofbeats
		this.playSweep(300, 800, 0.25, 'triangle', 0.02, 0.2, 0.12);
		for (let i = 0; i < 3; i++) {
			const t = now + 0.3 + i * 0.1;
			const thud = ctx.createOscillator();
			const thudGain = ctx.createGain();
			thud.type = 'sine';
			thud.frequency.value = 80;
			thudGain.gain.setValueAtTime(0.12, t);
			thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
			thud.connect(thudGain);
			thudGain.connect(this.getMaster());
			thud.start(t);
			thud.stop(t + 0.06);
			this.playFilteredNoiseBurst(t, 0.03, 3000, 'highpass', 0.06);
		}
	}

	private petYggdrasilWatcher(): void {
		// Ancient whisper: reverbed noise + low drone
		this.playNoise(0.5, 1500, 'bandpass', 0.06, this.getReverb());
		this.playTone(100, 0.5, 'sine', 0.1, 0.4, 0.06, this.getReverb());
		this.playTone(150, 0.4, 'sine', 0.15, 0.25, 0.04, this.getReverb());
	}

	private petSeaSpirit(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Whale song: slow sine sweep
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(200, now);
		osc.frequency.linearRampToValueAtTime(400, now + 0.2);
		osc.frequency.linearRampToValueAtTime(250, now + 0.5);
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
		gain.gain.setValueAtTime(0.08, now + 0.3);
		gain.gain.linearRampToValueAtTime(0, now + 0.5);
		osc.connect(gain);
		gain.connect(this.getReverb());
		osc.start(now);
		osc.stop(now + 0.5);
	}

	private petAesirBeast(): void {
		// Divine roar: bright roar + shimmer
		this.playSweep(200, 400, 0.3, 'sawtooth', 0.03, 0.25, 0.15);
		this.playTone(800, 0.3, 'sine', 0.05, 0.25, 0.06, this.getReverb());
		this.playTone(1200, 0.25, 'sine', 0.08, 0.17, 0.04, this.getReverb());
	}

	private petPrimordialBeast(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Primeval roar: ultra-low + harmonics
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(50, now);
		osc.frequency.linearRampToValueAtTime(80, now + 0.2);
		osc.frequency.linearRampToValueAtTime(40, now + 0.6);
		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.value = 300;
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
		gain.gain.linearRampToValueAtTime(0, now + 0.6);
		osc.connect(filter);
		filter.connect(gain);
		gain.connect(this.getMaster());
		osc.start(now);
		osc.stop(now + 0.6);
		this.playTone(100, 0.4, 'sine', 0.1, 0.3, 0.1);
	}

	private petDoomHerald(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Ominous horn: brass-like sawtooth
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(110, now);
		osc.frequency.linearRampToValueAtTime(130, now + 0.15);
		osc.frequency.linearRampToValueAtTime(110, now + 0.4);
		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(300, now);
		filter.frequency.linearRampToValueAtTime(600, now + 0.15);
		filter.frequency.linearRampToValueAtTime(200, now + 0.4);
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
		gain.gain.setValueAtTime(0.15, now + 0.25);
		gain.gain.linearRampToValueAtTime(0, now + 0.45);
		osc.connect(filter);
		filter.connect(gain);
		gain.connect(this.getReverb());
		osc.start(now);
		osc.stop(now + 0.45);
	}

	private petWarSteed(): void {
		// Charge neigh + gallop
		this.playSweep(250, 700, 0.2, 'triangle', 0.02, 0.18, 0.12);
		const ctx = this.getContext();
		const now = ctx.currentTime;
		for (let i = 0; i < 4; i++) {
			const t = now + 0.25 + i * 0.08;
			this.playFilteredNoiseBurst(t, 0.03, 3000, 'highpass', 0.05);
			this.playScheduledTone(t, 70, 0.04, 'sine', 0.1);
		}
	}

	private petGoat(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Bleat: nasal vibrato + mini thunder
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		const lfo = ctx.createOscillator();
		const lfoGain = ctx.createGain();
		osc.type = 'square';
		osc.frequency.value = 600;
		lfo.frequency.value = 30;
		lfoGain.gain.value = 80;
		lfo.connect(lfoGain);
		lfoGain.connect(osc.frequency);
		const filter = ctx.createBiquadFilter();
		filter.type = 'bandpass';
		filter.frequency.value = 900;
		filter.Q.value = 3;
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
		gain.gain.linearRampToValueAtTime(0, now + 0.2);
		osc.connect(filter);
		filter.connect(gain);
		gain.connect(this.getMaster());
		lfo.start(now);
		osc.start(now);
		osc.stop(now + 0.2);
		lfo.stop(now + 0.2);
		// Mini thunder for Thor's goats
		this.playFilteredNoiseBurst(now + 0.15, 0.15, 200, 'lowpass', 0.08);
	}

	private petDwarvenForge(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Hammer strike: metallic clang
		const osc1 = ctx.createOscillator();
		const osc2 = ctx.createOscillator();
		const gain = ctx.createGain();
		osc1.type = 'square';
		osc1.frequency.value = 800;
		osc2.type = 'sine';
		osc2.frequency.value = 2400;
		gain.gain.setValueAtTime(0.2, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
		osc1.connect(gain);
		osc2.connect(gain);
		gain.connect(this.getMaster());
		osc1.start(now);
		osc2.start(now);
		osc1.stop(now + 0.3);
		osc2.stop(now + 0.3);
		this.playFilteredNoiseBurst(now, 0.05, 5000, 'highpass', 0.15);
	}

	private petNorn(): void {
		// Fate whisper: eerie harmonics
		const ctx = this.getContext();
		const now = ctx.currentTime;
		const freqs = [330, 440, 550];
		freqs.forEach((f, i) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = 'sine';
			osc.frequency.setValueAtTime(f, now);
			osc.frequency.linearRampToValueAtTime(f * 1.02, now + 0.5);
			gain.gain.setValueAtTime(0, now + i * 0.08);
			gain.gain.linearRampToValueAtTime(0.06, now + i * 0.08 + 0.1);
			gain.gain.linearRampToValueAtTime(0, now + 0.5);
			osc.connect(gain);
			gain.connect(this.getReverb());
			osc.start(now);
			osc.stop(now + 0.5);
		});
		this.playNoise(0.4, 3000, 'highpass', 0.03, this.getReverb());
	}

	private petTroll(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Grunt + smash
		const grunt = ctx.createOscillator();
		const gruntGain = ctx.createGain();
		grunt.type = 'sawtooth';
		grunt.frequency.setValueAtTime(100, now);
		grunt.frequency.linearRampToValueAtTime(70, now + 0.15);
		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.value = 300;
		gruntGain.gain.setValueAtTime(0.15, now);
		gruntGain.gain.linearRampToValueAtTime(0, now + 0.2);
		grunt.connect(filter);
		filter.connect(gruntGain);
		gruntGain.connect(this.getMaster());
		grunt.start(now);
		grunt.stop(now + 0.2);
		// Smash thud
		const thud = ctx.createOscillator();
		const thudGain = ctx.createGain();
		thud.type = 'sine';
		thud.frequency.value = 50;
		thudGain.gain.setValueAtTime(0.25, now + 0.15);
		thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
		thud.connect(thudGain);
		thudGain.connect(this.getMaster());
		thud.start(now + 0.15);
		thud.stop(now + 0.4);
	}

	private petLjosalfar(): void {
		// Light chime: bright bell-like
		const ctx = this.getContext();
		const now = ctx.currentTime;
		const freqs = [880, 1320, 1760];
		freqs.forEach((f, i) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = 'sine';
			osc.frequency.value = f;
			gain.gain.setValueAtTime(0, now + i * 0.04);
			gain.gain.linearRampToValueAtTime(0.08, now + i * 0.04 + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.4);
			osc.connect(gain);
			gain.connect(this.getReverb());
			osc.start(now + i * 0.04);
			osc.stop(now + i * 0.04 + 0.4);
		});
	}

	private petSvartalfar(): void {
		// Dark whisper: low filtered murmur
		this.playNoise(0.4, 500, 'lowpass', 0.08, this.getReverb());
		this.playTone(80, 0.35, 'sawtooth', 0.05, 0.3, 0.06, this.getReverb());
	}

	private petDisir(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Spirit wail: rising ethereal cry
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(300, now);
		osc.frequency.linearRampToValueAtTime(800, now + 0.3);
		osc.frequency.linearRampToValueAtTime(500, now + 0.45);
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
		gain.gain.linearRampToValueAtTime(0, now + 0.45);
		osc.connect(gain);
		gain.connect(this.getReverb());
		osc.start(now);
		osc.stop(now + 0.45);
		this.playNoise(0.3, 4000, 'highpass', 0.03, this.getReverb());
	}

	private petFylgja(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Shapeshifter morph: warbling pitch shift
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		const lfo = ctx.createOscillator();
		const lfoGain = ctx.createGain();
		osc.type = 'triangle';
		osc.frequency.setValueAtTime(300, now);
		osc.frequency.linearRampToValueAtTime(600, now + 0.15);
		osc.frequency.linearRampToValueAtTime(200, now + 0.3);
		osc.frequency.linearRampToValueAtTime(500, now + 0.4);
		lfo.frequency.value = 12;
		lfoGain.gain.value = 40;
		lfo.connect(lfoGain);
		lfoGain.connect(osc.frequency);
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
		gain.gain.linearRampToValueAtTime(0, now + 0.4);
		osc.connect(gain);
		gain.connect(this.getReverb());
		lfo.start(now);
		osc.start(now);
		osc.stop(now + 0.4);
		lfo.stop(now + 0.4);
	}

	private petHuldrefolk(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Forest giggle: quick bright notes
		const notes = [700, 900, 800, 1000, 850];
		notes.forEach((f, i) => {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = 'sine';
			osc.frequency.value = f;
			const t = now + i * 0.06;
			gain.gain.setValueAtTime(0.1, t);
			gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
			osc.connect(gain);
			gain.connect(this.getMaster());
			osc.start(t);
			osc.stop(t + 0.05);
		});
	}

	private petEinherjarWarrior(): void {
		// Battle cry: horn + clash
		this.playSweep(150, 220, 0.25, 'sawtooth', 0.03, 0.2, 0.12);
		const ctx = this.getContext();
		const now = ctx.currentTime;
		this.playFilteredNoiseBurst(now + 0.15, 0.08, 5000, 'highpass', 0.12);
		this.playScheduledTone(now + 0.15, 80, 0.1, 'sine', 0.15);
	}

	private petRatatoskr(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Squirrel chatter: rapid high clicks
		for (let i = 0; i < 6; i++) {
			const t = now + i * 0.05;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = 'sine';
			osc.frequency.value = 2000 + Math.random() * 1000;
			gain.gain.setValueAtTime(0.1, t);
			gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
			osc.connect(gain);
			gain.connect(this.getMaster());
			osc.start(t);
			osc.stop(t + 0.025);
		}
	}

	private petNaglfar(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Ship horn: deep foghorn
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sawtooth';
		osc.frequency.value = 65;
		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(200, now);
		filter.frequency.linearRampToValueAtTime(400, now + 0.2);
		filter.frequency.linearRampToValueAtTime(150, now + 0.6);
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.18, now + 0.1);
		gain.gain.setValueAtTime(0.15, now + 0.35);
		gain.gain.linearRampToValueAtTime(0, now + 0.6);
		osc.connect(filter);
		filter.connect(gain);
		gain.connect(this.getReverb());
		osc.start(now);
		osc.stop(now + 0.6);
	}

	private petPhoenix(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Phoenix cry: rising fire screech
		this.playSweep(400, 1500, 0.3, 'sawtooth', 0.02, 0.25, 0.12);
		// Fire crackle overlay
		for (let i = 0; i < 6; i++) {
			this.playFilteredNoiseBurst(now + i * 0.04, 0.03, 5000 + Math.random() * 3000, 'highpass', 0.05);
		}
		this.playTone(1200, 0.2, 'sine', 0.05, 0.15, 0.06, this.getReverb());
	}

	private petIvaldiConstruct(): void {
		const ctx = this.getContext();
		const now = ctx.currentTime;
		// Mechanical whir: gear-like oscillation
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		const lfo = ctx.createOscillator();
		const lfoGain = ctx.createGain();
		osc.type = 'square';
		osc.frequency.value = 200;
		lfo.frequency.setValueAtTime(8, now);
		lfo.frequency.linearRampToValueAtTime(20, now + 0.3);
		lfoGain.gain.value = 60;
		lfo.connect(lfoGain);
		lfoGain.connect(osc.frequency);
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
		gain.gain.setValueAtTime(0.08, now + 0.25);
		gain.gain.linearRampToValueAtTime(0, now + 0.35);
		const filter = ctx.createBiquadFilter();
		filter.type = 'bandpass';
		filter.frequency.value = 400;
		filter.Q.value = 2;
		osc.connect(filter);
		filter.connect(gain);
		gain.connect(this.getMaster());
		lfo.start(now);
		osc.start(now);
		osc.stop(now + 0.35);
		lfo.stop(now + 0.35);
		this.playFilteredNoiseBurst(now, 0.1, 3000, 'highpass', 0.05);
	}

	private petGenericBeast(): void {
		// Fallback: generic growl
		this.playSweep(200, 100, 0.3, 'sawtooth', 0.03, 0.25, 0.12);
		this.playFilteredNoiseBurst(this.getContext().currentTime, 0.15, 2000, 'bandpass', 0.06);
	}
}

export const proceduralAudio = new ProceduralAudio();
