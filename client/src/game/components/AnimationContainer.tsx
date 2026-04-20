import React, { useEffect, useState } from 'react';
import { Position } from '../types';
import { 
  AttackAnimation, 
  DamageEffect, 
  HealEffect, 
  BuffEffect, 
  ShieldBreakEffect,
  HeroPowerEffect
} from './AttackAnimation';
import {
  ManaCrystalGainAnimation,
  ManaCrystalUseAnimation,
  OverloadedManaAnimation
} from './ManaAnimation';

// Type for different animations we can show
export type AnimationType = 
  | 'attack' 
  | 'damage' 
  | 'heal' 
  | 'buff' 
  | 'shield_break'
  | 'hero_power'
  | 'mana_gain'
  | 'mana_use'
  | 'overload';

// Animation data interface
interface Animation {
  id: string;
  type: AnimationType;
  startPosition?: Position;
  endPosition?: Position;
  position?: Position;
  amount?: number;
  attackBuff?: number;
  healthBuff?: number;
  duration?: number;
  heroClass?: 'mage' | 'warrior' | 'paladin' | 'hunter';
  temporary?: boolean; // For temporary mana gain
}

// Props for the animation container
interface AnimationContainerProps {
  animations: Animation[];
  onAnimationComplete: (id: string) => void;
}

export const AnimationContainer: React.FC<AnimationContainerProps> = ({
  animations,
  onAnimationComplete
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {animations.map(animation => {
        switch (animation.type) {
          case 'attack':
            return animation.startPosition && animation.endPosition ? (
              <AttackAnimation
                key={animation.id}
                startPosition={animation.startPosition}
                endPosition={animation.endPosition}
                duration={animation.duration}
                onComplete={() => onAnimationComplete(animation.id)}
              />
            ) : null;
            
          case 'damage':
            return animation.position && animation.amount ? (
              <DamageEffect
                key={animation.id}
                position={animation.position}
                amount={animation.amount}
                duration={animation.duration}
                onComplete={() => onAnimationComplete(animation.id)}
              />
            ) : null;
            
          case 'heal':
            return animation.position && animation.amount ? (
              <HealEffect
                key={animation.id}
                position={animation.position}
                amount={animation.amount}
                duration={animation.duration}
                onComplete={() => onAnimationComplete(animation.id)}
              />
            ) : null;
            
          case 'buff':
            return animation.position ? (
              <BuffEffect
                key={animation.id}
                position={animation.position}
                attackBuff={animation.attackBuff}
                healthBuff={animation.healthBuff}
                duration={animation.duration}
                onComplete={() => onAnimationComplete(animation.id)}
              />
            ) : null;
            
          case 'shield_break':
            return animation.position ? (
              <ShieldBreakEffect
                key={animation.id}
                position={animation.position}
                duration={animation.duration}
                onComplete={() => onAnimationComplete(animation.id)}
              />
            ) : null;
            
          case 'hero_power':
            return animation.position && animation.heroClass ? (
              <HeroPowerEffect
                key={animation.id}
                position={animation.position}
                heroClass={animation.heroClass}
                duration={animation.duration}
                onComplete={() => onAnimationComplete(animation.id)}
              />
            ) : null;
            
          case 'mana_gain':
            return animation.position && animation.amount ? (
              <ManaCrystalGainAnimation
                key={animation.id}
                position={animation.position}
                amount={animation.amount}
                temporary={animation.temporary}
                duration={animation.duration}
                onComplete={() => onAnimationComplete(animation.id)}
              />
            ) : null;
            
          case 'mana_use':
            return animation.position && animation.amount ? (
              <ManaCrystalUseAnimation
                key={animation.id}
                position={animation.position}
                amount={animation.amount}
                duration={animation.duration}
                onComplete={() => onAnimationComplete(animation.id)}
              />
            ) : null;
            
          case 'overload':
            return animation.position && animation.amount ? (
              <OverloadedManaAnimation
                key={animation.id}
                position={animation.position}
                amount={animation.amount}
                duration={animation.duration}
                onComplete={() => onAnimationComplete(animation.id)}
              />
            ) : null;
            
          default:
            return null;
        }
      })}
    </div>
  );
};

// Custom hook to manage animations
export function useAnimations() {
  const [animations, setAnimations] = useState<Animation[]>([]);
  
  // Generate a unique ID for each animation
  const generateId = () => `anim_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  
  // Add a new animation
  const addAnimation = (animation: Omit<Animation, 'id'>) => {
    const newAnimation = {
      ...animation,
      id: generateId()
    };
    
    setAnimations(prev => [...prev, newAnimation]);
    return newAnimation.id;
  };
  
  // Remove an animation once it's complete
  const removeAnimation = (id: string) => {
    setAnimations(prev => prev.filter(anim => anim.id !== id));
  };
  
  // Add attack animation
  const addAttackAnimation = (
    startPosition: Position, 
    endPosition: Position, 
    duration = 0.5
  ) => {
    return addAnimation({
      type: 'attack',
      startPosition,
      endPosition,
      duration
    });
  };
  
  // Add damage effect
  const addDamageEffect = (
    position: Position, 
    amount: number, 
    duration = 1
  ) => {
    return addAnimation({
      type: 'damage',
      position,
      amount,
      duration
    });
  };
  
  // Add heal effect
  const addHealEffect = (
    position: Position, 
    amount: number, 
    duration = 1
  ) => {
    return addAnimation({
      type: 'heal',
      position,
      amount,
      duration
    });
  };
  
  // Add buff effect
  const addBuffEffect = (
    position: Position, 
    attackBuff: number = 0,
    healthBuff: number = 0,
    duration = 1
  ) => {
    return addAnimation({
      type: 'buff',
      position,
      attackBuff,
      healthBuff,
      duration
    });
  };
  
  // Add shield break effect
  const addShieldBreakEffect = (
    position: Position, 
    duration = 1
  ) => {
    return addAnimation({
      type: 'shield_break',
      position,
      duration
    });
  };
  
  // Add hero power effect
  const addHeroPowerEffect = (
    position: Position,
    heroClass: 'mage' | 'warrior' | 'paladin' | 'hunter',
    duration = 1.2
  ) => {
    return addAnimation({
      type: 'hero_power',
      position,
      heroClass,
      duration
    });
  };
  
  // Add mana gain animation
  const addManaGainAnimation = (
    position: Position,
    amount: number,
    temporary: boolean = false,
    duration = 1.5
  ) => {
    return addAnimation({
      type: 'mana_gain',
      position,
      amount,
      temporary,
      duration
    });
  };
  
  // Add mana use animation
  const addManaUseAnimation = (
    position: Position,
    amount: number,
    duration = 1.2
  ) => {
    return addAnimation({
      type: 'mana_use',
      position,
      amount,
      duration
    });
  };
  
  // Add overload animation
  const addOverloadAnimation = (
    position: Position,
    amount: number,
    duration = 1.8
  ) => {
    return addAnimation({
      type: 'overload',
      position,
      amount,
      duration
    });
  };
  
  return {
    animations,
    removeAnimation,
    addAttackAnimation,
    addDamageEffect,
    addHealEffect,
    addBuffEffect,
    addShieldBreakEffect,
    addHeroPowerEffect,
    addManaGainAnimation,
    addManaUseAnimation,
    addOverloadAnimation
  };
}