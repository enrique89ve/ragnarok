/**
 * HeroDeathAnimation - Hero death crumble/fade animation
 * 
 * Extracted from RagnarokCombatArena.tsx for modular UI
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Howl } from 'howler';
import { assetPath } from '../../utils/assetPath';

interface HeroDeathAnimationProps {
	heroName: string;
	isPlayer: boolean;
	onComplete: () => void;
}

export const HeroDeathAnimation: React.FC<HeroDeathAnimationProps> = ({ 
	heroName, 
	isPlayer, 
	onComplete 
}) => {
	const particlesRef = useRef<HTMLDivElement>(null);
	const onCompleteRef = useRef(onComplete);
	const hasCompletedRef = useRef(false);
	
	useEffect(() => {
		onCompleteRef.current = onComplete;
	}, [onComplete]);
	
	useEffect(() => {
		const hitSound = new Howl({
			src: [assetPath('/sounds/hit.mp3')],
			volume: 0.8,
			rate: 0.6,
		});

		const impactSound = new Howl({
			src: [assetPath('/sounds/hit.mp3')],
			volume: 0.6,
			rate: 0.4,
		});
		
		hitSound.play();
		const impactTimer = setTimeout(() => impactSound.play(), 300);
		
		const completeTimer = setTimeout(() => {
			if (!hasCompletedRef.current) {
				hasCompletedRef.current = true;
				onCompleteRef.current();
			}
		}, 3000);
		
		return () => {
			clearTimeout(impactTimer);
			clearTimeout(completeTimer);
			hitSound.stop();
			hitSound.unload();
			impactSound.stop();
			impactSound.unload();
		};
	}, []);
	
	useEffect(() => {
		if (!particlesRef.current) return;
		
		const container = particlesRef.current;
		container.innerHTML = '';
		
		for (let i = 0; i < 60; i++) {
			const particle = document.createElement('div');
			const size = Math.random() * 8 + 3;
			
			particle.style.position = 'absolute';
			particle.style.width = `${size}px`;
			particle.style.height = `${size}px`;
			
			const colors = [
				`rgba(139, 0, 0, ${Math.random() * 0.8 + 0.2})`,
				`rgba(178, 34, 34, ${Math.random() * 0.8 + 0.2})`,
				`rgba(220, 20, 60, ${Math.random() * 0.8 + 0.2})`,
				`rgba(255, 69, 0, ${Math.random() * 0.8 + 0.2})`,
			];
			particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
			particle.style.borderRadius = '50%';
			particle.style.left = `50%`;
			particle.style.top = `50%`;
			particle.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.8)';
			
			const animDuration = Math.random() * 1 + 0.8;
			const delay = Math.random() * 0.3;
			const angle = Math.random() * Math.PI * 2;
			const distance = 50 + Math.random() * 100;
			const endX = Math.cos(angle) * distance;
			const endY = Math.sin(angle) * distance;
			
			particle.style.setProperty('--end-x', `${endX}px`);
			particle.style.setProperty('--end-y', `${endY}px`);
			particle.style.animation = `hero-death-particle ${animDuration}s ease-out ${delay}s forwards`;
			
			container.appendChild(particle);
		}
	}, []);
	
	return (
		<motion.div
			className={`hero-death-overlay ${isPlayer ? 'player' : 'opponent'}`}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.3 }}
		>
			<motion.div 
				className="hero-death-container"
				initial={{ scale: 1, opacity: 1 }}
				animate={{ 
					scale: [1, 1.1, 0.8, 0],
					opacity: [1, 1, 0.5, 0],
					filter: ['blur(0px)', 'blur(2px)', 'blur(8px)', 'blur(20px)'],
					rotateZ: [0, -5, 5, -10],
				}}
				transition={{ duration: 2.5, ease: "easeOut" }}
			>
				<div className="hero-death-card">
					<div className="hero-death-avatar">{heroName.charAt(0)}</div>
					<div className="hero-death-name">{heroName}</div>
					<div className="hero-death-text">DEFEATED</div>
				</div>
				<div className="hero-death-particles" ref={particlesRef} />
			</motion.div>
			
			<motion.div
				className="hero-death-flash"
				initial={{ opacity: 0 }}
				animate={{ opacity: [0, 0.8, 0] }}
				transition={{ duration: 0.5, times: [0, 0.1, 1] }}
			/>
		</motion.div>
	);
};

export default HeroDeathAnimation;
