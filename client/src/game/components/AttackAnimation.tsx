import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Position } from '../types';

interface AttackAnimationProps {
  startPosition: Position;
  endPosition: Position;
  duration?: number;
  onComplete?: () => void;
}

export const AttackAnimation: React.FC<AttackAnimationProps> = ({
  startPosition,
  endPosition,
  duration = 0.5,
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showImpact, setShowImpact] = useState(false);
  const [showSwoosh, setShowSwoosh] = useState(false);

  useEffect(() => {
    // Show swoosh right at the start
    setShowSwoosh(true);
    
    // Show the impact effect right before reaching the target
    const impactTimer = setTimeout(() => {
      setShowImpact(true);
    }, (duration * 0.75) * 1000);
    
    // Complete the animation after the full duration
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, duration * 1000);

    return () => {
      clearTimeout(impactTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  // Calculate the angle for the swoosh effect
  const angle = Math.atan2(
    endPosition.y - startPosition.y,
    endPosition.x - startPosition.x
  ) * (180 / Math.PI);
  
  // Calculate distances for trajectory
  const dx = endPosition.x - startPosition.x;
  const dy = endPosition.y - startPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Uses a curved attack path with slight overshoot for better feel
  // Calculate a control point for the curve
  const midX = startPosition.x + dx * 0.5;
  const midY = startPosition.y + dy * 0.5;
  
  // Create a perpendicular offset for the control point
  const perpX = -dy * 0.15; // perpendicular x component
  const perpY = dx * 0.15;  // perpendicular y component
  
  // Apply the perpendicular offset to create curve
  const controlX = midX + perpX;
  const controlY = midY + perpY;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Card movement animation with bezier path */}
          <motion.div
            className="absolute z-50 w-16 h-16 pointer-events-none"
            style={{
              left: startPosition.x - 32, // Center the animation
              top: startPosition.y - 32,
              transformOrigin: "center",
            }}
            initial={{
              x: 0,
              y: 0,
              scale: 1,
              rotate: 0
            }}
            animate={{
              // Instead of linear movement, use a custom animate function to follow a curve
              x: [
                0, // start
                (controlX - startPosition.x) * 0.7, // control point approach
                endPosition.x - startPosition.x // end
              ],
              y: [
                0, // start
                (controlY - startPosition.y) * 0.7, // control point approach
                endPosition.y - startPosition.y // end
              ],
              scale: [1, 1.3, 1], // Expand slightly in the middle
              rotate: [0, angle > 0 ? 15 : -15, 0], // Slight rotation based on direction
            }}
            transition={{
              duration,
              times: [0, 0.6, 1], // Timing for the path points
              ease: "easeInOut",
            }}
          >
            {/* CCG-style attack animation with glowing border */}
            <div className="w-full h-full flex items-center justify-center">
              <div 
                className="absolute inset-0 rounded-md border-2 border-yellow-400 animate-pulse"
                style={{
                  boxShadow: "0 0 10px rgba(255, 215, 0, 0.7), inset 0 0 6px rgba(255, 215, 0, 0.5)",
                }}
              ></div>
              <div className="bg-yellow-400 bg-opacity-30 rounded-full w-12 h-12 flex items-center justify-center">
                <div className="text-4xl transform rotate-12 drop-shadow-lg">⚔️</div>
              </div>
            </div>
          </motion.div>
          
          {/* Swoosh trail effect */}
          {showSwoosh && (
            <motion.div
              className="absolute z-40 pointer-events-none"
              style={{
                left: startPosition.x,
                top: startPosition.y,
                width: distance,
                height: 5,
                transformOrigin: "left center",
                rotate: `${angle}deg`,
                background: "linear-gradient(90deg, rgba(255,215,0,0) 0%, rgba(255,215,0,0.7) 50%, rgba(255,215,0,0) 100%)",
              }}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ 
                opacity: [0, 0.8, 0],
                scaleX: [0, 1, 0.2],
              }}
              transition={{
                duration: duration * 0.9,
                times: [0, 0.4, 1],
                ease: "easeOut",
              }}
            />
          )}
          
          {/* Impact effect at the end position */}
          {showImpact && (
            <motion.div
              className="absolute z-50 pointer-events-none"
              style={{
                left: endPosition.x - 45,
                top: endPosition.y - 45,
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ 
                opacity: [0, 1, 0], 
                scale: [0.5, 1.5, 0.8],
              }}
              transition={{ 
                duration: 0.4, 
                times: [0, 0.3, 1],
                ease: "easeOut" 
              }}
            >
              {/* CCG-style impact effect with layered flashes */}
              <div className="relative">
                {/* White flash background for initial impact */}
                <div className="absolute inset-0 rounded-full bg-white opacity-60" 
                     style={{ filter: "blur(3px)" }} />
                
                {/* Central impact glow */}
                <div className="w-90 h-90 flex items-center justify-center">
                  <div className="absolute inset-4 bg-yellow-500 rounded-full opacity-40 animate-ping" 
                       style={{ animationDuration: "500ms" }} />
                  <div className="absolute inset-8 bg-orange-500 rounded-full opacity-70" />
                  
                  {/* Central impact symbol */}
                  <div className="w-24 h-24 text-center flex items-center justify-center">
                    <div className="text-6xl transform rotate-12 drop-shadow-md">💥</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Particle effects scattered from the impact */}
          {showImpact && (
            <>
              {/* CCG-style particles with varying sizes and speeds */}
              {[...Array(12)].map((_, i) => {
                // More varied and dynamic particle trajectories
                const angle = (i * 30) + (Math.random() * 30 - 15);
                const distance = 40 + Math.random() * 50;
                const delay = Math.random() * 0.1;
                const size = 3 + Math.random() * 5;
                const speed = 0.3 + Math.random() * 0.3; // Varying speeds
                
                const radians = angle * (Math.PI / 180);
                const x = Math.cos(radians) * distance;
                const y = Math.sin(radians) * distance;
                
                // Use different colors for particles - standard CCG style
                const colors = [
                  "bg-yellow-300", "bg-orange-400", "bg-amber-500", 
                  "bg-yellow-400", "bg-orange-300"
                ];
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                return (
                  <motion.div
                    key={`particle-${i}`}
                    className={`absolute z-45 ${color} rounded-full`}
                    style={{
                      left: endPosition.x - size/2,
                      top: endPosition.y - size/2,
                      width: size,
                      height: size,
                      boxShadow: "0 0 3px rgba(255, 255, 255, 0.8)",
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      x: x,
                      y: y,
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0.5],
                    }}
                    transition={{
                      duration: speed + Math.random() * 0.2,
                      delay: delay,
                      times: [0, 0.2, 1],
                      ease: "easeOut",
                    }}
                  />
                );
              })}
              
              {/* Additional shockwave effect */}
              <motion.div
                className="absolute z-40 rounded-full border-2 border-yellow-400 bg-transparent"
                style={{
                  left: endPosition.x - 20,
                  top: endPosition.y - 20,
                  width: 40,
                  height: 40,
                }}
                initial={{ opacity: 0.7, scale: 0.2 }}
                animate={{ 
                  opacity: 0, 
                  scale: 2.5 
                }}
                transition={{ 
                  duration: 0.5, 
                  ease: "easeOut" 
                }}
              />
            </>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

// Visual effect for damage
interface DamageEffectProps {
  position: Position;
  amount: number;
  duration?: number;
  onComplete?: () => void;
}

export const DamageEffect: React.FC<DamageEffectProps> = ({
  position,
  amount,
  duration = 1,
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showSplatter, setShowSplatter] = useState(false);
  const [showShake, setShowShake] = useState(false);

  useEffect(() => {
    // Initial quick shake to indicate damage
    setShowShake(true);
    
    // Show blood splatter effect shortly after damage number appears
    const splatterTimer = setTimeout(() => {
      setShowSplatter(true);
      // Stop the shake effect after a short duration
      setTimeout(() => {
        setShowShake(false);
      }, 150);
    }, 80);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, duration * 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(splatterTimer);
    };
  }, [duration, onComplete]);

  // Generate blood splatter particles proportional to damage amount
  // Shows more particles for higher damage
  const particleCount = Math.min(4 + Math.floor(amount / 2), 12);
  
  // Generate a random shake offset - Uses screen shake for big hits
  const shakeOffset = amount > 3 ? {
    x: Math.random() * 4 - 2, 
    y: Math.random() * 4 - 2
  } : { x: 0, y: 0 };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Initial flash effect for damage - standard CCG style */}
          <motion.div
            className="absolute rounded-full bg-white bg-opacity-30 pointer-events-none"
            style={{
              left: position.x - 30,
              top: position.y - 30,
              width: 60,
              height: 60,
              zIndex: 48,
              filter: "blur(3px)"
            }}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.5, 0],
              scale: [0.8, 1.2, 1.5] 
            }}
            transition={{ 
              duration: 0.25,
              times: [0, 0.2, 1] 
            }}
          />
          
          {/* Main damage number - with the game's characteristic bounce and fade */}
          <motion.div
            className="absolute z-50 pointer-events-none"
            style={{
              left: position.x - 25,
              top: position.y - 25,
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
            }}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ 
              opacity: [0, 1, 1, 0.8, 0],
              y: [-10, -25, -40, -45], // the game's characteristic upward bounce
              scale: [0.7, 1.5, 1.3, 1], // The number expands then contracts slightly
              x: showShake ? [shakeOffset.x, -shakeOffset.x, shakeOffset.x, 0] : 0 // Optional shake for big hits
            }}
            transition={{
              duration,
              times: [0, 0.15, 0.5, 0.8, 1],
              ease: "easeOut",
              x: { duration: 0.3, times: [0, 0.3, 0.6, 1] }
            }}
          >
            {/* CCG-style damage number with improved 3D effect */}
            <div className="text-5xl font-black relative" style={{ fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" }}>
              {/* Black outline with more depth - the game's damage text has a substantial 3D effect */}
              <div className="absolute text-black opacity-80" style={{ 
                left: 3, 
                top: 3,
                filter: "blur(1px)" 
              }}>
                -{amount}
              </div>
              
              {/* Bright red border glow */}
              <div className="text-red-600 font-extrabold"
                style={{ 
                  textShadow: '0 0 4px #ff0000, 0 0 8px #ff0000, 0 0 1px #000000, 2px 2px 1px rgba(0,0,0,0.8)', 
                }}>
                -{amount}
              </div>
              
              {/* White inner highlight for contrast */}
              <div className="absolute inset-0 text-white flex items-center justify-center" 
                style={{ 
                  textShadow: '0 0 2px #ffffff', 
                  mixBlendMode: 'overlay',
                  letterSpacing: '0.05em'
                }}>
                -{amount}
              </div>
            </div>
          </motion.div>
          
          {/* CCG-style impact effect */}
          <motion.div 
            className="absolute bg-red-600 rounded-full pointer-events-none"
            style={{
              left: position.x - 20,
              top: position.y - 20,
              width: 40,
              height: 40,
              zIndex: 46,
              opacity: 0.3,
              filter: "blur(5px)"
            }}
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{ opacity: [0, 0.3, 0], scale: [0.2, 1.5, 2] }}
            transition={{ duration: 0.5, times: [0, 0.2, 1] }}
          />
          
          {/* CCG-style blood splatter particles */}
          {showSplatter && (
            <>
              {/* Immediate blood spray effect */}
              <motion.div
                className="absolute bg-red-700 rounded-full pointer-events-none"
                style={{
                  left: position.x - 15,
                  top: position.y - 15,
                  width: 30, 
                  height: 30,
                  zIndex: 47,
                  opacity: 0.6,
                }}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ 
                  opacity: [0, 0.6, 0],
                  scale: [0.2, 1, 0.8]
                }}
                transition={{ duration: 0.25 }}
              />
              
              {/* Detailed blood particles - standard CCG style's characteristic spray */}
              {[...Array(particleCount)].map((_, i) => {
                // Calculate trajectories for blood particles - they tend to spray outward
                const angleOffset = i * (360 / particleCount) + (Math.random() * 30 - 15); 
                const angle = angleOffset;
                const distance = 15 + Math.random() * (amount > 5 ? 50 : 35); // Big hits spray further
                
                // Vary the particle sizes - Uses different sized blood drops
                const baseSize = amount > 5 ? 5 : 3; // Bigger damage = bigger particles
                const size = baseSize + Math.random() * baseSize * (amount > 3 ? 1.5 : 1);
                
                // Vary the timing - Uses some particles appear slightly later
                const delay = Math.random() * 0.15;
                
                // Transform to cartesian coordinates
                const radians = angle * (Math.PI / 180);
                const x = Math.cos(radians) * distance;
                const y = Math.sin(radians) * distance;
                
                // Create different blood drop shapes
                const isRound = Math.random() > 0.3;
                const shape = isRound ? "rounded-full" : "rounded-sm";
                
                // Use different red tones for visual interest
                const colors = [
                  "bg-red-600", "bg-red-700", "bg-red-800", 
                  "bg-red-500", "bg-red-900"
                ];
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                return (
                  <motion.div
                    key={`splatter-${i}`}
                    className={`absolute ${shape} ${color} pointer-events-none`}
                    style={{
                      left: position.x - size/2,
                      top: position.y - size/2,
                      width: size,
                      height: size,
                      zIndex: 45,
                      transform: `rotate(${Math.random() * 360}deg)`,
                      boxShadow: "0 0 2px rgba(0, 0, 0, 0.5)"
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 0.9, 0],
                      scale: [0, 1, isRound ? 0.8 : 0.6], // Splatter effect
                      x: [0, x * 0.3, x], // Accelerate outward
                      y: [0, y * 0.3, y],
                      rotate: isRound ? 0 : [0, Math.random() * 180 - 90] // Some rotation for non-round particles
                    }}
                    transition={{
                      duration: 0.4 + Math.random() * 0.3,
                      delay: delay,
                      times: [0, 0.3, 1],
                      ease: "easeOut"
                    }}
                  />
                );
              })}
            </>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

