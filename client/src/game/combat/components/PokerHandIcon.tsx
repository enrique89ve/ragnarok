import React from 'react';

export type PokerHandIconProps = {
	readonly className?: string;
	readonly size?: number;
};

/** One deterministic, suit-neutral mark for a currently evaluated poker hand. */
export function PokerHandIcon({ className, size = 20 }: PokerHandIconProps): React.ReactElement {
	return (
		<svg
			className={className}
			viewBox="0 0 20 20"
			width={size}
			height={size}
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M5.2 4.6 10.1 3a1.7 1.7 0 0 1 2.1 1.1l2.2 6.8a1.7 1.7 0 0 1-1.1 2.1l-4.9 1.6a1.7 1.7 0 0 1-2.1-1.1L4 6.7a1.7 1.7 0 0 1 1.2-2.1Z" />
			<path d="m8.3 6.5 3.8-1.2" />
			<path d="m9.1 9 3.7-1.2" />
			<path d="M12.7 6.6 14.2 6a1.7 1.7 0 0 1 2.1 1.1l1.1 3.6a1.7 1.7 0 0 1-1.1 2.1l-1.7.6" />
		</svg>
	);
}

export default PokerHandIcon;
