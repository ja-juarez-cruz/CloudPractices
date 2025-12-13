import React, { useState } from 'react';
import { motion } from 'framer-motion';

const FlipCard = ({ assignedFriend, onReveal }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(true);
    setTimeout(() => {
      onReveal();
    }, 600);
  };

  return (
    <div className="perspective-1000 w-full max-w-sm mx-auto h-64">
      <motion.div
        className="relative w-full h-full cursor-pointer"
        onClick={!isFlipped ? handleFlip : undefined}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Cara frontal */}
        <div
          className="absolute w-full h-full bg-gradient-to-br from-red-500 to-pink-500 rounded-3xl shadow-2xl flex flex-col items-center justify-center backface-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-8xl mb-4">🎁</div>
          <p className="text-white text-2xl font-bold">Toca para revelar</p>
          <p className="text-white/80 text-sm mt-2">👆 Click aquí</p>
        </div>

        {/* Cara trasera */}
        <div
          className="absolute w-full h-full bg-gradient-to-br from-green-500 to-emerald-500 rounded-3xl shadow-2xl flex flex-col items-center justify-center"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-white text-lg mb-2">Tu amigo secreto es:</p>
          <p className="text-white text-4xl font-bold">{assignedFriend}</p>
        </div>
      </motion.div>
      
      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
};

export default FlipCard;