/**
 * iconMap.ts semantic game icon registry (G4 migration)
 *
 * Maps semantic game-icon names to lucide-react components.
 * Use `<GameIcon name="skull" />` instead of inline emoji spans.
 *
 * Recipe source of truth: NEVER use emoji codepoints in user-facing UI.
 * Decorative VFX particles and console.warn strings are exempt.
 */

import type { LucideIcon } from 'lucide-react';
import {
	AlertTriangle,
	ArrowDown,
	Axe,
	Ban,
	Bone,
	BookOpen,
	Brain,
	Bug,
	Check,
	CheckCircle2,
	CircleHelp,
	Crown,
	Droplet,
	Eye,
	Flame,
	Gem,
	Ghost,
	Hand,
	HandMetal,
	HardHat,
	Heart,
	HelpCircle,
	Info,
	Leaf,
	Lock,
	Magnet,
	Moon,
	Mountain,
	PawPrint,
	Plus,
	RotateCw,
	Search,
	Settings,
	Shield,
	Skull,
	Snowflake,
	Sparkles,
	Sun,
	Target,
	TreePine,
	User,
	VolumeX,
	Wand,
	Wind,
	X,
	Zap,
} from 'lucide-react';

/** Semantic name Lucide component. Add to this registry; no inline emoji. */
export const ICON_MAP = {
	// Combat: actions
	swords: Axe, // battle/attack
	shield: Shield, // defense/taunt
	skull: Skull, // death/destroy
	skullCrossed: Bone, // poison
	zap: Zap, // spell/quick/paralysis
	sparkles: Sparkles, // buff/spell/effect
	flame: Flame, // fire/burn
	snowflake: Snowflake, // freeze/ice
	droplet: Droplet, // / water/bleed
	leaf: Leaf, // grass/nature
	wind: Wind, // / wind
	mountain: Mountain, // / earth
	ghost: Ghost, // spirit
	tree: TreePine, // treant
	helmet: HardHat, // helm/gear
	gear: Settings, // settings/mech
	eye: Eye, // see/stealth/marked
	target: Target, // target/vulnerable
	lock: Lock, // locked
	refresh: RotateCw, // transform/echo
	crystal: Gem, // spell/discover
	question: CircleHelp, // secret
	search: Search, // discover
	heart: Heart, // heal/lifesteal
	mute: VolumeX, // silence
	knife: Bone, // overkill (closest: bone)
	magnet: Magnet, // magnetic
	hammer: Wand, // weapon (wand as closest)
	wand: Wand, // mana
	crown: Crown, // mythic
	dagger: HandMetal, // weapon placeholder
	paw: PawPrint, // beast
	snake: Bug, // naga (no snake icon, use Bug)
	user: User, // user/hero
	hand: Hand, // hand
	brain: Brain, // mind/control
	book: BookOpen, // spell
	puzzle: Settings, // summon
	bone: Bone, // bone
	plus: Plus, // add
	warning: AlertTriangle, // warning
	arrowDown: ArrowDown, // weakened
	x: X, // / invalid/no
	ban: Ban, // blocked
	check: Check, // ok
	checkCircle: CheckCircle2, // done
	info: Info, // : info
	help: HelpCircle, // help
	day: Sun, // day/turn_start
	night: Moon, // night/turn_end
	shine: Sparkles, // dawn
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON_MAP;
