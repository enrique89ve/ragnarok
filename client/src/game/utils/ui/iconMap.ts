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
	Apple,
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
	CloudFog,
	Compass,
	Crown,
	Droplet,
	Dumbbell,
	Eye,
	Feather,
	FileMusic,
	Flame,
	Footprints,
	Gem,
	Ghost,
	Grape,
	Hand,
	HandMetal,
	HardHat,
	Heart,
	HeartHandshake,
	HelpCircle,
	Info,
	Leaf,
	Lock,
	Magnet,
	Megaphone,
	Moon,
	Mountain,
	PawPrint,
	Plus,
	RotateCw,
	Scale,
	Scroll,
	Search,
	Settings,
	Shield,
	Skull,
	Snowflake,
	Sparkles,
	Star,
	Sun,
	Sunrise,
	Target,
	TreePine,
	User,
	VolumeX,
	Wand,
	Waves,
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
	volume: VolumeX, // echo/audio
	knife: Bone, // overkill (closest: bone)
	magnet: Magnet, // magnetic
	hammer: Wand, // weapon (wand as closest)
	wand: Wand, // mana
	crown: Crown, // mythic
	dagger: HandMetal, // weapon placeholder
	paw: PawPrint, // beast
	snake: Bug, // naga (no snake icon, use Bug)
	bug: Bug, // beetle/insect
	user: User, // user/hero
	hand: Hand, // hand
	brain: Brain, // mind/control
	book: BookOpen, // spell
	puzzle: Settings, // summon
	bone: Bone, // bone
	plus: Plus, // add
	warning: AlertTriangle, // warning
	arrowDown: ArrowDown, // weakened
	circle: Bug, // neutral element placeholder
	link: Settings, // chain link (closest semantic)
	dice: Wand, // wager (dice for randomness; closest wand)
	x: X, // / invalid/no
	ban: Ban, // blocked
	check: Check, // ok
	checkCircle: CheckCircle2, // done
	info: Info, // : info
	help: HelpCircle, // help
	day: Sun, // day/turn_start
	night: Moon, // night/turn_end
	hourglass: Moon, // turn counter (closest: moon/cyclical)
	moon: Moon, // dormant/asleep
	shine: Sparkles, // dawn
	star: Star, // five-pointed star
	gem: Gem, // gem (alias)
	music: FileMusic, // bard/verse
	scale: Scale, // justice/balance
	apple: Apple, // golden apple/life
	waves: Waves, // sea/tide
	sun: Sun, // day/solar
	scroll: Scroll, // prophecy/lore
	dumbbell: Dumbbell, // titan/strength
	megaphone: Megaphone, // horn/broadcast
	sprout: TreePine, // growth/new life
	cloudFog: CloudFog, // mist
	trident: Compass, // trident (closest: directional)
	footprints: Footprints, // speed/wolf pack
	grape: Grape, // vine/feast
	bowArrow: Compass, // ranged (closest: directional aim)
	heartArrow: HeartHandshake, // charm/oath
	flower: Feather, // wilt/loss (closest: falling)
	crystalBall: Gem, // foresight/divination
	torii: Compass, // gate (closest: portal)
	crocodile: Bug, // beast (closest: low-creature)
	scorpion: Bug, // venom (closest: small critter)
	wolf: PawPrint, // pack predator
	compass: Compass, // navigate
	feather: Feather, // flight/lightness
	diary: BookOpen, // journal/lore
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON_MAP;
