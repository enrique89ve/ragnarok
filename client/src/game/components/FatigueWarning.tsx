import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import './FatigueWarning.css';

interface FatigueWarningProps {
	fatigueDamage: number;
	isActive: boolean;
}

export const FatigueWarning: React.FC<FatigueWarningProps> = ({ fatigueDamage, isActive }) => {
	const [visible, setVisible] = useState(false);
	const [prevDamage, setPrevDamage] = useState(0);

	useEffect(() => {
		if (isActive && fatigueDamage > prevDamage) {
			setVisible(true);
			const t = setTimeout(() => setVisible(false), 2000);
			setPrevDamage(fatigueDamage);
			return () => clearTimeout(t);
		}
		setPrevDamage(fatigueDamage);
		return undefined;
	}, [fatigueDamage, isActive, prevDamage]);

	if (!visible) return null;

	return createPortal(
		<AnimatePresence>
			{visible && (
				<motion.div
					className="fatigue-warning-overlay"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
				>
					<motion.div
						className="fatigue-warning-content"
						initial={{ scale: 2, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.8, opacity: 0 }}
						transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
					>
						<div className="fatigue-warning-icon">{'\uD83D\uDD25'}</div>
						<h2 className="fatigue-warning-title">FATIGUE</h2>
						<p className="fatigue-warning-damage">-{fatigueDamage} damage</p>
						<p className="fatigue-warning-sub">No cards remain in your deck!</p>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body
	);
};
