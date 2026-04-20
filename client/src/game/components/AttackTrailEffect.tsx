import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './AttackTrailEffect.css';

interface TrailParticle {
	id: string;
	x: number;
	y: number;
	size: number;
	color: string;
	lifetime: number;
	createdAt: number;
}

interface AttackTrailEffectProps {
	active: boolean;
	sourcePosition: { x: number; y: number } | null;
	targetPosition: { x: number; y: number } | null;
	element?: string;
}

const ELEMENT_COLORS: Record<string, string[]> = {
	fire: ['#ff6b35', '#ff8c42', '#ffd700', '#ff4500'],
	ice: ['#00bcd4', '#4fc3f7', '#b3e5fc', '#ffffff'],
	lightning: ['#ffd700', '#ffeb3b', '#fff9c4', '#ffffff'],
	nature: ['#4caf50', '#81c784', '#a5d6a7', '#c8e6c9'],
	shadow: ['#7b1fa2', '#9c27b0', '#ce93d8', '#4a148c'],
	neutral: ['#ffd700', '#ffb300', '#ff8f00', '#ffffff'],
	default: ['#ffd700', '#ff8c42', '#ff6b35', '#ffffff']
};

export const AttackTrailEffect: React.FC<AttackTrailEffectProps> = ({ active, sourcePosition, targetPosition, element = 'default' }) => {
	const [particles, setParticles] = useState<TrailParticle[]>([]);

	const colors = ELEMENT_COLORS[element] || ELEMENT_COLORS.default;

	useEffect(() => {
		if (!active || !sourcePosition || !targetPosition) {
			setParticles([]);
			return;
		}

		let lastSpawn = 0;
		let animFrame: number;
		const startTime = Date.now();

		const animate = () => {
			const now = Date.now();
			const elapsed = now - startTime;

			if (elapsed < 400 && now - lastSpawn >= 30) {
				lastSpawn = now;
				setParticles(prev => {
					const filtered = prev.filter(p => now - p.createdAt < p.lifetime);
					const t = Math.random();
					const x = sourcePosition.x + (targetPosition.x - sourcePosition.x) * t + (Math.random() - 0.5) * 30;
					const y = sourcePosition.y + (targetPosition.y - sourcePosition.y) * t + (Math.random() - 0.5) * 30;
					return [...filtered.slice(-20), {
						id: `trail-${now}-${Math.random()}`,
						x, y,
						size: 3 + Math.random() * 5,
						color: colors[Math.floor(Math.random() * colors.length)],
						lifetime: 300 + Math.random() * 200,
						createdAt: now
					}];
				});
			} else if (elapsed >= 400) {
				setParticles(prev => {
					const alive = prev.filter(p => now - p.createdAt < p.lifetime);
					return alive.length !== prev.length ? alive : prev;
				});
			}

			if (elapsed >= 900) {
				setParticles([]);
				return;
			}

			animFrame = requestAnimationFrame(animate);
		};

		animFrame = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(animFrame);
	}, [active, sourcePosition, targetPosition, colors]);

	if (particles.length === 0) return null;

	return createPortal(
		<div className="attack-trail-layer">
			{particles.map(p => (
				<div
					key={p.id}
					className="attack-trail-particle"
					style={{
						left: p.x,
						top: p.y,
						width: p.size,
						height: p.size,
						backgroundColor: p.color,
						filter: `drop-shadow(0 0 ${p.size}px ${p.color})`
					}}
				/>
			))}
		</div>,
		document.body
	);
};
