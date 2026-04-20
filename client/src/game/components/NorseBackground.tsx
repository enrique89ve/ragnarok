import React, { useMemo } from 'react';
import { assetPath } from '../utils/assetPath';

const boardTexture = assetPath('/textures/norse_rune_stone_game_board.webp');

interface NorseBackgroundProps {
  children: React.ReactNode;
}

const NorseBackground: React.FC<NorseBackgroundProps> = ({ children }) => {
  const particles = useMemo(() => {
    const result = [];
    for (let i = 0; i < 20; i++) {
      const delay = Math.random() * 15;
      const left = Math.random() * 100;
      const duration = 12 + Math.random() * 8;
      const isBlue = Math.random() > 0.6;
      result.push({ id: i, delay, left, duration, isBlue });
    }
    return result;
  }, []);

  return (
    <div className="norse-game-board relative w-full h-full min-h-screen overflow-hidden">
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${boardTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.6,
        }}
      />
      
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900/70 via-transparent to-slate-900/70" />
      
      <div 
        className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 h-2/3 z-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.08) 0%, transparent 60%)',
        }}
      />
      
      <div className="norse-vignette" />
      
      <div className="norse-particles">
        {particles.map((p) => (
          <div
            key={p.id}
            className={`norse-particle ${p.isBlue ? 'norse-particle-blue' : ''}`}
            style={{
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};

export default NorseBackground;
