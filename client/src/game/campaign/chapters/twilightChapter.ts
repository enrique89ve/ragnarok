/*
  twilightChapter.ts — TWILIGHT OF THE GODS

  The second Norse arc. Covers everything the first chapter (Echoes of Ymir)
  could not: the Mead of Poetry, the theft of Idunn, Thor's fishing trip,
  the binding of Fenrir, the death of Baldr, Loki's punishment, the great
  winter Fimbulvetr, and Ragnarok itself with all its named duels.

  Authoring guideline: every mission carries the cinematic kit
    - bossQuips (4 lines: combat start, low HP, lethal, victory)
    - bossPhases (1-3 mid-combat escalations with quip + flash + effect)
    - victoryCinematic (2-4 scenes shown after victory)
    - defeatCinematic (1-2 scenes shown after defeat)
    - storyBridge (2-3 scenes between missions, no bridge after the finale)
    - combatMusicId (per-fight thematic cue)

  Lore is taken faithfully from the Prose Edda (Snorri Sturluson) and
  the Poetic Edda (especially Voluspa, Lokasenna, Vafthrudnismal).
  Where the sources are silent, the gaps are filled with the most
  cinematic, lore-consistent outcome.
*/

import type { CampaignChapter } from '../campaignTypes';
import { AI_PROFILES } from '../campaignTypes';

