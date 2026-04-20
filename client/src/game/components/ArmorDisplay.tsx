import React from 'react';

interface ArmorDisplayProps {
	value: number;
	className?: string;
}

export function ArmorDisplay({ value, className = '' }: ArmorDisplayProps) {
	if (value <= 0) return null;

	const getTextColorClass = () => {
		if (value >= 20) return 'text-blue-400';
		if (value >= 10) return 'text-blue-300';
		return 'text-blue-200';
	};

	return (
		<div className={`relative flex items-center justify-center ${className}`}>
			<div className="relative w-[60px] h-[60px] flex items-center justify-center">
				<svg viewBox="0 0 40 44" className="absolute inset-0 w-full h-full drop-shadow-lg">
					<path
						d="M20 2 L36 10 L36 26 C36 34 28 40 20 42 C12 40 4 34 4 26 L4 10 Z"
						fill="#1e3a5f"
						stroke="#60a5fa"
						strokeWidth="2"
					/>
				</svg>
				<span className={`relative font-bold text-base ${getTextColorClass()}`}>
					{value}
				</span>
			</div>
		</div>
	);
}

export default ArmorDisplay;
