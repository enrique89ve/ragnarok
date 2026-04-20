import React, { useEffect, useState, useRef } from 'react';
import './AnimatedNumber.css';

interface AnimatedNumberProps {
	value: number;
	className?: string;
	flashOnChange?: boolean;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, className = '', flashOnChange = true }) => {
	const [displayValue, setDisplayValue] = useState(value);
	const [flashType, setFlashType] = useState<'up' | 'down' | null>(null);
	const prevValue = useRef(value);
	const animFrameRef = useRef<number | null>(null);

	useEffect(() => {
		if (value === prevValue.current) return undefined;

		const direction = value > prevValue.current ? 'up' : 'down';
		if (flashOnChange) setFlashType(direction);

		const start = prevValue.current;
		const diff = value - start;
		const duration = Math.min(Math.abs(diff) * 80, 400);
		const startTime = Date.now();

		const animate = () => {
			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const eased = 1 - Math.pow(1 - progress, 3);
			setDisplayValue(Math.round(start + diff * eased));

			if (progress < 1) {
				animFrameRef.current = requestAnimationFrame(animate);
			} else {
				setDisplayValue(value);
			}
		};

		if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
		animFrameRef.current = requestAnimationFrame(animate);

		prevValue.current = value;

		if (flashOnChange) {
			const t = setTimeout(() => setFlashType(null), 500);
			return () => clearTimeout(t);
		}
		return undefined;
	}, [value, flashOnChange]);

	useEffect(() => {
		return () => {
			if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
		};
	}, []);

	return (
		<span className={`animated-number ${className} ${flashType ? `flash-${flashType}` : ''}`}>
			{displayValue}
		</span>
	);
};
