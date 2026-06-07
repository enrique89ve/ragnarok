import React from 'react';

interface MovePlateProps {
  isAttack: boolean;
  onClick: () => void;
  isMotionEnabled?: boolean;
}

const MovePlate: React.FC<MovePlateProps> = ({ isAttack, onClick, isMotionEnabled = true }) => {
  const motionClass = isMotionEnabled ? 'hover:scale-105 transition-transform duration-80 ease-out' : '';
  const markerStyle = isAttack
    ? {
        width: '20px',
        height: '20px',
        backgroundColor: 'rgba(254, 226, 226, 0.98)',
        border: '3px solid rgba(248, 113, 113, 0.98)',
        boxShadow: '0 0 20px rgba(248, 113, 113, 0.95), inset 0 0 8px rgba(254, 226, 226, 0.75)',
      }
    : {
        width: '12px',
        height: '12px',
        backgroundColor: 'rgba(74, 222, 128, 0.95)',
        border: '2px solid rgba(220, 252, 231, 0.95)',
        boxShadow: '0 0 10px rgba(74, 222, 128, 0.9)',
      };

  const plateStyle = isAttack
    ? {
        backgroundColor: 'rgba(127, 29, 29, 0.38)',
        boxShadow: 'inset 0 0 0 2px rgba(254, 226, 226, 0.45), 0 0 20px rgba(248, 113, 113, 0.75)',
      }
    : {
        backgroundColor: 'rgba(22, 163, 74, 0.32)',
        boxShadow: 'inset 0 0 0 2px rgba(220, 252, 231, 0.35), 0 0 10px rgba(34, 197, 94, 0.55)',
      };

  return (
    <div
      className={`
        move-plate w-full h-full flex items-center justify-center
        rounded-lg cursor-pointer
        ${motionClass}
        ${isAttack
          ? 'bg-red-500/40 hover:bg-red-500/60 border-2 border-red-400'
          : 'bg-green-500/40 hover:bg-green-500/60 border-2 border-green-400'
        }
      `}
      onClick={onClick}
      style={{
        transition: isMotionEnabled ? 'transform 80ms ease-out, opacity 80ms ease-out' : 'none',
        ...plateStyle,
      }}
    >
      <span
        className="inline-block rounded-full block"
        style={markerStyle}
      />
    </div>
  );
};

export default React.memo(MovePlate);
