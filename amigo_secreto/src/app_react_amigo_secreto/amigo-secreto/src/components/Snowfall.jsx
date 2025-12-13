import React, { useEffect, useState } from 'react';

const Snowfall = ({ snowflakeCount = 50 }) => {
  const [snowflakes, setSnowflakes] = useState([]);

  useEffect(() => {
    const flakes = Array.from({ length: snowflakeCount }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 5 + Math.random() * 10,
      opacity: 0.3 + Math.random() * 0.7,
      fontSize: 10 + Math.random() * 20,
      delay: Math.random() * 5
    }));
    
    setSnowflakes(flakes);
  }, [snowflakeCount]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute text-white animate-fall"
          style={{
            left: `${flake.left}%`,
            animationDuration: `${flake.animationDuration}s`,
            animationDelay: `${flake.delay}s`,
            opacity: flake.opacity,
            fontSize: `${flake.fontSize}px`,
            top: '-20px'
          }}
        >
          ❄
        </div>
      ))}
      
      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
          }
        }
        
        .animate-fall {
          animation: fall linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Snowfall;