// Visual effect for healing - enhanced to match the game's style
export const HealEffect: React.FC<DamageEffectProps> = ({
  position,
  amount,
  duration = 1,
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showGlow, setShowGlow] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    // Initial glow right away
    setShowGlow(true);
    
    // Show particles shortly after the number appears
    const particleTimer = setTimeout(() => {
      setShowParticles(true);
    }, 80);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, duration * 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(particleTimer);
    };
  }, [duration, onComplete]);

  // Generate healing particles based on amount - Shows more for bigger heals
  const particleCount = Math.min(6 + Math.floor(amount / 2), 15);

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Initial healing glow flash - Starts with a bright flash */}
          <motion.div
            className="absolute rounded-full bg-green-400 bg-opacity-40 pointer-events-none"
            style={{
              left: position.x - 35,
              top: position.y - 35,
              width: 70,
              height: 70,
              zIndex: 48,
              filter: "blur(4px)",
              boxShadow: "0 0 15px rgba(0, 255, 0, 0.5)"
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: [0, 0.6, 0],
              scale: [0.8, 1.4, 2]
            }}
            transition={{ 
              duration: 0.6,
              times: [0, 0.2, 1],
              ease: "easeOut"
            }}
          />
          
          {/* Main healing number with the game's distinctive pop and rise */}
          <motion.div
            className="absolute z-50 pointer-events-none"
            style={{
              left: position.x - 25,
              top: position.y - 25,
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
            }}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ 
              opacity: [0, 1, 1, 0.8, 0],
              y: [-5, -20, -35, -45], // the game's upward float
              scale: [0.7, 1.5, 1.3, 1], // The number expands then contracts slightly
              rotate: [0, -2, 2, 0] // Slight wobble standard CCG style
            }}
            transition={{
              duration,
              times: [0, 0.15, 0.5, 0.8, 1],
              ease: "easeOut"
            }}
          >
            {/* CCG-style healing number with improved 3D effect */}
            <div className="text-5xl font-black relative" style={{ fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" }}>
              {/* Shadow layer for depth */}
              <div className="absolute text-black opacity-80" style={{ 
                left: 3, 
                top: 3,
                filter: "blur(1px)" 
              }}>
                +{amount}
              </div>
              
              {/* Green glow border - Uses a vibrant green */}
              <div className="text-green-500 font-extrabold"
                style={{ 
                  textShadow: '0 0 4px #00ff00, 0 0 6px #00ff00, 0 0 1px #000000, 2px 2px 1px rgba(0,0,0,0.8)', 
                }}>
                +{amount}
              </div>
              
              {/* White inner highlight for contrast */}
              <div className="absolute inset-0 text-white flex items-center justify-center" 
                style={{ 
                  textShadow: '0 0 2px #ffffff', 
                  mixBlendMode: 'overlay',
                  letterSpacing: '0.05em'
                }}>
                +{amount}
              </div>
            </div>
          </motion.div>
          
          {/* CCG-style radial healing glow */}
          {showGlow && (
            <>
              {/* Central bright flash */}
              <motion.div
                className="absolute z-45 rounded-full bg-green-300"
                style={{
                  left: position.x - 20,
                  top: position.y - 20,
                  width: 40,
                  height: 40,
                  filter: "blur(5px)",
                  boxShadow: "0 0 10px rgba(0, 255, 0, 0.7)"
                }}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ 
                  opacity: [0, 0.8, 0],
                  scale: [0.2, 1, 1.5]
                }}
                transition={{ 
                  duration: 0.7, 
                  ease: "easeOut"
                }}
              />
              
              {/* Healing rays - Uses distinct light rays */}
              <motion.div
                className="absolute z-44"
                style={{
                  left: position.x - 50,
                  top: position.y - 50,
                  width: 100,
                  height: 100,
                  background: "radial-gradient(circle, rgba(0,255,0,0.4) 0%, rgba(0,255,0,0) 70%)",
                }}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ 
                  opacity: [0, 0.6, 0],
                  scale: [0.5, 1.5, 2]
                }}
                transition={{ 
                  duration: 0.9, 
                  ease: "easeOut"
                }}
              />
              
              {/* Pulsing inner glow */}
              <motion.div
                className="absolute z-43 rounded-full bg-green-500"
                style={{
                  left: position.x - 15,
                  top: position.y - 15,
                  width: 30,
                  height: 30,
                  opacity: 0.3
                }}
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 0.8,
                  repeat: 1,
                  repeatType: "reverse"
                }}
              />
            </>
          )}
          
          {/* CCG-style healing particles - includes upward swirling effect */}
          {showParticles && (
            <>
              {/* Healing sparkles with spiral pattern - standard CCG style's healing effect */}
              {[...Array(particleCount)].map((_, i) => {
                // the game's healing has particles that move in a spiral pattern upward
                const spiralBase = (i / particleCount) * Math.PI * 2; // Distribute around a circle
                const startAngle = spiralBase;
                const endAngle = spiralBase + (Math.random() > 0.5 ? 0.5 : -0.5); // Spiral direction
                
                // Distance and sizes - varies with healing amount
                const baseDistance = 15 + Math.random() * 20;
                const endDistance = baseDistance + (20 + Math.random() * 30);
                const size = 8 + Math.random() * (amount > 5 ? 8 : 5);
                
                // Timing - Uses staggered particle appearances
                const delay = (i / particleCount) * 0.2; // Stagger based on position
                const randomDelay = Math.random() * 0.1; // Add some randomness
                const totalDelay = delay + randomDelay;
                
                // Star or cross shapes - Uses specific shapes
                const particles = [
                  "✦", "✧", "✴", "✹", "✺", "✻", "✽", "❋", "❊", "✚", "✙"
                ];
                const particle = particles[Math.floor(Math.random() * particles.length)];
                
                // Color variations - Uses yellow-green to bright green
                const colors = [
                  "text-green-300", "text-green-400", "text-green-500",
                  "text-lime-300", "text-lime-400", "text-yellow-300"
                ];
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                // Initial and final positions - calculate spiral path
                const initialRadians = startAngle;
                const finalRadians = endAngle;
                
                const startX = Math.cos(initialRadians) * baseDistance;
                const startY = Math.sin(initialRadians) * baseDistance - 10; // Start slightly above
                
                const endX = Math.cos(finalRadians) * endDistance;
                const endY = Math.sin(finalRadians) * endDistance - 40; // End higher up
                
                return (
                  <motion.div
                    key={`heal-particle-${i}`}
                    className={`absolute z-45 ${color} font-bold pointer-events-none`}
                    style={{
                      left: position.x,
                      top: position.y,
                      fontSize: size,
                      filter: "drop-shadow(0 0 2px rgba(255, 255, 255, 0.7))",
                      lineHeight: 1
                    }}
                    initial={{ 
                      opacity: 0, 
                      x: startX, 
                      y: startY,
                      scale: 0.5,
                      rotate: Math.random() * 40 - 20 
                    }}
                    animate={{
                      opacity: [0, 0.9, 0],
                      scale: [0.5, 1.2, 0.8],
                      rotate: [Math.random() * 30 - 15, Math.random() * 60 - 30], // Rotation for sparkly feel
                      x: [startX, (startX + endX) / 2, endX], // Path follows a curve
                      y: [startY, (startY + endY) / 2 - 15, endY], // Arc upward
                    }}
                    transition={{
                      duration: 0.6 + Math.random() * 0.3,
                      delay: totalDelay,
                      times: [0, 0.4, 1],
                      ease: "easeOut"
                    }}
                  >
                    {particle}
                  </motion.div>
                );
              })}
              
              {/* Characteristic healing spiral */}
              <motion.div
                className="absolute z-42 pointer-events-none"
                style={{
                  left: position.x - 25,
                  top: position.y - 25,
                  width: 50,
                  height: 50,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.7, 0] }}
                transition={{ duration: 0.8, times: [0, 0.3, 1] }}
              >
                <svg width="50" height="50" viewBox="0 0 50 50">
                  <motion.path
                    d="M25,25 C25,15 35,15 35,25 C35,35 25,35 25,25 Z"
                    stroke="#22c55e"
                    strokeWidth="2"
                    fill="none"
                    initial={{ pathLength: 0, rotate: 0 }}
                    animate={{ 
                      pathLength: [0, 1, 1], 
                      rotate: [0, 180, 360] 
                    }}
                    transition={{ 
                      duration: 1,
                      times: [0, 0.5, 1],
                      ease: "easeInOut" 
                    }}
                    style={{ transformOrigin: "center" }}
                  />
                </svg>
              </motion.div>
            </>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

// Visual effect for buff - enhanced to match the game's style
export const BuffEffect: React.FC<{
  position: Position;
  attackBuff?: number;
  healthBuff?: number;
  duration?: number;
  onComplete?: () => void;
}> = ({
  position,
  attackBuff = 0,
  healthBuff = 0,
  duration = 1,
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showEffects, setShowEffects] = useState(false);

  useEffect(() => {
    // Show the buff sparkle effects slightly after the text appears
    const effectsTimer = setTimeout(() => {
      setShowEffects(true);
    }, 100);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, duration * 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(effectsTimer);
    };
  }, [duration, onComplete]);

  // Determine if we're showing attack, health, or both
  const showAttack = attackBuff > 0;
  const showHealth = healthBuff > 0;
  const showBoth = showAttack && showHealth;
  
  // Uses different colors for attack and health buffs
  const attackColor = "text-yellow-400";
  const healthColor = "text-green-500";
  
  // Get the appropriate position adjustment based on what's being shown
  const positionAdjustment = {
    x: showBoth ? -50 : -30,
    y: -30
  };
  
  // Buff effects bounce and have a distinctive glow
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Initial flash effect - Uses a pulse on buff */}
          <motion.div
            className="absolute rounded-full bg-yellow-100 bg-opacity-40 pointer-events-none"
            style={{
              left: position.x - 40,
              top: position.y - 40,
              width: 80,
              height: 80,
              zIndex: 48,
              filter: "blur(6px)"
            }}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.6, 0],
              scale: [0.5, 1.3, 1.5]
            }}
            transition={{ 
              duration: 0.4,
              times: [0, 0.3, 1]
            }}
          />
        
          {/* Main buff number container with the game's bounce effect */}
          <motion.div
            className="absolute z-50 pointer-events-none flex"
            style={{
              left: position.x + positionAdjustment.x,
              top: position.y + positionAdjustment.y,
              gap: showBoth ? '1rem' : '0',
              filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.7))"
            }}
            initial={{ opacity: 0, y: 5, scale: 0.7 }}
            animate={{ 
              opacity: [0, 1, 1, 0.8, 0],
              y: [-5, -20, -15, -10], // the game's characteristic bounce
              scale: [0.7, 1.2, 1.1, 1]
            }}
            transition={{
              duration,
              times: [0, 0.2, 0.6, 0.8, 1],
              ease: "easeOut"
            }}
          >
            {/* Attack buff - with CCG styling */}
            {showAttack && (
              <div className="relative">
                {/* Buff text with 3D effect */}
                <div className="text-3xl font-black relative" style={{ fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" }}>
                  {/* Dark shadow layer for depth */}
                  <div className="absolute text-black opacity-70" style={{ 
                    left: 2, 
                    top: 2,
                    filter: "blur(1px)" 
                  }}>
                    +{attackBuff}
                  </div>
                  
                  {/* Main yellow glow for attack */}
                  <div className={`${attackColor} font-extrabold`}
                    style={{ 
                      textShadow: '0 0 4px #ffcc00, 0 0 6px #ffcc00, 0 0 1px #000000, 2px 2px 1px rgba(0,0,0,0.8)', 
                    }}>
                    +{attackBuff}
                  </div>
                  
                  {/* White inner highlight - Uses this for better readability */}
                  <div className="absolute inset-0 text-white flex items-center justify-center" 
                    style={{ 
                      textShadow: '0 0 2px #ffffff', 
                      mixBlendMode: 'overlay',
                      letterSpacing: '0.05em'
                    }}>
                    +{attackBuff}
                  </div>
                </div>
                
                {/* Adds the "ATK" indicator below */}
                <div className="absolute -bottom-5 left-0 right-0 text-center">
                  <div className={`${attackColor} text-sm font-bold`}
                    style={{ textShadow: '0 0 2px #000000, 0 1px 1px #000000' }}>
                    ATK
                  </div>
                </div>
              </div>
            )}
            
            {/* Health buff - with CCG styling */}
            {showHealth && (
              <div className="relative">
                {/* Buff text with 3D effect */}
                <div className="text-3xl font-black relative" style={{ fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" }}>
                  {/* Dark shadow layer for depth */}
                  <div className="absolute text-black opacity-70" style={{ 
                    left: 2, 
                    top: 2,
                    filter: "blur(1px)" 
                  }}>
                    +{healthBuff}
                  </div>
                  
                  {/* Main green glow for health */}
                  <div className={`${healthColor} font-extrabold`}
                    style={{ 
                      textShadow: '0 0 4px #00ff00, 0 0 6px #00ff00, 0 0 1px #000000, 2px 2px 1px rgba(0,0,0,0.8)', 
                    }}>
                    +{healthBuff}
                  </div>
                  
                  {/* White inner highlight */}
                  <div className="absolute inset-0 text-white flex items-center justify-center" 
                    style={{ 
                      textShadow: '0 0 2px #ffffff', 
                      mixBlendMode: 'overlay',
                      letterSpacing: '0.05em'
                    }}>
                    +{healthBuff}
                  </div>
                </div>
                
                {/* Health indicator */}
                <div className="absolute -bottom-5 left-0 right-0 text-center">
                  <div className={`${healthColor} text-sm font-bold`}
                    style={{ textShadow: '0 0 2px #000000, 0 1px 1px #000000' }}>
                    HP
                  </div>
                </div>
              </div>
            )}
          </motion.div>
          
          {/* CCG-style sparkle effects around buff */}
          {showEffects && (
            <>
              {/* Orbit particles - both attack and health buffs get these */}
              {[...Array(8)].map((_, i) => {
                // Create a circular orbit of particles
                const angle = (i / 8) * Math.PI * 2;
                const distance = 35;
                const delay = i * 0.03;
                const isAttackParticle = showBoth ? i % 2 === 0 : showAttack;
                
                // Calculate position on the orbit
                const orbitX = Math.cos(angle) * distance;
                const orbitY = Math.sin(angle) * distance;
                
                // Uses different particle styles
                const particleType = isAttackParticle ? '✦' : '✧';
                const particleColor = isAttackParticle ? attackColor : healthColor;
                
                return (
                  <motion.div
                    key={`buff-particle-${i}`}
                    className={`absolute z-45 ${particleColor} font-bold pointer-events-none`}
                    style={{
                      left: position.x,
                      top: position.y,
                      fontSize: 12 + Math.random() * 8,
                      filter: "drop-shadow(0 0 2px rgba(255, 255, 255, 0.7))",
                    }}
                    initial={{ 
                      opacity: 0,
                      x: 0,
                      y: 0,
                      scale: 0.5
                    }}
                    animate={{
                      opacity: [0, 0.9, 0],
                      scale: [0.5, 1.2, 0.8],
                      rotate: [0, 180], // Particles rotate
                      x: [0, orbitX * 0.7, orbitX],
                      y: [0, orbitY * 0.7, orbitY - 15], // Slight upward bias
                    }}
                    transition={{
                      duration: 0.7,
                      delay: delay,
                      ease: "easeOut"
                    }}
                  >
                    {particleType}
                  </motion.div>
                );
              })}
              
              {/* Central glow based on what's being buffed */}
              <motion.div
                className={`absolute rounded-full pointer-events-none`}
                style={{
                  left: position.x - 30,
                  top: position.y - 30,
                  width: 60,
                  height: 60,
                  background: showBoth ? 
                    "radial-gradient(circle, rgba(255,204,0,0.3) 0%, rgba(0,255,0,0.3) 50%, rgba(0,0,0,0) 70%)" :
                    showAttack ?
                    "radial-gradient(circle, rgba(255,204,0,0.3) 0%, rgba(0,0,0,0) 70%)" :
                    "radial-gradient(circle, rgba(0,255,0,0.3) 0%, rgba(0,0,0,0) 70%)",
                  zIndex: 42
                }}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ 
                  opacity: [0, 0.5, 0],
                  scale: [0.5, 1.2, 1.5]
                }}
                transition={{ 
                  duration: 0.8, 
                  ease: "easeOut"
                }}
              />
            </>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

// Hero Power Effect - enhanced to match the game's style
export const HeroPowerEffect: React.FC<{
  position: Position;
  heroClass: 'mage' | 'warrior' | 'paladin' | 'hunter';
  duration?: number;
  onComplete?: () => void;
}> = ({
  position,
  heroClass,
  duration = 1.2,
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showRipple, setShowRipple] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    // Create a staged animation standard CCG style
    setShowRipple(true);
    
    // Show particles slightly after the icon appears
    const particleTimer = setTimeout(() => {
      setShowParticles(true);
    }, 150);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, duration * 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(particleTimer);
    };
  }, [duration, onComplete]);
  
  // Get hero power visual elements based on class
  // These match the hero power colors and effects for each class
  const getHeroPowerInfo = () => {
    switch (heroClass) {
      case 'mage':
        return {
          icon: '🔥',
          mainColor: 'text-red-500',
          glowColor: '#ff3300',
          bgStart: 'rgba(255, 120, 50, 0.7)',
          bgEnd: 'rgba(255, 50, 0, 0)',
          particleColors: ['text-red-400', 'text-orange-300', 'text-yellow-500'],
          particleSymbols: ['✦', '✧', '✴', '⚡'],
        };
      case 'warrior':
        return {
          icon: '🛡️',
          mainColor: 'text-yellow-500',
          glowColor: '#ffc107',
          bgStart: 'rgba(255, 193, 7, 0.5)',
          bgEnd: 'rgba(255, 193, 7, 0)',
          particleColors: ['text-yellow-400', 'text-amber-500', 'text-yellow-600'],
          particleSymbols: ['✦', '⚔️', '◆', '🔶'],
        };
      case 'paladin':
        return {
          icon: '💫',
          mainColor: 'text-blue-300',
          glowColor: '#93c5fd',
          bgStart: 'rgba(147, 197, 253, 0.5)',
          bgEnd: 'rgba(147, 197, 253, 0)',
          particleColors: ['text-blue-300', 'text-blue-200', 'text-yellow-300'],
          particleSymbols: ['✦', '✧', '★', '✢'],
        };
      case 'hunter':
        return {
          icon: '🏹',
          mainColor: 'text-green-600',
          glowColor: '#16a34a',
          bgStart: 'rgba(22, 163, 74, 0.5)',
          bgEnd: 'rgba(22, 163, 74, 0)',
          particleColors: ['text-green-500', 'text-lime-500', 'text-green-700'],
          particleSymbols: ['↟', '✧', '▲', '◢'],
        };
      default:
        return {
          icon: '✨',
          mainColor: 'text-purple-500',
          glowColor: '#8b5cf6',
          bgStart: 'rgba(139, 92, 246, 0.5)',
          bgEnd: 'rgba(139, 92, 246, 0)',
          particleColors: ['text-purple-400', 'text-fuchsia-300', 'text-pink-400'],
          particleSymbols: ['✦', '✧', '✴', '✷'],
        };
    }
  };

  // Get class-accurate visuals
  const heroPowerInfo = getHeroPowerInfo();
  const particleCount = 15; // Uses many particles

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Initial hero power activation flash - Uses a distinct flash */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              left: position.x - 50,
              top: position.y - 50,
              width: 100,
              height: 100,
              zIndex: 49,
              background: `radial-gradient(circle, ${heroPowerInfo.bgStart} 0%, ${heroPowerInfo.bgEnd} 70%)`,
              filter: "blur(3px)"
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: [0, 0.8, 0],
              scale: [0.8, 1.5, 2]
            }}
            transition={{ 
              duration: 0.5,
              times: [0, 0.3, 1]
            }}
          />
          
          {/* Main hero power icon with the game's shine and pop */}
          <motion.div
            className="absolute z-50 pointer-events-none"
            style={{
              left: position.x - 35,
              top: position.y - 35,
              transformOrigin: "center"
            }}
            initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
            animate={{ 
              opacity: [0, 1, 1, 0.8, 0],
              scale: [0.5, 1.4, 1.3, 1.2, 0.8], // the game's characteristic pop effect
              rotate: [-15, 15, -5, 0], // The slight wobble just like in HS
            }}
            transition={{
              duration,
              times: [0, 0.2, 0.4, 0.8, 1],
              ease: "easeOut",
            }}
          >
            {/* Hero power with glowing effect */}
            <div 
              className={`text-5xl font-bold ${heroPowerInfo.mainColor}`}
              style={{
                filter: `drop-shadow(0 0 5px ${heroPowerInfo.glowColor})`,
                textShadow: `0 0 10px ${heroPowerInfo.glowColor}, 0 0 20px ${heroPowerInfo.glowColor}, 0 1px 1px rgba(0,0,0,0.5)`,
              }}
            >
              {heroPowerInfo.icon}
            </div>
            
            {/* Circular glow ring - Uses this */}
            <motion.div
              className="absolute rounded-full border-2 border-opacity-70 pointer-events-none"
              style={{
                left: "8%",
                top: "8%",
                width: "85%",
                height: "85%",
                borderColor: heroPowerInfo.glowColor,
                zIndex: -1,
              }}
              animate={{ 
                scale: [0.8, 1.2, 1.5],
                opacity: [0.8, 0.4, 0],
              }}
              transition={{ duration: 0.7, delay: 0.1 }}
            />
          </motion.div>
          
          {/* Ripple effect - the game's hero powers create outward ripples */}
          {showRipple && (
            <>
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={`ripple-${i}`}
                  className="absolute rounded-full border-2 border-opacity-60 pointer-events-none"
                  style={{
                    left: position.x - 25,
                    top: position.y - 25,
                    width: 50, 
                    height: 50,
                    borderColor: heroPowerInfo.glowColor,
                    zIndex: 48,
                  }}
                  initial={{ opacity: 0.8, scale: 0.8 }}
                  animate={{ 
                    opacity: 0,
                    scale: 3,
                  }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.15,
                    ease: "easeOut"
                  }}
                />
              ))}
            </>
          )}
          
          {/* Particle effects - the game's hero powers have class-specific particles */}
          {showParticles && (
            <>
              {[...Array(particleCount)].map((_, i) => {
                // Scatters particles in all directions
                const angle = (i / particleCount) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
                const baseDistance = 20 + Math.random() * 60;
                const finalDistance = baseDistance * (1 + Math.random() * 0.3);
                
                // Some particles appear slightly later - just like in HS
                const delay = 0.05 + (i / particleCount) * 0.2 + (Math.random() * 0.1);
                const particleSpeed = 0.6 + Math.random() * 0.4;
                
                // Calculate motion path
                const x = Math.cos(angle) * finalDistance;
                const y = Math.sin(angle) * finalDistance;
                
                // Use class-specific particle styles
                const symbol = heroPowerInfo.particleSymbols[Math.floor(Math.random() * heroPowerInfo.particleSymbols.length)];
                const color = heroPowerInfo.particleColors[Math.floor(Math.random() * heroPowerInfo.particleColors.length)];
                
                // Vary particle size - Uses different sized particles
                const size = 10 + Math.random() * 10;
                
                return (
                  <motion.div
                    key={`hp-particle-${i}`}
                    className={`absolute ${color} font-bold pointer-events-none`}
                    style={{
                      left: position.x,
                      top: position.y,
                      fontSize: size,
                      lineHeight: 1,
                      zIndex: 45,
                      filter: `drop-shadow(0 0 3px ${heroPowerInfo.glowColor})`,
                    }}
                    initial={{ 
                      opacity: 0,
                      scale: 0.5,
                      x: 0,
                      y: 0,
                      rotate: Math.random() * 180 - 90
                    }}
                    animate={{
                      opacity: [0, 0.9, 0],
                      scale: [0.5, 1.2, 0.8],
                      rotate: [Math.random() * 180 - 90, Math.random() * 360 - 180],
                      x: x,
                      y: y
                    }}
                    transition={{
                      duration: particleSpeed,
                      delay: delay,
                      ease: "easeOut",
                    }}
                  >
                    {symbol}
                  </motion.div>
                );
              })}
              
              {/* Central flash */}
              <motion.div
                className="absolute rounded-full bg-white pointer-events-none"
                style={{
                  left: position.x - 15,
                  top: position.y - 15,
                  width: 30,
                  height: 30,
                  filter: "blur(5px)",
                  zIndex: 47
                }}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ 
                  opacity: [0, 0.8, 0],
                  scale: [0.2, 1, 0] 
                }}
                transition={{ 
                  duration: 0.4, 
                  delay: 0.1,
                  ease: "easeOut"
                }}
              />
            </>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

