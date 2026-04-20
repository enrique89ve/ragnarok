import React, { Component } from 'react';

const LORE_QUOTES = [
	'The World Tree trembles as the age of Ragnarok draws near...',
	'In the halls of Valhalla, the Einherjar prepare for the final battle.',
	'Odin sacrificed his eye at the Well of Wisdom. What will you sacrifice?',
	'The Norns weave the threads of fate. Your destiny awaits.',
	'From the fire of Muspelheim and the ice of Niflheim, all worlds were born.',
	'Fenrir strains against his bonds. The twilight of the gods approaches.',
	'The Bifrost bridge shimmers between realms. Choose your path wisely.',
	'Yggdrasil stands eternal, its roots reaching into all nine worlds.',
	'The ravens Huginn and Muninn fly forth, seeking knowledge across the realms.',
	'Thor wields Mjolnir. Zeus commands lightning. Ra rides the solar barque.',
	'The Morrigan watches from the battlefield. Celtic fury stirs.',
	'Anubis weighs the hearts of fallen warriors. May yours prove worthy.',
];

interface LoadingScreenProps {
	message?: string;
}

interface LoadingScreenState {
	quote: string;
}

export default class LoadingScreen extends Component<LoadingScreenProps, LoadingScreenState> {
	private quoteInterval: ReturnType<typeof setInterval> | null = null;

	state: LoadingScreenState = {
		quote: LORE_QUOTES[Math.floor(Math.random() * LORE_QUOTES.length)]
	};

	componentDidMount() {
		this.quoteInterval = setInterval(() => {
			this.setState({ quote: LORE_QUOTES[Math.floor(Math.random() * LORE_QUOTES.length)] });
		}, 5000);
	}

	componentWillUnmount() {
		if (this.quoteInterval) clearInterval(this.quoteInterval);
	}

	render() {
		const { message } = this.props;
		const { quote } = this.state;

		return (
			<div className="fixed inset-0 z-topmost bg-gray-950 flex flex-col items-center justify-center">
				{/* Rune spinner */}
				<div className="relative w-24 h-24 mb-8">
					<div className="absolute inset-0 rounded-full border-2 border-amber-500/30 animate-spin"
						style={{ animationDuration: '3s' }} />
					<div className="absolute inset-2 rounded-full border-2 border-amber-400/50 animate-spin"
						style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
					<div className="absolute inset-4 rounded-full border-2 border-amber-300/70 animate-spin"
						style={{ animationDuration: '1.5s' }} />
					<div className="absolute inset-0 flex items-center justify-center">
						<span className="text-3xl text-amber-400 font-bold">R</span>
					</div>
				</div>

				{/* Loading text */}
				<p className="text-amber-400 text-lg font-semibold mb-2">
					{message || 'Loading'}...
				</p>

				{/* Lore quote */}
				<p key={quote} className="text-gray-500 text-sm italic max-w-md text-center px-4 transition-opacity duration-500">
					&ldquo;{quote}&rdquo;
				</p>
			</div>
		);
	}
}
