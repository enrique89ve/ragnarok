import React from 'react';

interface HealthDisplayProps {
	value: number;
	maxValue?: number;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

const sizeMap = {
	sm: { dim: 40, fontSize: 'text-sm' },
	md: { dim: 60, fontSize: 'text-base' },
	lg: { dim: 80, fontSize: 'text-lg' }
};

export function HealthDisplay({
	value,
	maxValue = 30,
	size = 'md',
	className = ''
}: HealthDisplayProps) {
	const healthPercentage = Math.max(0, Math.min(1, value / maxValue));
	const { dim, fontSize } = sizeMap[size];

	const getTextColorClass = () => {
		if (healthPercentage <= 0.25) return 'text-red-500';
		if (healthPercentage <= 0.5) return 'text-amber-500';
		return 'text-green-500';
	};

	return (
		<div className={`relative flex items-center justify-center ${className}`}>
			<div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
				<svg viewBox="0 0 40 36" className="absolute inset-0 w-full h-full drop-shadow-lg">
					<path
						d="M20 34 C20 34 2 22 2 12 C2 6 7 2 12 2 C15.5 2 18 4 20 7 C22 4 24.5 2 28 2 C33 2 38 6 38 12 C38 22 20 34 20 34Z"
						fill={healthPercentage <= 0.25 ? '#991b1b' : healthPercentage <= 0.5 ? '#b45309' : '#166534'}
						stroke={healthPercentage <= 0.25 ? '#f87171' : healthPercentage <= 0.5 ? '#fbbf24' : '#4ade80'}
						strokeWidth="2"
					/>
				</svg>
				<span className={`relative font-bold ${fontSize} ${getTextColorClass()}`}>
					{value}
				</span>
			</div>
		</div>
	);
}

export default HealthDisplay;