// Shield break effect for Divine Shield - enhanced CCG-style
export const ShieldBreakEffect: React.FC<{
  position: Position;
  duration?: number;
  onComplete?: () => void;
}> = ({
  position,
  duration = 1,
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showShield, setShowShield] = useState(true);
  const [showShatter, setShowShatter] = useState(false);
  const [showRipple, setShowRipple] = useState(false);

  useEffect(() => {
    // Create sequence standard CCG style
    // 1. Initial shield bubble
    setShowShield(true);
    
    // 2. Break effect after a short delay
    const shatterTimer = setTimeout(() => {
      setShowShatter(true);
      setShowShield(false); // Hide the shield once it breaks
      
      // 3. Expanding ripple right after shatter
      setTimeout(() => {
        setShowRipple(true);
      }, 50);
    }, 100);
    
    // Complete the animation
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, duration * 1000);

    return () => {
      clearTimeout(timer);
      clearTimeout(shatterTimer);
    };
  }, [duration, onComplete]);

  // Generate shield particles - Uses many small shards
  const particleCount = 16;
  
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* the game's golden shield bubble */}
          {showShield && (
            <motion.div
              className="absolute z-50 pointer-events-none"
              style={{
                left: position.x - 35,
                top: position.y - 35,
                width: 70,
                height: 70,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(173,216,230,0.2) 0%, rgba(173,216,230,0.1) 100%)",
                border: "2px solid rgba(135, 206, 250, 0.6)",
                boxShadow: "0 0 15px rgba(135, 206, 250, 0.7), inset 0 0 8px rgba(255, 255, 255, 0.8)"
              }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ 
                opacity: [0, 0.9],
                scale: [0.6, 1.1, 1],
              }}
              transition={{
                duration: 0.3,
                times: [0, 0.6, 1],
                ease: "easeOut",
              }}
            >
              {/* Shield star effect inside */}
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <motion.div
                  className="text-4xl text-blue-100"
                  animate={{ 
                    rotate: [0, 25, -25, 0],
                    scale: [0.8, 1.2, 0.9, 1]
                  }}
                  transition={{ 
                    duration: 0.4, 
                    repeat: 1,
                    repeatType: "reverse" 
                  }}
                  style={{ filter: "drop-shadow(0 0 5px rgba(255, 255, 255, 0.8))" }}
                >
                  ✦
                </motion.div>
              </div>
            </motion.div>
          )}
          
          {/* Shield break effect - Exactly standard CCG style's sequence */}
          {showShatter && (
            <>
              {/* Initial bright flash - Uses a bright central flash */}
              <motion.div
                className="absolute rounded-full bg-white pointer-events-none"
                style={{
                  left: position.x - 30,
                  top: position.y - 30,
                  width: 60,
                  height: 60,
                  zIndex: 51,
                  filter: "blur(4px)"
                }}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, 0.9, 0],
                  scale: [0.5, 1.2, 1.5]
                }}
                transition={{ 
                  duration: 0.3,
                  times: [0, 0.2, 1],
                  ease: "easeOut"
                }}
              />
              
              {/* Main gold/blue flash ring that appears in the game */}
              <motion.div
                className="absolute rounded-full border-4 border-blue-300 pointer-events-none"
                style={{
                  left: position.x - 40,
                  top: position.y - 40,
                  width: 80,
                  height: 80,
                  zIndex: 50,
                  boxShadow: "0 0 10px rgba(255, 255, 255, 0.8), inset 0 0 10px rgba(173, 216, 230, 0.8)",
                  background: "radial-gradient(circle, rgba(255,223,186,0.3) 0%, rgba(173,216,230,0.1) 100%)",
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: [0, 0.8, 0],
                  scale: [0.9, 1.1, 1.4]
                }}
                transition={{ 
                  duration: 0.4,
                  times: [0, 0.3, 1],
                  ease: "easeOut"
                }}
              />
              
              {/* Glass shards - the game's characteristic shield break particles */}
              {[...Array(particleCount)].map((_, i) => {
                // Create a full circle of particles
                const angle = (i * 360 / particleCount) + (Math.random() * 15 - 7.5);
                const distance = 35 + Math.random() * 45;
                const delay = (i % 3) * 0.03; // Stagger particles in groups of 3
                
                // Vary shard sizes - Uses different sized shards
                const size = 3 + Math.random() * 8;
                const isLarger = Math.random() > 0.7;
                const finalSize = isLarger ? size * 1.5 : size;
                
                // Calculate motion path
                const radians = angle * (Math.PI / 180);
                const x = Math.cos(radians) * distance;
                const y = Math.sin(radians) * distance;
                
                // Uses blue/gold/silver tinted shards
                const colorType = Math.random();
                let background;
                
                if (colorType < 0.4) {
                  // Blue shield shard
                  const blueValue = 200 + Math.floor(Math.random() * 55);
                  background = `rgba(120, 180, ${blueValue}, ${0.7 + Math.random() * 0.3})`;
                } else if (colorType < 0.7) {
                  // Gold/yellow shard
                  background = `rgba(255, ${200 + Math.floor(Math.random() * 55)}, 100, ${0.7 + Math.random() * 0.3})`;
                } else {
                  // White/silver shard
                  const whiteValue = 220 + Math.floor(Math.random() * 35);
                  background = `rgba(${whiteValue}, ${whiteValue}, ${whiteValue}, ${0.7 + Math.random() * 0.3})`;
                }
                
                // Shards have different shapes
                const shapeType = Math.floor(Math.random() * 3);
                let clipPath;
                
                if (shapeType === 0) {
                  // Triangular shard
                  clipPath = `polygon(50% 0%, 100% 100%, 0% 100%)`;
                } else if (shapeType === 1) {
                  // Diamond shard
                  clipPath = `polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)`;
                } else {
                  // Irregular shard
                  const x1 = 25 + Math.random() * 50;
                  const y1 = Math.random() * 30;
                  const x2 = 70 + Math.random() * 30;
                  const y2 = 40 + Math.random() * 20;
                  const x3 = 40 + Math.random() * 40;
                  const y3 = 70 + Math.random() * 30;
                  const x4 = Math.random() * 30;
                  const y4 = 30 + Math.random() * 40;
                  
                  clipPath = `polygon(${x1}% ${y1}%, ${x2}% ${y2}%, ${x3}% ${y3}%, ${x4}% ${y4}%)`;
                }
                
                return (
                  <motion.div
                    key={`shield-shard-${i}`}
                    className="absolute pointer-events-none"
                    style={{
                      left: position.x - finalSize/2,
                      top: position.y - finalSize/2,
                      width: finalSize,
                      height: finalSize,
                      zIndex: 50,
                      background,
                      boxShadow: '0 0 4px rgba(255, 255, 255, 0.8)',
                      clipPath,
                      transformOrigin: "center"
                    }}
                    initial={{ 
                      opacity: 0, 
                      scale: 0.2,
                      x: 0,
                      y: 0,
                      rotate: Math.random() * 180 - 90
                    }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0.8],
                      rotate: Math.random() * 720 - 360, // Spin as it flies out
                      x: [0, x * 0.3, x], // Accelerate outward
                      y: [0, y * 0.3, y]
                    }}
                    transition={{
                      duration: 0.5 + Math.random() * 0.3,
                      delay: delay,
                      times: [0, 0.3, 1],
                      ease: "easeOut"
                    }}
                  />
                );
              })}
              
              {/* Light rays emitted at break */}
              {[...Array(8)].map((_, i) => {
                const angle = i * 45;
                const distance = 60;
                
                const radians = angle * (Math.PI / 180);
                const endX = Math.cos(radians) * distance;
                const endY = Math.sin(radians) * distance;
                
                return (
                  <motion.div
                    key={`light-ray-${i}`}
                    className="absolute bg-blue-200 pointer-events-none"
                    style={{
                      left: position.x,
                      top: position.y,
                      width: 2,
                      height: 30,
                      zIndex: 49,
                      transformOrigin: 'center bottom',
                      transform: `rotate(${angle}deg)`,
                      boxShadow: '0 0 5px rgba(135, 206, 250, 0.8)',
                      opacity: 0.6
                    }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: [0, 1, 0] }}
                    transition={{ 
                      duration: 0.4, 
                      times: [0, 0.3, 1],
                      ease: "easeOut"
                    }}
                  />
                );
              })}
            </>
          )}
          
          {/* Expanding ripple effect that follows the break */}
          {showRipple && (
            <motion.div
              className="absolute rounded-full border-2 border-blue-300 pointer-events-none"
              style={{
                left: position.x - 30,
                top: position.y - 30,
                width: 60,
                height: 60,
                zIndex: 48,
                borderColor: 'rgba(135, 206, 250, 0.5)',
                boxShadow: '0 0 5px rgba(255, 255, 255, 0.5)'
              }}
              initial={{ opacity: 0.7, scale: 1 }}
              animate={{ 
                opacity: 0,
                scale: 3,
                borderWidth: 1
              }}
              transition={{ 
                duration: 0.6,
                ease: "easeOut"
              }}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
};