/**
 * ActionNotification.tsx
 * 
 * A component that displays a visual notification for AI actions.
 * This enhances the game experience by providing clear feedback
 * when the AI takes actions, similar to the feedback shown for player actions.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIAction } from '../animations/AIActionManager';

interface ActionNotificationProps {
  action: AIAction | null;
}

export const ActionNotification: React.FC<ActionNotificationProps> = ({ action }) => {
  if (!action) return null;
  
  // Determine message and style based on action type
  const getMessage = () => {
    switch (action.type) {
      case 'play_card':
        return `Opponent plays ${action.card?.card.name || 'a card'}`;
      case 'attack':
        return 'Opponent attacks';
      case 'hero_power':
        return 'Opponent uses Hero Power';
      case 'end_turn':
        return 'Opponent ends turn';
      default:
        return 'Opponent takes action';
    }
  };
  
  // Determine background color based on action type
  const getBackgroundColor = () => {
    switch (action.type) {
      case 'play_card':
        return 'bg-amber-900';
      case 'attack':
        return 'bg-red-800';
      case 'hero_power':
        return 'bg-purple-800';
      case 'end_turn':
        return 'bg-blue-800';
      default:
        return 'bg-gray-800';
    }
  };
  
  // Get icon based on action type
  const getIcon = () => {
    switch (action.type) {
      case 'play_card':
        return (
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 9L17 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 13L17 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'attack':
        return (
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 10V3L4 14H11V21L20 10H13Z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'hero_power':
        return (
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 8C13.1046 8 14 7.10457 14 6C14 4.89543 13.1046 4 12 4C10.8954 4 10 4.89543 10 6C10 7.10457 10.8954 8 12 8Z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 22V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18 16L12 22L6 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'end_turn':
        return (
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 16L18 12L13 8V16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 16V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
    }
  };
  
  return (
    <AnimatePresence>
      {action && (
        <motion.div
          className={`fixed top-20 right-4 z-50 ${getBackgroundColor()} text-white px-4 py-2 rounded-lg shadow-lg flex items-center`}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.3 }}
        >
          {getIcon()}
          <span className="font-semibold">{getMessage()}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ActionNotification;