export const twilightChapter: CampaignChapter = {
	id: 'twilight',
	name: 'Twilight of the Gods',
	faction: 'norse',
	description: 'After Echoes of Ymir, the cosmos has settled into a fragile peace. Now the trickster\u2019s children grow. Now the beautiful god dies. Now the wolf strains his chain and the great winter begins. This chapter ends the way every Norse story has been waiting to end \u2014 with Ragnarok itself.',
	chapterReward: [{ type: 'pack', amount: 5 }, { type: 'rune', amount: 500 }],
	cinematicIntro: {
		title: 'Twilight of the Gods',
		style: 'Norse epic finale. Funeral horns and bone drums. Slow camera, heavy snow. The narrator is older now, sadder.',
		scenes: [
			{ narration: 'After the slaying of Ymir, after the building of Asgard, after the war of the Aesir and Vanir, the gods believed they had a long age of quiet ahead of them. They were wrong by a margin of one trickster.', musicId: 'twilight_horn', durationHint: 12 },
			{ narration: 'Loki had married a giantess named Angrboda in the iron-wood of Jotunheim. She bore him three children: a wolf, a serpent, and a half-corpse girl. The gods saw the children and felt the ground shift under them.', visualCue: 'Three monstrous shapes growing in a black forest \u2014 a wolf cub already taller than men, a serpent in a tar-dark stream, a girl whose left side is dead and whose right side is fair.', musicId: 'shadow_root', durationHint: 14 },
			{ narration: 'Odin took the wolf and called him Fenrir. He cast the serpent into the deep ocean, where it grew so long it circled the world and bit its own tail. The girl, Hel, he sent to rule the realm of the unworthy dead.', visualCue: 'Three exiles, three realms. The wolf walks into Asgard. The serpent slides into the sea. The girl walks down a road that has only one direction.', musicId: 'shadow_root', durationHint: 14 },
			{ narration: 'And the brightest of the gods, Baldr the Beautiful, began to dream of his own death.', visualCue: 'A radiant young god sitting up in the dark, drenched in cold sweat. The light around him flickers.', musicId: 'twilight_horn', durationHint: 10 },
			{ narration: 'This is the chapter the prophecies were always pointing at. This is Twilight of the Gods.', musicId: 'ragnarok', durationHint: 8 },
		],
	},
	missions: [
		// ─── Twilight 1: The Mead of Poetry ──────────────────────────────
		// Odin steals the mead Suttungr keeps in the heart of a mountain.
		// Sets up the cosmic stakes: language, story, prophecy, all ride on this.
		{
			id: 'twilight-1', chapterId: 'twilight', missionNumber: 1,
			name: 'The Mead of Poetry',
			description: 'Help Odin steal the mead of inspiration from the giant Suttungr, deep in the mountain.',
			narrativeBefore: 'When the war of the Aesir and Vanir ended, the gods spat into a great vessel and from that mingled spit they made Kvasir \u2014 the wisest being who had ever lived. Two dwarves, Fjalar and Galar, killed Kvasir, drained his blood, and brewed it with honey into a mead so potent that any who drank of it became a poet and a sage. The dwarves, in turn, killed the giant Gilling and were ransomed back from Gilling\u2019s son Suttungr with the mead itself. Suttungr hid it in the heart of a mountain and set his daughter Gunnlod to guard it. Now Odin himself comes for the mead, in disguise, in the company of nine dead reapers and a bargain that has gone wrong. You walk in his shadow. The mead is the source of all stories. Without it, the gods will lose the gift of telling their own.',
			narrativeAfter: 'Odin escapes the mountain in the shape of an eagle, the mead held in three great gulps in his throat. Suttungr pursues, his own eagle-shape larger but slower. As Odin clears the walls of Asgard he spits the mead into three vessels, but a few drops fall to the earth in his haste \u2014 those drops are the share of bad poets. The gift of language is restored. The stories of the cosmos can be told again. They will be needed.',
			narrativeVictory: 'The mead is in Asgard. Every story that follows from here drinks from this cup.',
			narrativeDefeat: 'Suttungr keeps his prize. The cosmos enters its final age unable to tell its own ending.',
			aiHeroId: 'hero-thorgrim', aiHeroClass: 'warrior',
			aiDeckCardIds: [20001,20001,20003,20003,20004,20004,20005,20005,20020,20020,20100,20100,20104,20104,20107,20107,20111,20111,20113,20113,20115,20115,20200,20200,20203,20203,20207,20207,20305,20305],
			aiProfile: AI_PROFILES.bergelmir,
			bossRules: [
				{ type: 'extra_health', value: 15, description: 'Suttungr has 115 health \u2014 mountain-blooded' },
			],
			bossQuips: {
				onCombatStart: 'You come for the brewed blood of the wisest god. Then come and bleed.',
				onLowHP: 'My daughter loved you for one night. I will hate you for the rest of my life.',
				onLethal: 'Drink, then. Choke on the words you steal.',
				onVictory: 'The mead stays in the mountain. The gods will run out of things to say.',
			},
			combatMusicId: 'mead_hall',
			bossPhases: [
				{
					hpPercent: 50,
					quip: 'GUNNLOD! BAR THE INNER DOOR!',
					flash: 'red',
					effect: { type: 'add_armor', value: 8 },
					description: 'Suttungr seals the cave',
				},
			],
			victoryCinematic: [
				{ narration: 'Odin breaks free from the mountain in the shape of an eagle. Three swallows of mead burn in his throat like a star.', visualCue: 'A vast eagle exploding out of stone, drenched in the gold of dawn.', musicId: 'mead_hall', durationHint: 10 },
				{ narration: 'Suttungr gives chase, but the gates of Asgard open just in time. Odin spits the mead into three waiting vessels. A few drops fall to the earth \u2014 the share of bad poets.', visualCue: 'Three golden basins catching a stream of liquid light. A few stray drops splash into the dirt.', musicId: 'aesir_triumph', durationHint: 12 },
			],
			defeatCinematic: [
				{ narration: 'Suttungr drives you back into the dark of the mountain. The mead stays sealed. The gift of language begins to fade from Asgard like a fire left untended.', musicId: 'twilight_horn', durationHint: 8 },
			],
			storyBridge: [
				{ narration: 'Years pass. The mead does its quiet work \u2014 sagas are sung, runes are cut, the gods learn to speak the names of things to come.', musicId: 'aesir_triumph', durationHint: 10 },
				{ narration: 'And then Idunn vanishes from Asgard, and her apples with her, and the gods begin to age.', visualCue: 'A god\u2019s hand turning grey. A queen\u2019s hair going white in the space of a single morning.', musicId: 'shadow_root', durationHint: 8 },
			],
			prerequisiteIds: ['norse-9'],
			rewards: [{ type: 'rune', amount: 60 }, { type: 'eitr', amount: 50 }],
			realm: 'jotunheim',
			campaignArmy: { king: 'king-surtr', queen: 'hero-sinmara', rook: 'hero-thorgrim', bishop: 'hero-gerd', knight: 'hero-skadi' },
		},

		// ─── Twilight 2: The Theft of Idunn ──────────────────────────────
		// Loki delivers Idunn to Thiazi. The gods age. Loki must put it right.
		{
			id: 'twilight-2', chapterId: 'twilight', missionNumber: 2,
			name: 'The Theft of Idunn',
			description: 'Idunn and her apples of youth have been stolen. Without them, the gods will wither and die. Reach the eagle-shaped giant Thiazi before the apples are eaten.',
			narrativeBefore: 'Loki, in one of his usual messes, made a bargain with the giant Thiazi: deliver the goddess Idunn to him in exchange for his own life. Loki tricked Idunn out of Asgard by promising her a grove of even sweeter apples just past the gates. Thiazi, in eagle-shape, snatched her up the moment her foot crossed the threshold. Now the gods are aging visibly \u2014 Bragi\u2019s beard goes white, Freyja\u2019s shoulders bow, even Odin walks with a stoop. Loki has been ordered, on pain of death, to fix what he broke. He has borrowed Freyja\u2019s falcon-cloak and means to steal Idunn back. You travel with him. Whatever Loki touches goes wrong. Whatever needs the cleverest hands in the cosmos succeeds anyway.',
			narrativeAfter: 'Loki, in falcon-shape, snatches Idunn (turned into a nut) from Thiazi\u2019s mountain. Thiazi gives chase as an eagle. The Aesir light a great pyre on the walls of Asgard. As the falcon clears the wall, the pyre flares up and Thiazi\u2019s wings catch fire. He crashes inside the gates of Asgard and is killed. Idunn is restored, the apples of youth are returned, and the gods are themselves again. But Thiazi\u2019s daughter, Skadi, comes north in armor demanding wergild. The gods give her the choice of any husband \u2014 by his feet alone. She chooses the most beautiful feet expecting Baldr; she gets Njord. The marriage does not last, but the bitterness does.',
			narrativeVictory: 'Idunn is home. The gods stop aging. But Skadi is angry, and she has time.',
			narrativeDefeat: 'The apples are eaten. The gods wither in their golden halls. Asgard becomes a hospice.',
			aiHeroId: 'hero-skadi', aiHeroClass: 'hunter',
			aiDeckCardIds: [20001,20001,20003,20003,20004,20004,20020,20020,20100,20100,20106,20106,20107,20107,20109,20109,20111,20111,20114,20114,20203,20203,20205,20205,20208,20208,20214,20214,20215,20215],
			aiProfile: AI_PROFILES.bergelmir,
			bossRules: [
				{ type: 'extra_health', value: 20, description: 'Thiazi (eagle-form) has 120 health' },
				{ type: 'bonus_draw', value: 1, description: 'Eagle\u2019s eye \u2014 Thiazi draws an extra card each turn' },
			],
			bossQuips: {
				onCombatStart: 'I have the goddess of youth in my eyrie. The Aesir wither while we speak.',
				onLowHP: 'My daughter will collect the wergild. Make her a long list.',
				onLethal: 'Tell Skadi her father did not run.',
				onVictory: 'The gods grow old. I take my time.',
			},
			combatMusicId: 'shadow_root',
			bossPhases: [
				{
					hpPercent: 60,
					quip: 'I am older than the mountain you stand on. I do not need to tire.',
					flash: 'blue',
					effect: { type: 'heal_self', value: 10 },
					description: 'Thiazi draws on his ancient years',
				},
				{
					hpPercent: 30,
					quip: 'If I cannot have her, no one can taste an apple ever again.',
					flash: 'red',
					effect: { type: 'enrage', value: 9 },
					description: 'Thiazi turns spiteful',
				},
			],
			victoryCinematic: [
				{ narration: 'Loki, in the falcon-cloak, dives through Thiazi\u2019s smashed window with a single nut clutched in his talons.', visualCue: 'A small bright bird streaking through a black mountain shaft, a hazelnut in its claws.', musicId: 'mead_hall', durationHint: 9 },
				{ narration: 'On the walls of Asgard, the Aesir light a wall of fire. Thiazi, in eagle-form, comes in too fast to turn. His wings catch and he crashes inside the gates, burning.', visualCue: 'A vast burning eagle screaming over a wall of flame. He falls. The gods finish him with spears.', musicId: 'aesir_triumph', durationHint: 12 },
				{ narration: 'Idunn returns to her grove and the apples ripen at her touch. The gods are themselves again. But on a road from the north, Skadi is already coming, in armor, in mourning, wanting blood-price.', visualCue: 'A young goddess waking under apple trees, golden again. Far away, a tall woman in white fur walking south through snow.', musicId: 'twilight_horn', durationHint: 12 },
			],
			defeatCinematic: [
				{ narration: 'Thiazi keeps his prize. Idunn fades. The gods grow old in their golden halls. Bragi forgets the words to his own songs. Asgard becomes a place where everyone is dying slowly.', musicId: 'twilight_horn', durationHint: 10 },
			],
			storyBridge: [
				{ narration: 'Skadi marries Njord by his feet, hates the sea, hates Njord\u2019s house, returns alone to her snowy mountain. Loki is given to her father\u2019s ghost as a kind of bone-jest, tied to a goat in front of her until she laughs once. She does laugh. It does not put it right.', musicId: 'twilight_horn', durationHint: 12 },
				{ narration: 'Far below, in the deep ocean, the World-Serpent grows. Thor decides he wants to look the thing in the eye. He goes to find a giant with a boat.', visualCue: 'A black ocean. A coil under the surface as wide as a city. A red-bearded god putting on his belt of strength.', musicId: 'jotun_rage', durationHint: 10 },
			],
			rewards: [{ type: 'rune', amount: 70 }, { type: 'eitr', amount: 60 }],
			realm: 'jotunheim',
			campaignArmy: { king: 'king-ymir', queen: 'hero-hel', rook: 'hero-valthrud', bishop: 'hero-ran', knight: 'hero-skadi' },
			prerequisiteIds: ['twilight-1'],
		},

		// ─── Twilight 3: Thor's Fishing Trip ─────────────────────────────
		// Thor and Hymir put out to sea. Thor hooks Jormungandr. Hymir cuts the line.
		{
			id: 'twilight-3', chapterId: 'twilight', missionNumber: 3,
			name: 'Thor\u2019s Fishing Trip',
			description: 'Thor borrows a boat from the giant Hymir and rows to the deepest waters in the Nine Realms to challenge the World-Serpent itself.',
			narrativeBefore: 'Thor, the strongest of the gods, has spent his whole long life hunting jotnar with Mjolnir. But there is one giant he has never met face-to-face: Jormungandr, the Midgard-Serpent, his own brother by adoption (a son of Loki, cast into the sea by Odin to grow there). The serpent is now so vast it circles the world and bites its own tail. Thor wants to look the thing in the eye. He finds the giant Hymir, who keeps the largest sea-going boat in Jotunheim, and bullies him into rowing out. Thor uses the head of an ox as bait. The hook drops past the deepest fish, past the deepest dark, past the place where the sea remembers being a wound. And then it stops. And then the line goes tight. You sit in the bow with him.',
			narrativeAfter: 'Thor hauls the serpent up so far its head clears the surface of the sea \u2014 a thing the size of a fjord, eyes like burning coals, mouth wide enough to swallow ships. Thor reaches for Mjolnir. Hymir, who has been growing more terrified by the second, takes a knife and cuts the fishing line. The serpent slips back into the water. Thor hurls Hymir overboard in a rage. He wades back to shore alone, dripping, the knowledge that he and the serpent will meet again at Ragnarok burning behind his eyes. He says nothing to anyone for three days.',
			narrativeVictory: 'You held the line long enough for Thor to see his future. He will not need a second look.',
			narrativeDefeat: 'The boat capsizes. Thor is dragged into the deep. The cosmos loses its strongest hand.',
			aiHeroId: 'hero-jormungandr', aiHeroClass: 'shaman',
			aiDeckCardIds: [20001,20001,20003,20003,20020,20020,20100,20100,20105,20105,20107,20107,20109,20109,20113,20113,20114,20114,20200,20200,20203,20203,20204,20204,20207,20207,20209,20209,20305,20305],
			aiProfile: AI_PROFILES.jormungandr,
			bossRules: [
				{ type: 'extra_health', value: 30, description: 'Jormungandr has 130 health \u2014 it circles the world' },
				{ type: 'extra_mana', value: 1, description: 'The deep gives the serpent endless venom' },
			],
			bossQuips: {
				onCombatStart: 'Brother. I have grown longer than the world. I am still hungry.',
				onLowHP: 'You and I were never going to meet here. The first time will be the last time.',
				onLethal: 'Save me for the day the horn sounds, brother.',
				onVictory: 'Hymir will cut your line before I do.',
			},
			combatMusicId: 'jotun_rage',
			bossPhases: [
				{
					hpPercent: 65,
					quip: 'The deep loves what is left in it.',
					flash: 'blue',
					effect: { type: 'heal_self', value: 12 },
					description: 'Jormungandr draws on the sea',
				},
				{
					hpPercent: 30,
					quip: 'I am the venom that ends you. I am ALWAYS the venom that ends you.',
					flash: 'green',
					effect: { type: 'damage_player', value: 10 },
					description: 'The serpent\u2019s breath turns the air to poison',
				},
			],
			victoryCinematic: [
				{ narration: 'Thor hauls and hauls. The boat tips so far the gunwales drink the sea.', visualCue: 'A red-bearded god leaning back against an impossible weight. A line straining to break.', musicId: 'jotun_rage', durationHint: 9 },
				{ narration: 'And then, slowly, the head of the serpent rises out of the dark like a new continent. Eyes the size of full moons. A mouth wide enough for a kingdom.', visualCue: 'A vast green-black head emerging from the sea, water sheeting off scales the size of doors.', musicId: 'jotun_rage', durationHint: 12 },
				{ narration: 'Thor reaches for Mjolnir. Hymir, beside him, makes a noise like a wounded child and cuts the fishing line. The serpent slips back into the deep. Thor stares into the place where it was for a very long time.', visualCue: 'A small terrified giant with a fish-knife. A red god with a hammer halfway raised. A line going slack.', musicId: 'twilight_horn', durationHint: 14 },
			],
			defeatCinematic: [
				{ narration: 'The boat capsizes. The strongest god in the cosmos goes into the dark of the sea, and the silence after it is the silence the world ends in.', musicId: 'ragnarok', durationHint: 9 },
			],
			storyBridge: [
				{ narration: 'Thor will not speak of the fishing trip. He goes to the forge and asks the dwarves to remind him how to put rage into iron.', musicId: 'forge_anvil', durationHint: 8 },
				{ narration: 'And in a dark corner of Asgard, Odin watches a wolf-cub he has been raising in his own household. The cub is no longer a cub. Tyr, god of just war, is the only one brave enough to feed him by hand.', visualCue: 'A wolf the size of a horse rolling over for a one-handed god to scratch its belly. The wolf\u2019s eyes are not friendly.', musicId: 'shadow_root', durationHint: 12 },
			],
			rewards: [{ type: 'rune', amount: 80 }, { type: 'card', cardId: 20204 }],
			realm: 'midgard',
			campaignArmy: { king: 'king-yggdrasil', queen: 'hero-ran', rook: 'hero-aegir', bishop: 'hero-njord', knight: 'hero-skadi' },
			prerequisiteIds: ['twilight-2'],
		},

		// ─── Twilight 4: The Binding of Fenrir ───────────────────────────
		// Tyr sacrifices his hand. Gleipnir holds. The cosmos buys an age.
		{
			id: 'twilight-4', chapterId: 'twilight', missionNumber: 4,
			name: 'The Binding of Fenrir',
			description: 'The wolf-son of Loki has grown larger than any chain can hold. The dwarves have made a ribbon called Gleipnir from impossible things. Hold the wolf still long enough for it to be tied.',
			narrativeBefore: 'Fenrir, the wolf-son of Loki and the giantess Angrboda, was raised in Asgard because Odin thought to keep an enemy close. The wolf grew so fast that within a few years he was taller than the gods\u2019 tallest hall, and Tyr was the only god the wolf would let near him \u2014 the only god brave enough to put a hand into that mouth and feed him. Twice the gods tried to chain Fenrir for sport, twice Fenrir broke the chain laughing. Now the dwarves have made a third binding: a soft ribbon called Gleipnir, woven from the sound of a cat\u2019s footfall, the beard of a woman, the roots of a mountain, the sinews of a bear, the breath of a fish, and the spittle of a bird. Six things that do not exist. The gods have brought Fenrir to a lonely island and offered him the test. Fenrir, suspicious, demands that one of them put a hand in his mouth as a token of good faith. Only Tyr will do it. You stand on the island with them.',
			narrativeAfter: 'Gleipnir holds. Fenrir, realizing the trap, snaps his jaws shut on Tyr\u2019s wrist and bites the hand off cleanly. Tyr does not cry out \u2014 he is the god of just war, and the bite is just. The wolf is bound. He howls in a way that bends the trees on the mainland. The gods drive a sword between his jaws to keep them open and his slavers form a river called Hope. Tyr walks back to Asgard one-handed and never speaks of it. The cosmos has bought itself another age. But every god who was on the island remembers the look in the wolf\u2019s eyes when he understood, and they know what is coming for them.',
			narrativeVictory: 'Fenrir is bound. The cosmos buys an age. Tyr never raises his right hand again.',
			narrativeDefeat: 'Gleipnir snaps. The wolf walks free from the island. He starts toward Asgard. He is patient.',
			aiHeroId: 'hero-fenrir', aiHeroClass: 'hunter',
			aiDeckCardIds: [20001,20001,20002,20002,20003,20003,20020,20020,20100,20100,20104,20104,20105,20105,20107,20107,20111,20111,20113,20113,20114,20114,20115,20115,20201,20201,20203,20203,20210,20210],
			aiProfile: AI_PROFILES.fenrir,
			bossRules: [
				{ type: 'extra_health', value: 25, description: 'Fenrir has 125 health \u2014 the cosmos cannot hold him' },
			],
			bossQuips: {
				onCombatStart: 'You raised me. You watched me grow. Now you bring me a SOFT RIBBON.',
				onLowHP: 'I have eaten chains thicker than your spine. I am not afraid of cords.',
				onLethal: 'Tyr. Old friend. Put the hand in.',
				onVictory: 'When the horn sounds, I will remember which one of you brought the ribbon.',
			},
			combatMusicId: 'shadow_root',
			bossPhases: [
				{
					hpPercent: 70,
					quip: 'Show me the rest of you. Show me ALL of you.',
					flash: 'red',
					effect: { type: 'enrage', value: 8 },
					description: 'Fenrir tests his strength against Gleipnir',
				},
				{
					hpPercent: 35,
					quip: 'TYR! Where is your hand!',
					flash: 'red',
					effect: { type: 'damage_player', value: 12 },
					description: 'The wolf understands the trap',
				},
			],
			victoryCinematic: [
				{ narration: 'Gleipnir holds. The ribbon, woven from six things that do not exist, will not break for any wolf in any age.', visualCue: 'A pale silver thread around vast black-furred legs, taut as iron.', musicId: 'shadow_root', durationHint: 10 },
				{ narration: 'Fenrir snaps his jaws shut on Tyr\u2019s wrist. Tyr does not cry out \u2014 he is the god of just war, and the bite is just.', visualCue: 'A close-up: a wrist disappearing between yellow teeth. A god\u2019s face going still and accepting.', musicId: 'twilight_horn', durationHint: 12 },
				{ narration: 'The gods drive a sword between the wolf\u2019s jaws to hold them open and his slavers form a river called Hope. Tyr walks home one-handed. He does not ever speak of it.', visualCue: 'A bound wolf with a blade in his throat. A river running away from him. A one-armed god turning his back.', musicId: 'twilight_horn', durationHint: 14 },
			],
			defeatCinematic: [
				{ narration: 'Gleipnir snaps. The wolf walks off the island and starts toward Asgard. There will not be another chance.', musicId: 'ragnarok', durationHint: 9 },
			],
			storyBridge: [
				{ narration: 'A god comes back from the island missing a hand. Another god comes back from the island knowing his children are stronger than his oaths. Loki sits very quietly in his hall and pretends he is not thinking about anything.', musicId: 'twilight_horn', durationHint: 12 },
				{ narration: 'And in a high white room, Baldr the Beautiful sits up in bed at midnight, drenched in cold sweat, having dreamed of his own death again.', visualCue: 'A radiant young god with terror in his eyes. The light around him flickers.', musicId: 'twilight_horn', durationHint: 8 },
			],
			rewards: [{ type: 'rune', amount: 90 }, { type: 'card', cardId: 20210 }, { type: 'eitr', amount: 75 }],
			realm: 'asgard',
			campaignArmy: { king: 'king-yggdrasil', queen: 'hero-freya', rook: 'hero-tyr', bishop: 'hero-frey', knight: 'hero-ullr' },
			prerequisiteIds: ['twilight-3'],
		},

		// ─── Twilight 5: The Death of Baldr ──────────────────────────────
		// Frigg makes everything in the cosmos swear not to harm Baldr — except mistletoe.
		// Loki finds out. Tricks Hod. Baldr dies. Norse mythology's most famous tragedy.
		{
			id: 'twilight-5', chapterId: 'twilight', missionNumber: 5,
			name: 'The Death of Baldr',
			description: 'Baldr, the most beloved of the gods, dreams nightly of his own murder. His mother Frigg has gone to every thing in the cosmos and made it swear not to harm him \u2014 every thing except one. Find the one before the trickster does.',
			narrativeBefore: 'Baldr the Beautiful is the brightest of the Aesir. Light follows him into rooms. Even the giants speak of him kindly. But for nights now he has dreamed of his own death, and the dreams will not stop. His mother Frigg, in panic, has gone to every thing in the cosmos \u2014 every animal, every plant, every metal, every disease, every weapon, every word \u2014 and made each one swear an oath that it will not harm Baldr. The oaths hold. The gods, relieved, invent a new game: they throw weapons at Baldr in a circle and watch the weapons swerve aside. They are laughing. It is the last time they will laugh together. Loki, who watches the game from the back of the crowd, has noticed something Frigg missed. He has been very polite to her about it. He is going to find a use for it.',
			narrativeAfter: 'In the circle of laughing gods, Loki places a sprig of mistletoe in the hand of Hod, Baldr\u2019s blind brother. \u201cIt is not fair you cannot join,\u201d says Loki. \u201cI will guide your aim.\u201d Hod throws. The mistletoe pierces Baldr through the heart and the brightest of the gods falls dead in the grass. The laughter stops as if a knife had been put through it. Frigg, when she understands, goes very white and very calm. The gods carry Baldr down to the sea on the great ship Hringhorni and burn him there with his wife Nanna, who has died of grief on the spot. Odin bends and whispers something in his dead son\u2019s ear that nobody else hears. The cosmos has crossed a line it cannot uncross.',
			narrativeVictory: 'You held Hod\u2019s hand back at the last instant. The mistletoe falls into the grass. The cosmos buys one more year.',
			narrativeDefeat: 'Hod throws. The brightest of the gods falls. The laughter dies in every god\u2019s throat at the same instant.',
			aiHeroId: 'hero-loki', aiHeroClass: 'rogue',
			aiDeckCardIds: [20004,20004,20020,20020,20100,20100,20102,20102,20103,20103,20105,20105,20107,20107,20109,20109,20111,20111,20113,20113,20114,20114,20204,20204,20205,20205,20207,20207,20208,20208],
			aiProfile: AI_PROFILES.loki,
			bossRules: [
				{ type: 'extra_health', value: 20, description: 'Loki cannot quite die yet \u2014 the story still needs him' },
				{ type: 'bonus_draw', value: 1, description: 'Loki always has one more trick than you do' },
			],
			bossQuips: {
				onCombatStart: 'I am only here to keep Hod company. I am the most helpful god in the room.',
				onLowHP: 'You think this is the betrayal I came here to commit. It isn\u2019t.',
				onLethal: 'You can stop me here. You cannot stop me from being who I am. The story still needs the mistletoe.',
				onVictory: 'There. Just a sprig. Just for the laughs.',
			},
			combatMusicId: 'twilight_horn',
			bossPhases: [
				{
					hpPercent: 75,
					quip: 'Hod, hold out your hand. I have a present for you.',
					flash: 'purple',
					effect: { type: 'damage_player', value: 5 },
					description: 'Loki places the mistletoe',
				},
				{
					hpPercent: 50,
					quip: 'I always wondered which of these gods was Frigg\u2019s favorite. Now we will know.',
					flash: 'purple',
					effect: { type: 'enrage', value: 7 },
					description: 'Loki enjoys the moment',
				},
				{
					hpPercent: 25,
					quip: 'Throw, brother. Throw straight. Let me guide your hand.',
					flash: 'red',
					effect: { type: 'damage_player', value: 10 },
					description: 'Loki guides Hod\u2019s aim',
				},
			],
			victoryCinematic: [
				{ narration: 'You wrench the sprig out of Hod\u2019s hand at the last possible instant. The blind god, confused, drops the dart. The circle of gods laughs again \u2014 nervously, this time, but they laugh.', visualCue: 'A blind god lowering an empty hand. A small green sprig falling into grass. Baldr, untouched, looking back at you with quiet wonder.', musicId: 'aesir_triumph', durationHint: 12 },
				{ narration: 'Loki vanishes from the back of the circle. He will be back. He always is. But the brightest god in the cosmos is alive for one more year.', musicId: 'twilight_horn', durationHint: 9 },
			],
			defeatCinematic: [
				{ narration: 'The mistletoe finds Baldr\u2019s heart. The brightest of the gods falls in the grass with a small surprised look on his face. The laughter dies in every god\u2019s throat at the same instant.', visualCue: 'A young god with a green sprig in his chest, going down on one knee, smiling almost. Then collapsing.', musicId: 'twilight_horn', durationHint: 14 },
				{ narration: 'Frigg, when she understands, does not weep. She walks into her own hall and closes the door behind her. She does not come out.', visualCue: 'A queen standing in firelight, her face calm and absolutely without color.', musicId: 'twilight_horn', durationHint: 10 },
				{ narration: 'They will burn him on the great ship Hringhorni. Odin will bend and whisper something in his dead son\u2019s ear that nobody else hears. And the cosmos will start counting the days until Ragnarok.', visualCue: 'A funeral pyre on a longship. A one-eyed king bending to murmur to the dead.', musicId: 'ragnarok', durationHint: 12 },
			],
			storyBridge: [
				{ narration: 'Whatever you did on that field of laughter, the gods will not look at each other the same way again. They have seen one of their own bleeding in the grass with a small green sprig in his chest, even if only in a dream. The laughter is over.', musicId: 'twilight_horn', durationHint: 10 },
				{ narration: 'Hermod, Odin\u2019s most loyal son, mounts Sleipnir and rides for the road to Hel. He will ask the half-corpse goddess to give Baldr back. Whatever the answer is, it is not going to be enough.', visualCue: 'An eight-legged horse plunging down a black road into a deeper black.', musicId: 'shadow_root', durationHint: 10 },
			],
			rewards: [{ type: 'rune', amount: 100 }, { type: 'card', cardId: 20300 }, { type: 'eitr', amount: 80 }],
			realm: 'asgard',
			campaignArmy: { king: 'king-yggdrasil', queen: 'hero-frigg', rook: 'hero-tyr', bishop: 'hero-baldr', knight: 'hero-hoder' },
			prerequisiteIds: ['twilight-4'],
		},

		// ─── Twilight 6: Hel's Wager ─────────────────────────────────────
		// All the world weeps for Baldr — except one giantess in a cave (Loki in disguise).
		{
			id: 'twilight-6', chapterId: 'twilight', missionNumber: 6,
			name: 'Hel\u2019s Wager',
			description: 'Baldr is in Hel\u2019s realm. Hel will give him back \u2014 if every thing in the cosmos weeps for him. One thing will not. Find it.',
			narrativeBefore: 'Hermod the Bold rode Sleipnir nine nights and nine days down a road that has only one direction. At the end of it he found his brother Baldr, pale and seated in Hel\u2019s great hall, with Nanna beside him, looking like himself but very far away. Hermod begged for his brother\u2019s life. Hel, the half-corpse goddess, considered him a long time and then said: \u201cIf every living thing in all Nine Realms weeps for him, I will let him go. If even one refuses, he stays.\u201d The Aesir sent messengers to every place in the cosmos, every god, every giant, every animal, every stone, every thaw, every spider, every grief. All wept. All but one. In a cave at the edge of the world an old giantess named Thokk \u2014 \u201cthanks\u201d \u2014 sat dry-eyed and said: \u201cThokk will weep dry tears at Baldr\u2019s burial. Let Hel keep what she has.\u201d The cave is a long ride from Asgard. You ride it. You suspect, the closer you get, who Thokk really is.',
			narrativeAfter: 'You reach the cave. Thokk is waiting. She is not really an old giantess at all \u2014 the disguise slips, very deliberately, just enough for you to see who has been wearing it. \u201cI did say I would weep dry tears,\u201d says Loki, smiling. \u201cYou are a very thorough investigator.\u201d The cosmos has its answer. Baldr stays in Hel\u2019s hall. The great chain that has been holding Loki to the gods, however thinly, breaks in this moment forever. The Aesir come for him with iron hands. The story has reached the place it could no longer be turned away from.',
			narrativeVictory: 'You force the truth out of Thokk. She drops the disguise and laughs. The gods, finally, know exactly who Loki is.',
			narrativeDefeat: 'Thokk weeps no tears. Baldr stays in Hel forever. The cosmos enters its long darkness early.',
			aiHeroId: 'hero-loki', aiHeroClass: 'rogue',
			aiDeckCardIds: [20001,20001,20003,20003,20020,20020,20100,20100,20102,20102,20103,20103,20105,20105,20107,20107,20109,20109,20111,20111,20113,20113,20114,20114,20203,20203,20204,20204,20205,20205],
			aiProfile: AI_PROFILES.loki,
			bossRules: [
				{ type: 'extra_health', value: 25, description: 'Thokk has many faces and only one of them is hers' },
				{ type: 'bonus_draw', value: 1, description: 'Loki has read this scene before' },
			],
			bossQuips: {
				onCombatStart: 'A giantess. In a cave. Weeping no tears. What an enormous coincidence you have come ALL this way to investigate.',
				onLowHP: 'You see through me. Of course you do. The story has been waiting for you to.',
				onLethal: 'I will weep dry tears for myself, then. Strike.',
				onVictory: 'Hel keeps her guest. The story keeps its trickster.',
			},
			combatMusicId: 'shadow_root',
			bossPhases: [
				{
					hpPercent: 60,
					quip: 'I have worn so many faces. I have a few left.',
					flash: 'purple',
					effect: { type: 'enrage', value: 8 },
					description: 'Loki swaps disguises mid-fight',
				},
				{
					hpPercent: 25,
					quip: 'You are very brave for a creature whose god I just killed.',
					flash: 'red',
					effect: { type: 'damage_player', value: 12 },
					description: 'Loki turns vicious',
				},
			],
			victoryCinematic: [
				{ narration: 'The disguise slips. An old giantess melts into the long thin shape you knew was waiting underneath.', visualCue: 'A grey crone\u2019s face dissolving into Loki\u2019s smile.', musicId: 'shadow_root', durationHint: 10 },
				{ narration: '\u201cI did say I would weep dry tears,\u201d says Loki. \u201cYou are a very thorough investigator. I am almost flattered.\u201d', visualCue: 'A trickster god leaning back against the cave wall, examining a fingernail.', musicId: 'twilight_horn', durationHint: 10 },
				{ narration: 'You ride back to Asgard with the truth. The Aesir, when they hear it, do not say a word. They simply pick up iron and start walking.', visualCue: 'A column of grim gods marching out of Asgard, weapons in hand. No torchlight. No words.', musicId: 'ragnarok', durationHint: 10 },
			],
			defeatCinematic: [
				{ narration: 'Thokk weeps no tears. The cosmos has its one refusal. Baldr stays in Hel\u2019s hall forever. The light goes out of Asgard a little, and never comes back.', musicId: 'twilight_horn', durationHint: 10 },
			],
			storyBridge: [
				{ narration: 'The Aesir hunt Loki across the Nine Realms. He turns into a fish. They net the river. He turns into a hawk. They follow on Sleipnir. He runs for nine nights and nine days, laughing and crying at the same time. The story has been waiting for him to be caught. He cannot stay free of his own ending any more than the rest of them can.', musicId: 'shadow_root', durationHint: 14 },
			],
			rewards: [{ type: 'rune', amount: 100 }, { type: 'eitr', amount: 90 }],
			realm: 'helheim',
			campaignArmy: { king: 'king-surtr', queen: 'hero-hel', rook: 'hero-thryma', bishop: 'hero-frigg', knight: 'hero-hermod' },
			prerequisiteIds: ['twilight-5'],
		},

		// ─── Twilight 7: The Binding of Loki ─────────────────────────────
		// Loki caught. Bound under the earth with serpent venom dripping. Sigyn's bowl.
		{
			id: 'twilight-7', chapterId: 'twilight', missionNumber: 7,
			name: 'The Binding of Loki',
			description: 'The trickster is caught. He must be bound under the earth with the entrails of his own murdered son and a serpent dripping venom into his face. The hardest punishment in the cosmos. Make sure it lands.',
			narrativeBefore: 'Loki is caught by the river he tried to hide in, in the shape of a salmon. The Aesir, very quietly, drag him to a cave under the earth. They take Vali, Loki\u2019s own son, and turn him into a wolf. The wolf tears apart Loki\u2019s other son Narfi. From Narfi\u2019s entrails the gods make ropes that turn into iron the moment they touch Loki\u2019s skin. They tie him over three sharp stones \u2014 one under his shoulders, one under his back, one under his thighs \u2014 and then Skadi, ancient and patient, fastens a serpent to the ceiling of the cave so that its venom drips slowly onto Loki\u2019s face. His wife Sigyn, who has loved him through every betrayal, holds a wooden bowl over his face to catch the venom. When the bowl fills, she has to turn away to empty it. In those moments the venom strikes him and he convulses so hard the earth shakes and we call it earthquakes. This is the punishment that will hold until Ragnarok. You stand in the cave and make sure it is done. The trickster will, of course, fight every step of it.',
			narrativeAfter: 'The bonds tighten and turn to iron. The serpent is fastened. Sigyn takes up her wooden bowl and her thousand-year vigil begins. Loki, in the dark, says nothing for a long time. Then he says: \u201cThis is not the worst part. The worst part is when I get free. Tell them I said hello.\u201d The Aesir leave the cave. The world above stays quiet for an age. Every now and then a great earthquake rolls through the Nine Realms and you remember exactly where it came from.',
			narrativeVictory: 'The trickster is bound. The cosmos buys one more long age. Sigyn begins her watch.',
			narrativeDefeat: 'Loki slips the chains in the cave. He walks out, smiling. Ragnarok comes the next morning.',
			aiHeroId: 'hero-loki', aiHeroClass: 'rogue',
			aiDeckCardIds: [20001,20001,20003,20003,20004,20004,20020,20020,20100,20100,20102,20102,20103,20103,20105,20105,20107,20107,20109,20109,20111,20111,20113,20113,20114,20114,20115,20115,20204,20204],
			aiProfile: AI_PROFILES.loki,
			bossRules: [
				{ type: 'extra_health', value: 30, description: 'The cosmos cannot quite kill its trickster' },
				{ type: 'extra_mana', value: 1, description: 'Loki has had ages to plan this' },
			],
			bossQuips: {
				onCombatStart: 'Cousins. Brothers. Old drinking-friends. You are not really going to do this. Are you?',
				onLowHP: 'I have been the joke that holds the story together. Without me there is no story at all.',
				onLethal: 'Then bind me. But ask Sigyn how she will sleep tonight.',
				onVictory: 'Three stones. A serpent. A wife with a bowl. Tell Odin I said hello.',
			},
			combatMusicId: 'shadow_root',
			bossPhases: [
				{
					hpPercent: 70,
					quip: 'A salmon was the wrong choice. I should have been a hawk.',
					flash: 'purple',
					effect: { type: 'enrage', value: 9 },
					description: 'Loki shifts shape to slip the chains',
				},
				{
					hpPercent: 40,
					quip: 'You think this is what I deserve. You think THIS is the worst the cosmos can do to me.',
					flash: 'red',
					effect: { type: 'damage_player', value: 10 },
					description: 'Loki strikes back with fury',
				},
				{
					hpPercent: 15,
					quip: 'My WIFE will be sitting in the dark with a bowl for an AGE because of you. Are you proud?',
					flash: 'purple',
					effect: { type: 'damage_player', value: 8 },
					description: 'Loki uses Sigyn against you',
				},
			],
			victoryCinematic: [
				{ narration: 'The bonds turn to iron the moment they touch his skin. The serpent is fastened above his face. Sigyn lifts her wooden bowl and her thousand-year vigil begins.', visualCue: 'A bound god under three sharp stones. A woman in plain wool kneeling beside him with a wooden cup, infinitely patient.', musicId: 'shadow_root', durationHint: 14 },
				{ narration: 'In the dark Loki says: \u201cThis is not the worst part. The worst part is when I get free. Tell them I said hello.\u201d', visualCue: 'A trickster\u2019s smile in the dark. A drop of venom finding skin in the half-second the bowl is empty.', musicId: 'twilight_horn', durationHint: 12 },
			],
			defeatCinematic: [
				{ narration: 'Loki slips every chain. He walks out of the cave, dusts himself off, looks straight at you and says: \u201cThank you. Truly. The schedule was getting tedious.\u201d', visualCue: 'A god in dark green walking out of a cave mouth into a winter dawn that has come too early.', musicId: 'ragnarok', durationHint: 10 },
			],
			storyBridge: [
				{ narration: 'The cosmos goes very quiet for a long time. Sigyn does not move from her place. The serpent does not stop dripping. Every now and then the earth rolls and you remember exactly where it came from.', musicId: 'twilight_horn', durationHint: 10 },
				{ narration: 'And then one autumn the snow comes early. Then it comes again. Then it does not melt. The first sign of Fimbulvetr has arrived.', visualCue: 'Snow covering a road that should be in summer. A cold sun, very small, very far away.', musicId: 'twilight_horn', durationHint: 10 },
			],
			rewards: [{ type: 'rune', amount: 110 }, { type: 'eitr', amount: 100 }],
			realm: 'helheim',
			campaignArmy: { king: 'king-yggdrasil', queen: 'hero-sigyn', rook: 'hero-tyr', bishop: 'hero-vidar', knight: 'hero-skadi' },
			prerequisiteIds: ['twilight-6'],
		},

		// ─── Twilight 8: Fimbulvetr ──────────────────────────────────────
		// Three winters with no summer. Skoll and Hati eat the sun and moon.
		{
			id: 'twilight-8', chapterId: 'twilight', missionNumber: 8,
			name: 'Fimbulvetr',
			description: 'Three winters come without a summer between. The sun goes thin. Wolves chase the sun and moon across a sky going darker. Hold a small group of survivors together until the horn sounds.',
			narrativeBefore: 'Fimbulvetr is the great winter that comes before the end. Three years of snow without a thaw between them. The Nine Realms grow thin. Crops fail. Children freeze in their cradles. Brothers kill brothers for the warmth of a fire. Sons strike fathers down for a loaf of bread. The bonds of kinship that hold any society together \u2014 the only thing that ever held any of these realms together \u2014 begin to come apart in the cold. High in the sky, two wolves who have been chasing the sun and moon since the world was made finally start to catch them. Skoll runs at the heels of Sol the sun-goddess. Hati pursues Mani the moon-god. The light is going out of the world above. You lead a small group of survivors through the snow. Behind you, the cold is patient. In front of you, somewhere, the horn of Heimdall is waiting to be lifted to a god\u2019s lips.',
			narrativeAfter: 'Skoll catches Sol. Hati catches Mani. The sun and moon are devoured in a sky that has run out of mercy. The earth shakes with the first tremor of Loki\u2019s breaking free. The serpent stirs in its ocean. Far away, on a battered glacier road, a fire-giant lifts a sword that has been waiting for an age and turns south. Heimdall puts the great horn Gjallarhorn to his lips. The sound of it carries across all Nine Realms. Every god in Asgard hears it and goes very still. The day no one ever wanted to see has finally arrived. They put on their armor without speaking. They walk out of their golden halls for the last time.',
			narrativeVictory: 'You bring them through the worst winter in any story. The horn sounds. Whatever happens next, you will be there for it.',
			narrativeDefeat: 'The cold takes you. Your survivors are scattered. The horn sounds without you under it.',
			aiHeroId: 'hero-skadi', aiHeroClass: 'hunter',
			aiDeckCardIds: [20001,20001,20002,20002,20003,20003,20004,20004,20020,20020,20104,20104,20105,20105,20107,20107,20111,20111,20113,20113,20114,20114,20115,20115,20203,20203,20207,20207,20214,20214],
			aiProfile: AI_PROFILES.bergelmir,
			bossRules: [
				{ type: 'extra_health', value: 20, description: 'The wolves of the sky have been hungry an entire age' },
				{ type: 'extra_mana', value: 1, description: 'The cold is on every side' },
				{ type: 'passive_damage', value: 1, description: 'Fimbulvetr drains 1 HP from your hero each turn' },
			],
			bossQuips: {
				onCombatStart: 'Skoll. Hati. Run faster. Today the sky becomes a hunting ground.',
				onLowHP: 'You held a fire through three winters. You will not hold one through a fourth.',
				onLethal: 'Tell the moon I will see him on the way down.',
				onVictory: 'Three winters were always going to be enough.',
			},
			combatMusicId: 'twilight_horn',
			bossPhases: [
				{
					hpPercent: 75,
					quip: 'SKOLL! Now! While the goddess is tired!',
					flash: 'red',
					effect: { type: 'damage_player', value: 8 },
					description: 'Skoll catches Sol the sun',
				},
				{
					hpPercent: 50,
					quip: 'HATI! Bring down the moon!',
					flash: 'blue',
					effect: { type: 'damage_player', value: 8 },
					description: 'Hati catches Mani the moon',
				},
				{
					hpPercent: 25,
					quip: 'There is no light left to fear me by.',
					flash: 'purple',
					effect: { type: 'enrage', value: 12 },
					description: 'The dark closes in on all sides',
				},
			],
			victoryCinematic: [
				{ narration: 'Skoll catches Sol. The sun goes out like a torch in a winter wind. Hati catches Mani. The moon goes the same way an instant later. The sky has nothing left to remember its colors by.', visualCue: 'Two wolves swallowing two pale faces against a black sky.', musicId: 'twilight_horn', durationHint: 12 },
				{ narration: 'Far below, the earth shakes for the first time in an age. Loki has slipped his chains. The serpent stirs in the ocean. A fire-giant in the south lifts a sword that has been waiting for him.', visualCue: 'A bound god in a cave, ropes loosening. A coil under the sea moving for the first time in centuries. A figure in flame raising a blade.', musicId: 'ragnarok', durationHint: 12 },
				{ narration: 'And on the bridge of Bifrost, Heimdall puts Gjallarhorn to his lips and blows the note the cosmos has been waiting an entire age to hear.', visualCue: 'A horn the size of a tower. A note that is also a column of light reaching the highest hall in Asgard.', musicId: 'ragnarok', durationHint: 14 },
			],
			defeatCinematic: [
				{ narration: 'The cold takes you. Your survivors scatter into the dark. The horn of Heimdall sounds without you under it. The gods march into their last battle one comrade short.', musicId: 'ragnarok', durationHint: 9 },
			],
			storyBridge: [
				{ narration: 'You walk out of the long winter with a small handful of survivors and a borrowed horse. The horn is still sounding when you reach Asgard. Every god you ever knew is putting on armor in silence.', musicId: 'ragnarok', durationHint: 12 },
				{ narration: 'Odin meets you at the gate. He looks much older than you remember. He says: \u201cThank you for coming back. Stand on my left. The wolf has always been on my right.\u201d', visualCue: 'A one-eyed king in armor older than nations. He places a hand on your shoulder. He looks ahead, not at you.', musicId: 'ragnarok', durationHint: 12 },
			],
			rewards: [{ type: 'rune', amount: 130 }, { type: 'card', cardId: 20300 }, { type: 'eitr', amount: 120 }],
			realm: 'midgard',
			campaignArmy: { king: 'king-yggdrasil', queen: 'hero-freya', rook: 'hero-tyr', bishop: 'hero-frigg', knight: 'hero-vidar' },
			prerequisiteIds: ['twilight-7'],
		},

		// ─── Twilight 9: RAGNAROK ────────────────────────────────────────
		// THE FINALE. Heimdall vs Loki. Thor vs Jormungandr. Odin vs Fenrir.
		// Vidar avenges his father. Surtr burns the world.
		{
			id: 'twilight-9', chapterId: 'twilight', missionNumber: 9,
			name: 'Ragnarok',
			description: 'The Twilight of the Gods. Every duel that prophecy has been waiting an entire age to see. Thor against the Serpent. Heimdall against Loki. Odin against the wolf. The world ends. The world begins again.',
			narrativeBefore: 'The horn of Heimdall sounds across all Nine Realms. From the east sails Naglfar \u2014 the ship of the dead, built from the untrimmed fingernails of every corpse since the first death, its hull pale as bone, its crew the dishonored dead of Hel\u2019s domain. Hrym the giant stands at its helm. From the south rides Surtr and the sons of Muspelheim, fire dripping from their blades. Jormungandr rises from the sea and the poison in its breath kills the clouds. The gods march out of Asgard for the last time. Across Bifrost they cross \u2014 and the rainbow bridge shatters under the weight of Surtr\u2019s host, falling in shards of burning color into the void. On the field of Vigrid, every duel the prophecy ever named will be fought. Thor will go to find Jormungandr. Heimdall will go to find Loki. Odin will go to find Fenrir. Frey will go to meet Surtr, and remember too late that he traded his only sword for the love of the giantess Gerdr. Tyr the one-handed will meet Garm the hellhound and they will kill each other. Vidar, the silent god, will be standing very close to his father at the moment Fenrir\u2019s jaws open. The cosmos will burn. And then \u2014 if you do this well enough \u2014 the cosmos will start again, green from the sea. You stand on Vigrid in armor heavy enough to remember every dead friend you brought with you. The horn is still sounding. Pick your duel.',
			narrativeAfter: 'Thor and Jormungandr kill each other on the field. Thor takes nine steps from the serpent\u2019s body before the venom drops him. Heimdall and Loki kill each other within sight of the rainbow bridge. Tyr and Garm finish their long contract together. Frey is cut down by Surtr because his great sword was given for a kiss an age ago. Odin walks straight up to Fenrir, looks the wolf in the eye, and is swallowed in a single motion that no song will ever be able to describe. Then Vidar, the silent son, who has been wearing one shoe with a sole made from the leather scraps of every shoemaker in the cosmos, plants that shoe in the wolf\u2019s lower jaw and tears the wolf\u2019s upper jaw off with his bare hands. He does not say a word. He never has and he never will. Surtr finishes the job he came to do. Fire takes everything. The sky breaks. The Nine Realms drown in flame. And then, in a green field that wasn\u2019t there an instant ago, Vidar opens his eyes. Vali opens his eyes. Magni and Modi, Thor\u2019s sons, find Mjolnir lying in the new grass and pick it up between them. Baldr walks out of the road from Hel with Hod beside him, the two brothers reconciled. Two humans named Lif and Lifthrasir crawl out from inside the trunk of Hoddmimir\u2019s grove, blinking in a sun the color of new gold. Whatever you fought for, you fought for them. The cosmos starts again.',
			narrativeVictory: 'You stood on Vigrid until the fire took everything. And then \u2014 because you stood \u2014 the world started again, green from the sea.',
			narrativeDefeat: 'You fall before Surtr lifts his sword. The world ends without you. Whatever comes after, you are not in it.',
			aiHeroId: 'hero-loki', aiHeroClass: 'rogue',
			aiDeckCardIds: [20001,20001,20002,20002,20003,20003,20004,20004,20020,20020,20100,20100,20102,20102,20103,20103,20105,20105,20107,20107,20111,20111,20113,20113,20114,20114,20115,20115,20204,20204],
			aiProfile: AI_PROFILES.loki,
			bossRules: [
				{ type: 'extra_health', value: 40, description: 'The end of the world has 140 HP and three of its own armies' },
				{ type: 'extra_mana', value: 2, description: 'Surtr brings the fires of Muspelheim' },
				{ type: 'bonus_draw', value: 1, description: 'Prophecy gives the enemy an extra card' },
				{ type: 'passive_damage', value: 2, description: 'The world is ending. 2 damage every turn.' },
			],
			bossQuips: {
				onCombatStart: 'I told you. The worst part was when I got free. WELCOME to the worst part.',
				onLowHP: 'You are doing very well. You will still die here. The story HAS to end. You knew that.',
				onLethal: 'Beautiful. The story finishes the way it always was going to. SEE you in the new world, friend. Maybe.',
				onVictory: 'Take a breath. Look up. There is no sky left.',
			},
			combatMusicId: 'ragnarok',
			bossPhases: [
				{
					hpPercent: 80,
					quip: 'THOR! BROTHER! Step into the serpent\u2019s breath! The cosmos has been waiting!',
					flash: 'green',
					effect: { type: 'damage_player', value: 10 },
					description: 'Thor and Jormungandr kill each other',
				},
				{
					hpPercent: 60,
					quip: 'TYR! GARM! Old enemies. Long contract. END IT.',
					flash: 'red',
					effect: { type: 'damage_player', value: 10 },
					description: 'Tyr and Garm finish each other',
				},
				{
					hpPercent: 40,
					quip: 'ODIN. Look at me, brother. Look UP. Look at the WOLF.',
					flash: 'gold',
					effect: { type: 'damage_player', value: 14 },
					description: 'Fenrir swallows Odin',
				},
				{
					hpPercent: 20,
					quip: 'And then, of course \u2014 SURTR, brother, do you have a moment?',
					flash: 'red',
					effect: { type: 'enrage', value: 15 },
					description: 'Surtr the fire-giant raises his sword',
				},
			],
			victoryCinematic: [
				{ narration: 'Vidar plants his impossible shoe in Fenrir\u2019s lower jaw and tears the wolf\u2019s upper jaw off with his bare hands. He does not say a word. He never has and he never will.', visualCue: 'A silent god in a single shoe ripping the head of a wolf in half. Slow motion. No sound but bone.', musicId: 'ragnarok', durationHint: 14 },
				{ narration: 'Heimdall and Loki kill each other within sight of the rainbow bridge. Two old colleagues who always knew this was coming.', visualCue: 'A golden god and a green-cloaked one collapsing into each other on a bridge of fading colors.', musicId: 'ragnarok', durationHint: 10 },
				{ narration: 'Thor takes nine steps from the body of the serpent before the venom finishes him. Each step is the size of a kingdom. He goes down with a small surprised look on his face, like he has just remembered the joke.', visualCue: 'A red-bearded god walking through poison fog, taking step after impossible step. Then folding.', musicId: 'ragnarok', durationHint: 14 },
				{ narration: 'Surtr stretches his sword across the sky. Fire takes everything. The Nine Realms drown in flame. The world ends.', visualCue: 'A horizon of pure fire. Forests, halls, mountains, all collapsing into the same orange light.', musicId: 'ragnarok', durationHint: 12 },
				{ narration: 'And then \u2014 a long pause \u2014 a green field. Grass that has never been walked on. Vidar opens his eyes. Vali opens his eyes. Magni and Modi, Thor\u2019s sons, find Mjolnir lying in the new grass and pick it up between them.', visualCue: 'Quiet wind. A small bird. A patch of green field unmarked by anything. Four young gods waking together.', musicId: 'rebirth', durationHint: 14 },
				{ narration: 'On a road from Hel, Baldr walks out into the new sun with Hod beside him. The two brothers do not speak \u2014 they will have all the time in the new world to. Behind them the road closes for good.', visualCue: 'A radiant young god and his blind brother walking out of the dark hand in hand.', musicId: 'rebirth', durationHint: 14 },
				{ narration: 'And from inside the trunk of Hoddmimir\u2019s grove, two humans named Lif and Lifthrasir crawl out blinking. They are the children of the new world. They will name a thousand things between now and the next end of the world. They are looking at YOU.', visualCue: 'Two figures crawling out of an enormous tree-trunk into golden light. They look up. They look at you. They smile.', musicId: 'rebirth', durationHint: 16 },
				{ narration: 'You did it. You stood on Vigrid until the fire took everything. And because you stood, the world started again. The next saga is theirs. But the saga of the Aesir \u2014 your saga \u2014 is finished. Rest now, hero of two worlds.', musicId: 'rebirth', durationHint: 14 },
			],
			defeatCinematic: [
				{ narration: 'Surtr crosses the field. His sword stretches the length of the horizon. There is no place for any of you to stand any more. You fall, and the cosmos falls with you, and that is the end of the story.', visualCue: 'Fire taking everything in slow, total silence.', musicId: 'ragnarok', durationHint: 10 },
				{ narration: 'No green field. No new sun. No two children crawling out of a tree. The cosmos was a fire that burned itself out alone in the dark.', musicId: 'ragnarok', durationHint: 8 },
			],
			rewards: [{ type: 'rune', amount: 500 }, { type: 'card', cardId: 20300 }, { type: 'pack', amount: 5 }, { type: 'eitr', amount: 250 }],
			realm: 'midgard',
			campaignArmy: { king: 'king-yggdrasil', queen: 'hero-freya', rook: 'hero-tyr', bishop: 'hero-vidar', knight: 'hero-thor' },
			prerequisiteIds: ['twilight-8'],
			starThresholds: { threeStar: 18, twoStar: 28 },
			isChapterFinale: true,
		},
	],
};
