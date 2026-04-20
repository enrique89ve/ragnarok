import React from 'react';
import { motion } from 'framer-motion';

interface ManaCurveProps {
  manaCurve: { [key: number]: number };
  maxCardCount: number;
}

/**
 * ManaCurve component - Visual representation of the deck's mana curve
 * with crystal headers and animated bars
 */
const ManaCurve: React.FC<ManaCurveProps> = ({ manaCurve, maxCardCount }) => {
  // Determine the maximum number of cards at any mana cost for scaling
  const maxCount = Math.max(...Object.values(manaCurve), 1);
  
  // Ensure all mana costs from 0 to 7+ are represented
  const manaValues = [0, 1, 2, 3, 4, 5, 6, 7];
  
  return (
    <div className="mana-curve px-2 py-4">
      <h3 className="text-sm font-bold text-gray-700 mb-2">Mana Curve</h3>
      
      <div className="flex justify-between h-24">
        {manaValues.map(mana => {
          // Get card count for this mana cost (0 if none)
          const count = manaCurve[mana] || 0;
          
          // Calculate height percentage based on max count
          const heightPercentage = Math.max((count / maxCount) * 100, 5); // Minimum 5% height for visibility
          
          return (
            <div
              key={mana}
              className="mana-column flex flex-col items-center justify-end w-full"
            >
              {/* Mana crystal header */}
              <div className="mana-cost w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-md mb-1">
                {mana === 7 ? '7+' : mana}
              </div>
              
              {/* The bar with card count display */}
              <div className="relative w-full flex flex-col items-center">
                {/* Card count indicator */}
                <div className={`card-count text-xs font-bold ${count > 0 ? 'text-blue-700' : 'text-gray-400'} mb-1`}>
                  {count}
                </div>
                
                {/* Animated bar */}
                <motion.div
                  className="w-5/6 bg-blue-400 rounded-sm"
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  style={{
                    boxShadow: count > 0 ? '0 0 5px rgba(59, 130, 246, 0.5)' : 'none',
                    backgroundColor: count > 0 ? '#3B82F6' : '#E5E7EB'
                  }}
                >
                  {/* The bar itself */}
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ManaCurve;