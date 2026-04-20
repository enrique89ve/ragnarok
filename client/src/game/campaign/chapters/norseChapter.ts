import type { CampaignChapter } from '../campaignTypes';
import { AI_PROFILES } from '../campaignTypes';

export const norseChapter: CampaignChapter = {
	id: 'norse',
	name: 'Echoes of Ymir',
	faction: 'norse',
	description: 'Witness the birth of the cosmos — from the yawning void of Ginnungagap to Ymir\'s slaying, the forging of the Nine Realms from his body, and the wars that followed. The Prose Edda unfolds in blood and creation.',
	chapterReward: [{ type: 'pack', amount: 3 }, { type: 'rune', amount: 200 }],
	cinematicIntro: {
		title: 'The Primordial Blood',
		style: 'Diablo-style dark fantasy CGI — sweeping camera, slow-motion violence, heavy orchestral score with Norse throat-singing, war horns, and deep bass drums. 3:30 runtime. Gravelly, ancient narrator.',
		scenes: [
			{
				narration: 'In the beginning... there was only the Ginnungagap. The yawning void. From the north came the venomous ice of Niflheim. From the south, the ravenous fire of Muspelheim. Where they met... life awoke in agony.',
				visualCue: 'Infinite darkness. Crashing walls of ice and flame collide in slow motion. Poisonous mist boils. Camera pushes through the chaos.',
				musicCue: 'Low, ominous strings. Distant howling wind.',
				durationHint: 15,
			},
			{
				narration: 'First came Ymir — the frost giant, father of all jotnar. Evil and vast, he spawned his kind from sweat and filth. His hunger knew no end.',
				visualCue: 'Massive, grotesque Ymir rising, eyes glowing blue-white. Frost giants claw out of his armpits and legs, roaring. He drinks from the void.',
				musicCue: 'Deep bass drums, building dread.',
				durationHint: 12,
			},
			{
				narration: 'But the gods sent forth Audumbla — the great cow of creation. Her milk fed the giant... while her tongue carved order from the ice.',
				visualCue: 'Majestic black cow appears in golden light. She licks massive salt-ice blocks. Over three days: hair, head, then full figure of Buri emerges — tall, fair, bearded, eyes like storm clouds. He stands powerful, unafraid.',
				musicCue: 'Golden horns, a moment of hope.',
				durationHint: 14,
			},
			{
				narration: 'Buri, the first of the Aesir. Mighty progenitor. He sired Borr — bridge between old blood and new.',
				visualCue: 'Quick montage: Buri alone in the ice. Flash of divine light. Borr appears — rugged, determined. He takes giantess Bestla as wife. Their three sons born in firelight: young Odin (one eye already sharp), Vili, Ve. They watch the giants multiply with growing dread.',
				musicCue: 'Strings build tension.',
				durationHint: 12,
			},
			{
				narration: 'The giants grew bold. Their chaos swallowed the void. Ymir\'s horde threatened to drown all that could be. So the old gods chose war.',
				visualCue: 'Camera sweeps across frozen battlefield. Buri and Borr, armored in crude bone and ice, stand with their grown sons. Buri raises a massive spear. Borr grips a jagged axe.',
				musicCue: 'War drums swell. Norse throat-singing begins.',
				durationHint: 10,
			},
			{
				narration: 'Buri and Borr led the charge — grandfather and father — so their sons might inherit a world.',
				visualCue: 'Epic battle sequence — brutal slow-mo: Buri charges through frost giants, spear flashing, slaying dozens. Ymir roars, swings a club the size of a mountain. Buri leaps, stabs Ymir\'s thigh — blood sprays like a geyser. Ymir backhands him. Buri crashes, broken but defiant. Borr roars, protects his sons, hacks at Ymir\'s leg. Ymir impales him through the chest with a frost shard. Borr gasps, still swinging as he dies.',
				musicCue: 'Full orchestra, crescendo of brass and drums.',
				durationHint: 45,
			},
			{
				narration: 'Buri fell first — the elder\'s sacrifice. Borr followed, shielding his bloodline with his final breath.',
				visualCue: 'Camera lingers on their bodies amid the chaos — heroic, bloodied, eyes open to the void.',
				musicCue: 'Strings soften, grieving tone.',
				durationHint: 8,
			},
			{
				narration: 'Then the sons of Borr answered.',
				visualCue: 'Odin, Vili, and Ve leap as one. Odin drives Gungnir straight into Ymir\'s throat. The giant screams — the sound shakes the heavens.',
				musicCue: 'Rising fury, drums and brass.',
				durationHint: 6,
			},
			{
				narration: 'Ymir fell. And with him... everything.',
				visualCue: 'Slow-motion cataclysm: Ymir collapses. An ocean of blood explodes outward — red tsunami. Giants drown screaming, dragged under. Audumbla stands on a shrinking ice floe, lowing mournfully one last time as she tries to lick a final block of creation. The crimson wave engulfs her. Her eyes close. She sinks.',
				musicCue: 'Choir and deep bass, apocalyptic.',
				durationHint: 18,
			},
			{
				narration: 'Even the primordial cow — mother of beginnings — perished in the flood of endings.',
				visualCue: 'The blood recedes. Ymir\'s colossal corpse lies across the void.',
				musicCue: 'Solemn silence, then soft strings.',
				durationHint: 6,
			},
			{
				narration: 'From the enemy\'s body the brothers forged the Nine Realms. Flesh became earth. Blood became sea. Bones became mountains. Skull became sky. Brains became clouds. And from the spark of their fathers\' sacrifice... Midgard and Asgard rose.',
				visualCue: 'Montage of creation: Land rising, trees sprouting, sun and moon placed in the sky. Odin stands alone on a new mountain peak, wind whipping his cloak, two ravens circling. He looks back at the battlefield where Buri and Borr\'s bodies have become part of the new world — subtle silhouettes in the stone.',
				musicCue: 'Majestic horn theme, hopeful but bittersweet.',
				durationHint: 20,
			},
			{
				narration: 'Thus the gods were born in blood and loss. The first gods gave their lives... so that we might have ours. But the giants remember the slaughter. Bergelmir survived.',
				visualCue: 'Final shot: a lone frost giant drifting on a blood-soaked log, eyes burning with hatred, fading into darkness.',
				musicCue: 'Single low note, ominous. Fade to black.',
				durationHint: 12,
			},
		],
	},
	missions: [

		// ─── Chapter 1: Void's Awakening ─────────────────────────────────
		// Ginnungagap → Niflheim Ice Wastes
		// Lore: Niflheim ice + Muspelheim fire → Ymir emerges, spawns jotnar
		// Audumbla licks Buri free; Buri sires Borr; Borr's sons mature
		{
			id: 'norse-1', chapterId: 'norse', missionNumber: 1,
			name: 'Void\'s Awakening',
			description: 'Survive the primordial chaos where ice and fire first collided.',
			narrativeBefore: 'Before the worlds, before time, there was only Ginnungagap — the yawning void. From the north poured the venomous rivers of Niflheim, eleven freezing streams called Elivagar. From the south roared the sparks and embers of Muspelheim. Where ice met flame, the rime thawed and dripped with life. Ymir, first of the frost giants, rose from the poisoned meltwater. His children clawed from his body — born of sweat and filth. Among the chaos, a primordial cow named Audumbla emerged, her milk sustaining the giant. But as she licked the salt-ice, she carved free something the giants never expected: Buri, grandfather of the gods. You are the echo of that first defiance — life refusing to bow to the void.',
			narrativeAfter: 'The ice caves grow quiet. The first jotnar have fallen, but Ymir himself stirs in the distance, vast and terrible. Buri\'s bloodline flows in your veins — the defiance that carved order from chaos. Audumbla lows in the distance, still licking ice, still creating. The war for existence has only begun.',
			narrativeVictory: 'The void\'s children cannot extinguish what Audumbla freed from the ice. You carry Buri\'s spark.',
			narrativeDefeat: 'The primordial cold reclaims you. Without Buri\'s heirs, the void would have swallowed all.',
			aiHeroId: 'hero-thor', aiHeroClass: 'warrior',
			aiDeckCardIds: [20001,20001,20002,20002,20003,20003,20004,20004,20005,20005,20010,20010,20011,20011,20012,20012,20013,20013,20014,20014,20015,20015,20020,20020,20021,20021,20022,20022,20023,20023],
			aiProfile: AI_PROFILES.easy, bossRules: [], prerequisiteIds: [],
			bossQuips: {
				onCombatStart: 'You should not exist. The void has no place for warmth.',
				onLowHP: 'Even ice... can be broken.',
				onLethal: 'Audumbla\u2019s tongue did its work too well. So be it.',
				onVictory: 'The void was patient. The void was wrong.',
			},
			combatMusicId: 'primordial_dread',
			victoryCinematic: [
				{ narration: 'The frost-thing falls. Its cry echoes once across the void and is gone.', visualCue: 'Slow-motion shatter of an ice giant collapsing. Crystals drift through black space.', musicId: 'primordial_dread', durationHint: 7 },
				{ narration: 'Audumbla lows from the dark, her tongue still working at the salt-ice. Whatever she carves free will inherit a world.', visualCue: 'A great pale cow in low golden light. Salt-ice cracks. A figure stirs within.', musicId: 'forge_anvil', durationHint: 9 },
			],
			defeatCinematic: [
				{ narration: 'The cold reaches you. You do not even have a name yet — only the memory of warmth, fading.', visualCue: 'Ice closing over a kneeling figure. Black void presses in from every side.', musicId: 'primordial_dread', durationHint: 8 },
				{ narration: 'Without you, Buri\u2019s line never wakes. The void remains formless, and remains.', durationHint: 6 },
			],
			storyBridge: [
				{ narration: 'You hold the line through one cold age, then another. Audumbla\u2019s tongue works the salt-ice without rest.', musicId: 'forge_anvil', durationHint: 8 },
				{ narration: 'And then\u2014a head. A shoulder. A man, naked and steaming in the cold. Buri stands.', visualCue: 'Buri emerges from a pillar of ice, breath fogging.', durationHint: 8 },
				{ narration: 'Buri sires Borr. Borr takes Bestla, daughter of giants. Three sons are born to them: Odin, Vili, Ve. The fight that comes next is the one all the gods are born for.', musicId: 'jotun_rage', durationHint: 10 },
			],
			rewards: [{ type: 'rune', amount: 20 }],
			realm: 'ginnungagap',
			campaignArmy: { king: 'king-ginnungagap', queen: 'hero-sinmara', rook: 'hero-thryma', bishop: 'hero-ran', knight: 'hero-gormr' },
		},
		{
			id: 'norse-2', chapterId: 'norse', missionNumber: 2,
			name: 'The Blood of Ymir',
			description: 'The sons of Borr challenge Ymir himself — father of all giants.',
			narrativeBefore: 'Buri, the first god, fell to Ymir\'s fury — pierced by frost-shards in the primordial war. Borr, his son, died shielding his three boys with his final breath. Now Odin, Vili, and Ve — the sons of Borr — stand alone against the cosmic giant whose children outnumber the stars. Ymir\'s chaos cannot be allowed to continue. The void must be given shape, and shape demands sacrifice. You fight alongside the brothers in the battle that creates the world. There is no retreat — behind you is only the void.',
			narrativeAfter: 'Ymir falls. The ground shakes as the colossus crashes into the void. An ocean of blood erupts from the wound — a crimson flood that drowns nearly every giant in existence. Audumbla, the primordial cow who birthed creation with her tongue, stands on a shrinking ice floe. She lows once — mournful, accepting — and the red tide swallows her. Even mothers of beginnings are not spared the flood of endings. But one giant survives: Bergelmir, clutching a blood-soaked log, drifting into darkness. His eyes burn with a hatred that will outlast the cosmos.',
			narrativeVictory: 'Ymir is slain. The flood of his blood drowns the old world. From this death, everything will be born.',
			narrativeDefeat: 'Ymir\'s fist closes. The void remains formless. Creation itself dies stillborn.',
			aiHeroId: 'hero-thorgrim', aiHeroClass: 'warrior',
			aiDeckCardIds: [20001,20001,20003,20003,20004,20004,20100,20100,20104,20104,20107,20107,20110,20110,20111,20111,20114,20114,20115,20115,20116,20116,20201,20201,20204,20204,20210,20210,20305,20305],
			aiProfile: AI_PROFILES.ymir,
			bossRules: [
				{ type: 'extra_health', value: 30, description: 'Ymir has 130 health — primordial giant' },
				{ type: 'start_with_minion', cardId: 20003, description: 'Ymir spawns frost-giant offspring at start' },
			],
			bossQuips: {
				onCombatStart: 'I AM the cold. I AM the hunger. You are an echo that has not yet learned to fall silent.',
				onLowHP: 'My blood will drown your world. EVEN MY DEATH... shapes the cosmos.',
				onLethal: 'Strike, then. The cosmos was always going to be made from a corpse.',
				onVictory: 'Your tiny names will not outlast me. Nothing does.',
			},
			combatMusicId: 'jotun_rage',
			bossPhases: [
				{
					hpPercent: 75,
					quip: 'You bleed me — and I drink from the void to refill the wound.',
					flash: 'blue',
					effect: { type: 'heal_self', value: 15 },
					description: 'Ymir feeds on the void (Phase I)',
				},
				{
					hpPercent: 40,
					quip: 'Enough! The first scream of creation answers ME.',
					flash: 'red',
					effect: { type: 'damage_player', value: 8 },
					description: 'Ymir roars — primordial scream (Phase II)',
				},
			],
			victoryCinematic: [
				{ narration: 'Odin\u2019s spear finds Ymir\u2019s throat. The giant goes still as a felled mountain.', visualCue: 'Gungnir punches through a colossal frost-throat. Eyes the size of moons go dark. Silence.', musicId: 'jotun_rage', durationHint: 8 },
				{ narration: 'And then the wound opens.', visualCue: 'A black slit in the giant\u2019s throat begins to widen. Pressure builds.', musicId: 'primordial_dread', durationHint: 5 },
				{ narration: 'A red ocean explodes outward. The blood of the first being floods the void.', visualCue: 'A crimson tsunami rolls outward in slow motion. Frost giants drown screaming, dragged under in their thousands.', musicId: 'jotun_rage', durationHint: 12 },
				{ narration: 'Audumbla, mother of beginnings, lows once on a shrinking ice floe. The flood takes her too. Even the cow of creation perishes in the flood of endings.', visualCue: 'A single golden shape on a vanishing white island. The red wave crashes over her. Her eyes close.', musicId: 'twilight_horn', durationHint: 12 },
				{ narration: 'On a hollowed log, one giant survives. Bergelmir clutches his wife. He watches everything he loves drown. He remembers your face.', visualCue: 'A silhouette on a blood-soaked log, eyes burning, drifting into darkness.', musicId: 'jotun_rage', durationHint: 10 },
			],
			defeatCinematic: [
				{ narration: 'Ymir\u2019s fist closes around the sons of Borr. Their light goes out together.', visualCue: 'A colossal blue-white hand crushing inward in slow motion.', musicId: 'jotun_rage', durationHint: 8 },
				{ narration: 'No corpse. No realms. No story. The void keeps everything it ever had.', musicId: 'primordial_dread', durationHint: 7 },
			],
			storyBridge: [
				{ narration: 'Three brothers, soaked to the elbows in cosmic blood, look at the corpse of the universe and decide: this will be a place worth living in.', visualCue: 'Odin, Vili, and Ve standing on Ymir\u2019s shoulder, mantled in red. They begin to cut.', musicId: 'forge_anvil', durationHint: 10 },
				{ narration: 'Flesh becomes earth. Blood becomes sea. Bones become mountains. Skull becomes the dome of the sky. From Ymir\u2019s hair the first forests grow, and from those primordial trees Yggdrasil takes root.', visualCue: 'Sweeping montage: rivers carving, mountains rising, the World Tree thrusting up through a new horizon.', musicId: 'aesir_triumph', durationHint: 14 },
				{ narration: 'Far away, on a log of Ymir\u2019s ribs, Bergelmir washes ashore. He buries his face in his wife\u2019s hair and swears the oldest oath in the cosmos.', musicId: 'jotun_rage', durationHint: 8 },
			],
			prerequisiteIds: ['norse-1'],
			rewards: [{ type: 'rune', amount: 40 }, { type: 'card', cardId: 20200 }],
			realm: 'ginnungagap',
			campaignArmy: { king: 'king-ymir', queen: 'hero-sinmara', rook: 'hero-thorgrim', bishop: 'hero-ran', knight: 'hero-skadi' },
		},

		// ─── Chapter 2: Forging the Worlds ───────────────────────────────
		// Ymir's body → world creation
		// Flesh=earth, blood=seas, bones=mountains, skull=sky
		// Yggdrasil sprouts from hair-trees; Bergelmir vows vengeance
		{
			id: 'norse-3', chapterId: 'norse', missionNumber: 3,
			name: 'Forging the Worlds',
			description: 'Shape the Nine Realms from Ymir\'s corpse as Bergelmir\'s remnants attack.',
			narrativeBefore: 'Ymir\'s body spans the void like a fallen continent. Odin, Vili, and Ve set to work with divine purpose: his flesh becomes the earth of Midgard, his blood fills the seas and rivers, his bones rise as mountains, his skull is lifted to form the sky — held by four dwarves at its corners — and his brains scatter as clouds. From the sparks of Muspelheim they set the sun and moon in their courses, chased forever by the wolves Skoll and Hati. From Ymir\'s hair spring the first forests, and from those primordial trees, Yggdrasil — the World Tree — takes root, its branches reaching through all realms, its roots drinking from three sacred wells. But the blood-flood did not kill every giant. Bergelmir survived on his hollowed log, and his descendants gather among the new mountains, swearing vengeance for the father of their race.',
			narrativeAfter: 'Bergelmir retreats into the new-formed mountains of Jotunheim, dragging his wounded kin with him. The world takes shape around you — mountains rising, rivers carving paths, the great tree Yggdrasil groaning as it stretches through the fresh-born realms. But Bergelmir\'s oath echoes across the stone: the giants will never forget what the gods did to Ymir. The feud is eternal.',
			narrativeVictory: 'The remnant giants scatter. The Nine Realms take form from Ymir\'s sacrifice — bone, blood, and sky.',
			narrativeDefeat: 'Bergelmir\'s kin reclaim the corpse. The worlds remain unformed — raw meat and blood in the void.',
			aiHeroId: 'hero-njord', aiHeroClass: 'shaman',
			aiDeckCardIds: [20004,20004,20020,20020,20100,20100,20103,20103,20106,20106,20107,20107,20109,20109,20112,20112,20113,20113,20200,20200,20206,20206,20208,20208,20211,20211,20301,20301,20304,20304],
			aiProfile: AI_PROFILES.bergelmir,
			bossRules: [
				{ type: 'extra_health', value: 15, description: 'Bergelmir has 115 health — survivor of the blood-flood' },
			],
			bossQuips: {
				onCombatStart: 'You are the children of Audumbla\u2019s killer. I am the child of the drowned. Today the world begins again \u2014 in MY blood, not yours.',
				onLowHP: 'My grandfather\u2019s body is still warm beneath your feet. Walk carefully.',
				onLethal: 'Then take me. Let the mountains remember a second drowning.',
				onVictory: 'There. The story will not say you died easy.',
			},
			combatMusicId: 'jotun_rage',
			bossPhases: [
				{
					hpPercent: 60,
					quip: 'Bergelmir\u2019s spear hardens with the rime of his oath \u2014 the cold loves the wronged.',
					flash: 'blue',
					effect: { type: 'add_armor', value: 8 },
					description: 'Bergelmir hardens with the cold of his grief',
				},
				{
					hpPercent: 30,
					quip: 'Hear me, Ymir-father. Today I bring you sons.',
					flash: 'red',
					effect: { type: 'enrage', value: 10 },
					description: 'Bergelmir invokes his ancestor\u2019s rage',
				},
			],
			victoryCinematic: [
				{ narration: 'Bergelmir falls back into the new mountains, dragging his wounded kin. He does not die today \u2014 the cosmos has too long a memory for that.', visualCue: 'A wounded jotun retreating across a ridgeline, leaving frost-blood on the new stone.', musicId: 'jotun_rage', durationHint: 10 },
				{ narration: 'And the world keeps building. Yggdrasil drinks from three wells \u2014 Urd of fate, Mimir of wisdom, Hvergelmir of all rivers \u2014 and grows.', visualCue: 'The World Tree stretching into a sky still raw with creation. Three wells glow at its roots.', musicId: 'forge_anvil', durationHint: 12 },
			],
			defeatCinematic: [
				{ narration: 'Bergelmir reclaims the corpse. The brothers are pried apart. The Nine Realms remain raw meat in the void, and the giants make of them whatever they like.', musicId: 'jotun_rage', durationHint: 10 },
			],
			storyBridge: [
				{ narration: 'Time begins to mean something. Mountains wear themselves smooth a little. The seas sort themselves into shores. Yggdrasil pushes a single golden leaf into the new sky.', visualCue: 'Wide pan over the freshly-made world: forests greening, rivers cutting valleys.', musicId: 'forge_anvil', durationHint: 10 },
				{ narration: 'And on a beach where the sea has never yet known a human footprint, two driftwood logs wash ashore. An ash. An elm.', visualCue: 'Two long pale logs sliding to rest on dark sand. Three god-shaped silhouettes approach.', musicId: 'aesir_triumph', durationHint: 8 },
			],
			prerequisiteIds: ['norse-2'],
			rewards: [{ type: 'rune', amount: 35 }, { type: 'eitr', amount: 50 }],
			realm: 'midgard',
			campaignArmy: { king: 'king-brimir', queen: 'hero-hel', rook: 'hero-valthrud', bishop: 'hero-njord', knight: 'hero-aegir' },
		},

		// ─── Chapter 3: Breath of Life ───────────────────────────────────
		// Ask & Embla — first humans from driftwood
		// Odin=breath/spirit, Vili=intellect, Ve=senses
		// Player as descendant of Ask/Embla awakens
		{
			id: 'norse-4', chapterId: 'norse', missionNumber: 4,
			name: 'Breath of Life',
			description: 'Protect the first humans as giant raiders descend on newborn Midgard.',
			narrativeBefore: 'Walking the shore of the new-formed world, the three brothers find two trees washed upon the sand — an ash and an elm. Odin breathes life and spirit into them. Vili grants intellect and feeling. Ve gives them senses, speech, and fair appearance. The ash becomes Ask — the first man. The elm becomes Embla — the first woman. From their union, all humanity descends. But Midgard is young and undefended. Bergelmir\'s scouts have crossed the mountain borders of Jotunheim, probing the soft earth with frost-hardened boots. They come not for conquest — not yet — but to test whether these fragile new creatures are worth destroying. You are the blood of Ask and Embla. Defend what the gods gave breath.',
			narrativeAfter: 'The giant scouts withdraw, but their report will reach Bergelmir: humanity is small, fragile, and defended only by divine echoes. The brothers have given you life, but survival is your own burden. Midgard\'s first villages rise along the shore where Ask and Embla drew their first breaths.',
			narrativeVictory: 'The children of Ask and Embla endure. Humanity\'s first breath will not be its last.',
			narrativeDefeat: 'The giants trample the shore where Ask and Embla stood. The first humans are dust before their story begins.',
			aiHeroId: 'hero-skadi', aiHeroClass: 'hunter',
			aiDeckCardIds: [20004,20004,20020,20020,20100,20100,20103,20103,20108,20108,20109,20109,20111,20111,20112,20112,20116,20116,20202,20202,20205,20205,20208,20208,20214,20214,20215,20215,20301,20301],
			aiProfile: AI_PROFILES.medium,
			bossRules: [],
			bossQuips: {
				onCombatStart: 'These two? Soft as the bark on their dead trees. The mountain takes back what it shaped.',
				onLowHP: 'You guard them well, child of Ask. Pity they\u2019ll outlive you by an afternoon.',
				onLethal: 'The first hunt was always going to end this way.',
				onVictory: 'Hmph. Maybe the saplings have teeth after all.',
			},
			combatMusicId: 'jotun_rage',
			victoryCinematic: [
				{ narration: 'Skadi melts into the tree-line. She has not lost \u2014 a Skadi never loses, only ends a hunt and starts another \u2014 but today she leaves the shore alone.', visualCue: 'A figure in pale fur slipping back into a black forest. Tracks fading in fresh snow.', musicId: 'jotun_rage', durationHint: 10 },
				{ narration: 'Ask and Embla dare to lift their heads. The first man and the first woman look at each other for the first time. They will name a thousand things between now and the end of the world.', visualCue: 'Two people in driftwood-rough skin, holding hands at the edge of the new sea.', musicId: 'aesir_triumph', durationHint: 12 },
			],
			defeatCinematic: [
				{ narration: 'The frost rolls back over the shore. Ask and Embla never speak. The first humans become the first dead, and the line that should have been yours never was.', musicId: 'twilight_horn', durationHint: 9 },
			],
			storyBridge: [
				{ narration: 'Generations crawl by like the slow drift of stars. Villages cluster on the new coasts. Children of Ask and Embla light fires, name gods, lose teeth, dream of giants in the dark of every winter.', musicId: 'forge_anvil', durationHint: 10 },
				{ narration: 'High above, on a sky that is also a skull, the gods begin to lay foundations. They are building something that has never existed: a place safe from the cold.', visualCue: 'A vast construction site in the clouds, scaffolding and stone, gods walking among workers.', musicId: 'aesir_triumph', durationHint: 8 },
			],
			prerequisiteIds: ['norse-3'],
			rewards: [{ type: 'rune', amount: 30 }],
			realm: 'midgard',
			campaignArmy: { king: 'king-surtr', queen: 'hero-sinmara', rook: 'hero-logi', bishop: 'hero-gerd', knight: 'hero-skadi' },
		},

		// ─── Chapter 4: Halls of the Aesir ───────────────────────────────
		// Gods build Asgard — Gladsheim, Valaskjalf, Hlidskjalf
		// Ongoing giant probes repelled; rune trials
		{
			id: 'norse-5', chapterId: 'norse', missionNumber: 5,
			name: 'Halls of the Aesir',
			description: 'Aid the gods in building Asgard while repelling the jotnar vanguard.',
			narrativeBefore: 'High above Midgard, upon Ymir\'s skull-sky, the Aesir raise Asgard — the fortress of the gods. Odin builds Valaskjalf with its silver roof and sets Hlidskjalf, the high seat from which he sees all things. Gladsheim rises, hall of the gods, with thirteen thrones. The Bifrost bridge — woven from fire, water, and air — connects the divine realm to Midgard below. But construction draws attention. The jotnar see towers rising from the bones of their ancestor and rage boils in their frost-thick blood. A giant war-lord leads a vanguard against the unfinished walls, testing divine defenses before the mortar of creation has set.',
			narrativeAfter: 'The walls of Asgard hold. The Bifrost blazes with all colors of creation, sealing the road between gods and mortals. Odin sits upon Hlidskjalf for the first time and looks across all Nine Realms. He sees everything — the giant remnants festering in Jotunheim, the dark elves stirring in the roots, the fire of Muspelheim growing restless. He sees you, too. And he remembers.',
			narrativeVictory: 'Asgard stands. The gods have their fortress, built on the bones of the enemy their fathers died to slay.',
			narrativeDefeat: 'The walls crumble. Asgard falls before it is finished — and the gods are left without sanctuary.',
			aiHeroId: 'hero-valthrud', aiHeroClass: 'warrior',
			aiDeckCardIds: [20001,20001,20003,20003,20005,20005,20020,20020,20100,20100,20104,20104,20105,20105,20111,20111,20113,20113,20114,20114,20201,20201,20210,20210,20302,20302,20305,20305,20306,20306],
			aiProfile: AI_PROFILES.hard,
			bossRules: [
				{ type: 'extra_mana', value: 1, description: 'Giant war-lord starts with +1 mana crystal' },
			],
			bossQuips: {
				onCombatStart: 'They build their walls on Ymir\u2019s skull. We are bringing down the roof.',
				onLowHP: 'I knew his name before yours was anything. I will say it as I die.',
				onLethal: 'Tell Odin we waited at his door.',
				onVictory: 'Down come the towers. Down comes the sky.',
			},
			combatMusicId: 'aesir_triumph',
			bossPhases: [
				{
					hpPercent: 50,
					quip: 'Hear me, brothers below! The walls are not yet sealed!',
					flash: 'red',
					effect: { type: 'damage_player', value: 6 },
					description: 'Vanguard breaches the unfinished gate',
				},
			],
			victoryCinematic: [
				{ narration: 'The last giant falls from the unfinished wall. Bifrost flares to life across the sky in colors no one has ever named.', visualCue: 'Time-lapse: a rainbow bridge igniting from horizon to horizon, spanning Asgard to Midgard.', musicId: 'aesir_triumph', durationHint: 12 },
				{ narration: 'Odin sits upon Hlidskjalf for the first time and looks across all Nine Realms. He sees everything that is. He sees you. He remembers.', visualCue: 'A cloaked one-eyed king on a high throne. Two ravens settle on his shoulders.', musicId: 'aesir_triumph', durationHint: 10 },
			],
			defeatCinematic: [
				{ narration: 'The walls of Asgard come down before they are finished. The gods scatter \u2014 a fortress ungiven becomes a fortress lost. There will be no Bifrost.', musicId: 'twilight_horn', durationHint: 9 },
			],
			storyBridge: [
				{ narration: 'Asgard rises in earnest. Gladsheim, hall of thirteen thrones. Valaskjalf, silver-roofed. Folkvang, where Freyja receives half the slain. Each hall a promise the gods do not yet know they will be asked to keep.', musicId: 'aesir_triumph', durationHint: 12 },
				{ narration: 'And from Hlidskjalf, Odin sees a realm he has never visited. A place of perpetual gold. The light-elves are calling for help.', visualCue: 'A ray of golden light reaching up from a forest of impossible trees.', musicId: 'forge_anvil', durationHint: 8 },
			],
			prerequisiteIds: ['norse-4'],
			rewards: [{ type: 'rune', amount: 40 }],
			realm: 'asgard',
			campaignArmy: { king: 'king-ymir', queen: 'hero-hel', rook: 'hero-valthrud', bishop: 'hero-ran', knight: 'hero-gormr' },
		},

		// ─── Chapter 5: Light and Seed ───────────────────────────────────
		// Alfheim — Light-elves; Freyr's realm-gift
		// Yggdrasil's light-bathed branches
		{
			id: 'norse-6', chapterId: 'norse', missionNumber: 6,
			name: 'Light and Seed',
			description: 'Journey through Alfheim where light-elves guard ancient power — and dark elves conspire.',
			narrativeBefore: 'Among the high branches of Yggdrasil, Alfheim bathes in perpetual golden light. Here dwell the ljosalfar — the light-elves — beings more beautiful than the sun, whose magic flows as naturally as breath. When the Vanir god Freyr received Alfheim as a tooth-gift in his youth, he planted the seeds of eternal summer. But where light shines, shadow gathers. The dokkalfar — dark elves — lurk in the roots below, envious of their radiant cousins, whispering promises of power to anyone who will listen. The light-elves sense corruption spreading through the branches. They have called for aid from the mortal world — for mortal eyes can sometimes see what immortal ones cannot.',
			narrativeAfter: 'The dark-elf incursion is broken, but their whispers linger in the roots of Yggdrasil. The light-elves gift you a shard of crystallized sunlight — Freyr\'s blessing, they say. "Carry it into the darker realms," their queen murmurs. "You will need it." The branches of the World Tree glow brighter for your passing, but somewhere below, the roots grow darker.',
			narrativeVictory: 'Alfheim\'s light endures. The dark elves slink back to the roots, but their ambition festers still.',
			narrativeDefeat: 'Shadow drowns the light-elves\' realm. Freyr\'s gift withers, and Alfheim dims for the first time since its creation.',
			aiHeroId: 'hero-odin', aiHeroClass: 'mage',
			aiDeckCardIds: [20004,20004,20016,20016,20021,20021,20100,20100,20101,20101,20103,20103,20106,20106,20109,20109,20112,20112,20113,20113,20204,20204,20205,20205,20208,20208,20211,20211,20303,20303],
			aiProfile: AI_PROFILES.hard,
			bossRules: [
				{ type: 'bonus_draw', value: 1, description: 'Dark-elf lord draws an extra card each turn' },
			],
			bossQuips: {
				onCombatStart: 'The light fades. The dokkalfar have whispered, and we have listened. Alfheim will know shadow.',
				onLowHP: 'You strike at me — but the roots have already drunk deep.',
				onLethal: 'The shadow does not need me to keep growing.',
				onVictory: 'Look up. The branches above you are already half black.',
			},
			combatMusicId: 'shadow_root',
			bossPhases: [
				{
					hpPercent: 70,
					quip: 'I show you what we showed Freyr. Look at the LIGHT.',
					flash: 'gold',
					effect: { type: 'damage_player', value: 5 },
					description: 'A blinding pulse from the corrupted shard',
				},
				{
					hpPercent: 35,
					quip: 'The roots remember all the names that ever fell into them.',
					flash: 'purple',
					effect: { type: 'enrage', value: 8 },
					description: 'Yggdrasil\u2019s roots feed the dark elf',
				},
			],
			victoryCinematic: [
				{ narration: 'The dark-elf falls. His shadow doesn\u2019t. It crawls back into the roots of Yggdrasil and waits.', visualCue: 'A pale figure collapsing onto golden earth. A black stain pulls free of him and drains into the soil.', musicId: 'shadow_root', durationHint: 9 },
				{ narration: 'A light-elf queen presses something into your palm: a shard of crystallized sunlight. \u201cFreyr\u2019s blessing,\u201d she says. \u201cCarry it into the darker realms. You will need it.\u201d', visualCue: 'A radiant elven queen handing a glowing crystal to your character. Her eyes are wet with relief.', musicId: 'celestial_court', durationHint: 12 },
			],
			defeatCinematic: [
				{ narration: 'Alfheim dims for the first time since its making. The light-elves shrink back into their highest branches and the shadow climbs up after them.', musicId: 'shadow_root', durationHint: 9 },
			],
			storyBridge: [
				{ narration: 'Word of your victory reaches Vanaheim. The Vanir gods, ancient and green, look at the Aesir with old, wary eyes.', musicId: 'vanir_war', durationHint: 8 },
				{ narration: 'And in Asgard, a strange woman in a green hood walks into Odin\u2019s hall and says her name is Gullveig. She speaks of gold. The Aesir do not like what they hear.', visualCue: 'A cloaked seeress standing in firelit Gladsheim, speaking softly. The gods\u2019 expressions darken.', musicId: 'vanir_war', durationHint: 10 },
			],
			prerequisiteIds: ['norse-5'],
			rewards: [{ type: 'rune', amount: 45 }, { type: 'eitr', amount: 50 }],
			realm: 'alfheim',
			campaignArmy: { king: 'king-yggdrasil', queen: 'hero-odin', rook: 'hero-heimdall', bishop: 'hero-frey', knight: 'hero-hoder' },
		},

		// ─── Chapter 6: War of Kin ───────────────────────────────────────
		// Aesir-Vanir War: Gullveig burned thrice
		// Stalemate → hostage exchange (Njordr/Freyr ↔ Hoenir/Mimir)
		{
			id: 'norse-7', chapterId: 'norse', missionNumber: 7,
			name: 'War of Kin',
			description: 'The first divine war erupts — Aesir against Vanir — as the seer Gullveig burns.',
			narrativeBefore: 'Peace among the gods was always fragile. When the seer Gullveig came to Asgard speaking of gold and greed, the Aesir burned her — once, twice, three times. Each time she rose reborn, brighter and more terrible. The Vanir, gods of nature and fertility who dwell in Vanaheim, saw the burning of their kinswoman as an act of war. Njordr, god of the sea, led the Vanir host against Asgard\'s walls. Freyr and Freyja fought with the fury of the wild earth itself. Odin hurled Gungnir over the Vanir army — the first spear-cast of the first war. Neither side could claim victory. The fighting raged until both pantheons stood exhausted, their divinity diminished. You must survive the war of the gods and help broker the peace that follows — for without unity, the giants win.',
			narrativeAfter: 'Exhaustion ends what pride could not. The Aesir and Vanir exchange hostages: Njordr and Freyr join the Aesir in Asgard; Hoenir and Mimir go to the Vanir. When the Vanir discover Hoenir is useless without Mimir\'s counsel, they behead Mimir and send the head to Odin. Odin preserves the head with herbs and runes, and it whispers secrets to him forevermore. Peace holds — but the scars of the first divine war run deeper than bone. Gullveig, reborn as Heidr the seeress, vanishes into the world, her prophecies echoing through time.',
			narrativeVictory: 'The divine war ends in bitter peace. Aesir and Vanir unite — scarred, diminished, but whole enough to face what comes.',
			narrativeDefeat: 'The war of the gods tears the cosmos apart. Without unity, Bergelmir\'s giants inherit the ruins.',
			aiHeroId: 'hero-idunn', aiHeroClass: 'druid',
			aiDeckCardIds: [20001,20001,20003,20003,20004,20004,20020,20020,20100,20100,20105,20105,20106,20106,20107,20107,20110,20110,20113,20113,20115,20115,20203,20203,20204,20204,20207,20207,20216,20216],
			aiProfile: AI_PROFILES.vanirWarlord,
			bossRules: [
				{ type: 'extra_health', value: 10, description: 'Vanir war-leader has 110 health' },
				{ type: 'extra_mana', value: 1, description: 'Vanir war-leader starts with +1 mana crystal' },
			],
			bossQuips: {
				onCombatStart: 'You burned a seer in your golden hall. Now the green earth burns back.',
				onLowHP: 'Gullveig rose three times. I will not need to.',
				onLethal: 'Tell Odin Vanaheim has not forgotten its sister.',
				onVictory: 'A war between gods. None of us will be the same after this.',
			},
			combatMusicId: 'vanir_war',
			bossPhases: [
				{
					hpPercent: 65,
					quip: 'Yggdrasil drinks. So do I.',
					flash: 'green',
					effect: { type: 'heal_self', value: 12 },
					description: 'The Vanir draw on the green earth',
				},
				{
					hpPercent: 30,
					quip: 'Idunn\u2019s apples are not given to gods who burn their guests.',
					flash: 'red',
					effect: { type: 'damage_player', value: 7 },
					description: 'Vanir vengeance flares',
				},
			],
			victoryCinematic: [
				{ narration: 'Both sides stop, gasping. The hostage exchange is offered before another spear flies. Njord and Freyr will go to Asgard. Hoenir and Mimir will go to Vanaheim.', visualCue: 'Two armies of gods, exhausted and bloody, lowering weapons. Hostages step into the gap between them.', musicId: 'vanir_war', durationHint: 12 },
				{ narration: 'When the Vanir discover Hoenir is useless without Mimir\u2019s counsel, they cut Mimir\u2019s head off and send it back. Odin preserves it with herbs and runes. From now on, the head whispers secrets to him forever.', visualCue: 'A severed head in Odin\u2019s hands, eyes still open, lips still moving.', musicId: 'forge_anvil', durationHint: 12 },
			],
			defeatCinematic: [
				{ narration: 'The first divine war becomes the only war. Without unity the giants step out of Jotunheim into rooms the gods left undefended. The cosmos burns young.', musicId: 'jotun_rage', durationHint: 9 },
			],
			storyBridge: [
				{ narration: 'A bitter peace settles over the Nine Realms. Brothers from Vanaheim drink in Aesir halls. Brothers from Asgard learn the green languages of Vanaheim. Nothing is forgiven and everything is endured.', musicId: 'aesir_triumph', durationHint: 12 },
				{ narration: 'In a frozen pass between Midgard and Jotunheim, an old jotun rises slowly to his feet. He has been waiting for generations. He has been waiting for you.', visualCue: 'A scarred ancient giant, one eye frozen shut, taking up a glacier-sized blade.', musicId: 'jotun_rage', durationHint: 10 },
			],
			prerequisiteIds: ['norse-6'],
			rewards: [{ type: 'rune', amount: 55 }, { type: 'card', cardId: 20210 }],
			realm: 'vanaheim',
			campaignArmy: { king: 'king-yggdrasil', queen: 'hero-sol', rook: 'hero-tyr', bishop: 'hero-idunn', knight: 'hero-ullr' },
		},

		// ─── Chapter 7: Flames of Jotunheim ─────────────────────────────
		// Bergelmir's giants raid; ongoing Aesir-jotnar wars
		// Echoes Ymir feud; player aids gods vs. remnants
		{
			id: 'norse-8', chapterId: 'norse', missionNumber: 8,
			name: 'Flames of Jotunheim',
			description: 'Bergelmir, last survivor of the blood-flood, leads his descendants in a war of vengeance.',
			narrativeBefore: 'Generations have passed since the blood-flood, but Bergelmir has not forgotten. The sole survivor of Ymir\'s slaying, he drifted on a hollowed log through an ocean of his ancestor\'s blood, clutching his wife, watching his entire race drown. He rebuilt the jotnar in Jotunheim — each generation raised on stories of divine betrayal. Now his host is vast, frost-hardened, and seething with ancestral rage. Bergelmir himself has grown ancient and terrible, his body scarred by the blood-flood, one eye frozen shut by the salt of Ymir\'s veins. He does not want territory. He does not want tribute. He wants the gods to feel what he felt — watching everything he loved drown in blood. "Your grandfathers murdered my grandfather," he thunders across the mountain pass. "Today, the debt is paid."',
			narrativeAfter: 'Bergelmir falls at last — the oldest grudge in the cosmos extinguished. His descendants scatter into the frozen wastes, leaderless but not broken. The feud between gods and giants will outlast them all, echoing through every age until Ragnarok settles it forever. But today, the architect of vengeance is gone, and the worlds breathe easier.',
			narrativeVictory: 'The flood-survivor falls. Ymir\'s blood-debt is paid — but the giants\' hatred will outlast even this.',
			narrativeDefeat: 'Bergelmir\'s vengeance is complete. The blood-flood\'s lone survivor destroys what the blood-flood could not.',
			aiHeroId: 'hero-thorgrim', aiHeroClass: 'warrior',
			aiDeckCardIds: [20001,20001,20002,20002,20003,20003,20005,20005,20020,20020,20104,20104,20105,20105,20107,20107,20114,20114,20115,20115,20201,20201,20203,20203,20207,20207,20209,20209,20305,20305],
			aiProfile: AI_PROFILES.bergelmir,
			bossRules: [
				{ type: 'extra_health', value: 20, description: 'Bergelmir has 120 health — ancient and terrible' },
				{ type: 'extra_mana', value: 2, description: 'Bergelmir starts with +2 mana crystals' },
				{ type: 'passive_damage', value: 1, description: 'Bergelmir\'s hatred deals 1 damage to your hero each turn' },
			],
			bossQuips: {
				onCombatStart: 'Your grandfathers murdered my grandfather. Today, the debt is paid. In your blood. In every drop. Until I am clean.',
				onLowHP: 'I should have died on that log of ribs. Do not pretend you are giving me anything.',
				onLethal: 'Strike, then. The cold I have lived in for an age was already worse than this.',
				onVictory: 'You will say my name as the world ends. EVERY god will.',
			},
			combatMusicId: 'jotun_rage',
			bossPhases: [
				{
					hpPercent: 80,
					quip: 'I have been carrying this storm for an age. NOW it walks.',
					flash: 'blue',
					effect: { type: 'add_armor', value: 10 },
					description: 'Bergelmir\u2019s ancient grief hardens him',
				},
				{
					hpPercent: 50,
					quip: 'Hear me, Ymir-grandfather. The blood-flood walks again.',
					flash: 'red',
					effect: { type: 'damage_player', value: 10 },
					description: 'Bergelmir invokes the drowning',
				},
				{
					hpPercent: 20,
					quip: 'My wife survived with me on that log. She lived just long enough to bear our sons. Then she went into the cold. THEY are the price you should be paying.',
					flash: 'purple',
					effect: { type: 'enrage', value: 12 },
					description: 'Bergelmir releases the deepest grief',
				},
			],
			victoryCinematic: [
				{ narration: 'Bergelmir falls. The oldest grudge in the cosmos lets go of his throat after an age of holding it.', visualCue: 'A vast scarred jotun sinking to one knee, frost-blood steaming on the glacier under him. His face, finally, is calm.', musicId: 'jotun_rage', durationHint: 10 },
				{ narration: '\u201cTell my wife,\u201d he says, very softly, \u201cthat I held it as long as I could.\u201d And then the long mourning is over.', visualCue: 'The giant\u2019s eyes finally close. A wind that has been blowing for a thousand years finally drops.', musicId: 'twilight_horn', durationHint: 12 },
			],
			defeatCinematic: [
				{ narration: 'Bergelmir\u2019s vengeance is complete. The blood-flood\u2019s lone survivor finishes the work the blood-flood started.', musicId: 'jotun_rage', durationHint: 8 },
			],
			storyBridge: [
				{ narration: 'You return to Asgard older than when you left. Odin is waiting on the threshold. He says nothing for a long time.', visualCue: 'A weary cloaked king watching you cross the rainbow bridge.', musicId: 'twilight_horn', durationHint: 10 },
				{ narration: 'Then: \u201cThe winter that comes next is not like other winters. It is the first sign. Will you stay for it?\u201d You stay.', musicId: 'twilight_horn', durationHint: 10 },
			],
			prerequisiteIds: ['norse-7'],
			rewards: [{ type: 'rune', amount: 65 }, { type: 'eitr', amount: 100 }],
			realm: 'jotunheim',
			campaignArmy: { king: 'king-surtr', queen: 'hero-sinmara', rook: 'hero-thorgrim', bishop: 'hero-gerd', knight: 'hero-skadi' },
		},

		// ─── Finale: Twilight Omen ───────────────────────────────────────
		// Ragnarok foreshadow: Fimbulvetr, Nidhogg gnaws roots
		// Multi-realm defense; Loki/Fenrir tease
		{
			id: 'norse-9', chapterId: 'norse', missionNumber: 9,
			name: 'Twilight Omen',
			description: 'Ragnarok stirs — Fimbulvetr descends, Nidhogg gnaws the roots, and the wolf strains his chain.',
			narrativeBefore: 'The peace won by blood and sacrifice begins to crack. Three winters come without a summer between — Fimbulvetr, the Great Winter, the first sign of Ragnarok. Deep beneath Yggdrasil, the dragon Nidhogg gnaws the roots with renewed fury, and the tree groans in agony. In a cave bound by divine chains, Fenrir the wolf — Loki\'s monstrous son — grows larger with each passing moon, the enchanted ribbon Gleipnir stretching thin. Loki himself sits chained beneath the earth, serpent venom dripping onto his face, his wife Sigyn catching what she can in a bowl. When she turns to empty it, his screams cause earthquakes. The signs are unmistakable: Ragnarok approaches. Odin summons you to Yggdrasil\'s heart — the nexus of all realms — for a final reckoning. "I have foreseen the twilight of the gods," he says from Hlidskjalf, his single eye burning. "But you... you were never in my visions. Perhaps that is why you are here."',
			narrativeAfter: 'The roots hold — for now. Nidhogg retreats deeper, Fenrir\'s chains endure one more day, and the Fimbulvetr eases, though it does not end. Odin watches from Hlidskjalf as you descend from the World Tree. "Ragnarok will come," he says, without sadness — only certainty. "The sun will be swallowed. The wolf will break free. I will fall to Fenrir\'s jaws, and Thor will die slaying the Serpent. But after the twilight, the world will rise again — green and new, from the sea. My sons Vidar and Vali will survive. Baldur will return from Hel. And the children of Ask and Embla will walk the earth once more." He pauses. "Perhaps, this time, they will remember what it cost." The Echoes of Ymir fall silent. The story of creation is told. What comes next... is Ragnarok itself.',
			narrativeVictory: 'The twilight is delayed — not prevented. But every moment bought is a world preserved.',
			narrativeDefeat: 'The roots of Yggdrasil snap. Ragnarok arrives ahead of prophecy, and the cosmos has no time to prepare.',
			aiHeroId: 'hero-freya', aiHeroClass: 'priest',
			aiDeckCardIds: [20001,20001,20002,20002,20003,20003,20004,20004,20020,20020,20105,20105,20107,20107,20113,20113,20114,20114,20115,20115,20200,20200,20203,20203,20207,20207,20209,20209,20216,20216],
			aiProfile: AI_PROFILES.odin,
			bossRules: [
				{ type: 'extra_health', value: 20, description: 'The forces of Ragnarok have 120 health' },
				{ type: 'extra_mana', value: 2, description: 'Chaos starts with +2 mana crystals' },
				{ type: 'bonus_draw', value: 1, description: 'The twilight draws an extra omen each turn' },
			],
			bossQuips: {
				onCombatStart: 'I have foreseen the twilight of the gods. But you... you were never in my visions. Perhaps that is why you are here.',
				onLowHP: 'My ravens have already carried word of this. Whatever you do here, the twilight still comes.',
				onLethal: 'Then it begins now. So be it. The cosmos has waited long enough.',
				onVictory: 'You delayed the twilight. Even gods are allowed a little hope.',
			},
			combatMusicId: 'twilight_horn',
			bossPhases: [
				{
					hpPercent: 80,
					quip: 'Huginn. Muninn. Watch closely. We will need to remember this one.',
					flash: 'gold',
					description: 'Odin marks the player (Phase I)',
				},
				{
					hpPercent: 55,
					quip: 'Even Hlidskjalf has its limits. I draw on the seed of Yggdrasil.',
					flash: 'green',
					effect: { type: 'heal_self', value: 12 },
					description: 'Yggdrasil empowers Odin (Phase II)',
				},
				{
					hpPercent: 30,
					quip: 'Then I will see you in Valhalla. SKOLL — TAKE THE SUN!',
					flash: 'red',
					effect: { type: 'damage_player', value: 12 },
					description: 'Odin invokes Ragnarok (Phase III)',
				},
			],
			victoryCinematic: [
				{ narration: 'Odin lowers Gungnir. He looks at you for a long time. \u201cYou are not in any vision I ever had,\u201d he says. \u201cAnd yet here you stand.\u201d', visualCue: 'A one-eyed king lowering his ancient spear, ravens circling overhead.', musicId: 'twilight_horn', durationHint: 10 },
				{ narration: '\u201cTwilight is delayed. Not prevented. Three winters will come without summer between them. Nidhogg will gnaw the roots a little slower. The wolf will strain his chain a little less. But it will all come. It always was going to come.\u201d', visualCue: 'Falling snow. Three winters compressed into a single sweep. Yggdrasil shedding leaves.', musicId: 'twilight_horn', durationHint: 14 },
				{ narration: '\u201cWhen the horn of Heimdall sounds, will you stand with us?\u201d Odin asks. He does not wait for an answer. He already knows.', visualCue: 'A great curved horn lifted to the sky in a moment yet to come. Camera pulls back into stars.', musicId: 'rebirth', durationHint: 10 },
			],
			defeatCinematic: [
				{ narration: 'The roots snap. The wolf breaks. The serpent surges from the sea. Ragnarok arrives ahead of prophecy, and the cosmos has not had time to learn its own name.', visualCue: 'Yggdrasil cracking, the sun being swallowed by a wolf, the sky lit blood-red.', musicId: 'ragnarok', durationHint: 12 },
			],
			storyBridge: [
				{ narration: 'The Echoes of Ymir fall silent. The story of creation is told.', visualCue: 'Camera lifts away from the World Tree.', musicId: 'twilight_horn', durationHint: 6 },
				{ narration: 'But somewhere in a cave bound by divine chains, a wolf is straining. Somewhere under the earth, a god lies in serpent venom. Somewhere on the road back from Hel, a beautiful god is making his way home, and a trickster god is laughing at the same joke he has been laughing at for an age.', musicId: 'ragnarok', durationHint: 14 },
				{ narration: 'What comes next is Twilight of the Gods.', visualCue: 'Title card: TWILIGHT OF THE GODS.', musicId: 'ragnarok', durationHint: 6 },
			],
			prerequisiteIds: ['norse-8'],
			rewards: [{ type: 'rune', amount: 100 }, { type: 'card', cardId: 20300 }, { type: 'pack', amount: 2 }],
			realm: 'midgard',
			campaignArmy: { king: 'king-surtr', queen: 'hero-hel', rook: 'hero-thryma', bishop: 'hero-freya', knight: 'hero-loki' },
			starThresholds: { threeStar: 16, twoStar: 24 },
			isChapterFinale: true,
		},
	],
};
