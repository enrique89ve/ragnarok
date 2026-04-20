import React from 'react';
import { motion } from 'framer-motion';

interface MovePlateProps {
  isAttack: boolean;
  onClick: () => void;
}

const MovePlate: React.FC<MovePlateProps> = ({ isAttack, onClick }) => {
  return (
    <motion.div
      className={`
        move-plate w-full h-full flex items-center justify-center
        rounded-lg cursor-pointer
        ${isAttack 
          ? 'bg-red-500 bg-opacity-40 hover:bg-opacity-60 border-2 border-red-400' 
          : 'bg-green-500 bg-opacity-40 hover:bg-opacity-60 border-2 border-green-400'
        }
      `}
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <span className={`text-2xl ${isAttack ? 'text-red-200' : 'text-green-200'}`}>
        {isAttack ? '⚔' : '•'}
      </span>
    </motion.div>
  );
};

export default MovePlate;
