import React, { useState } from 'react';

const AnalogStick = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const moveUp = () => setPosition(prev => ({ ...prev, y: prev.y + 1 }));
  const moveDown = () => setPosition(prev => ({ ...prev, y: prev.y - 1 }));
  const moveLeft = () => setPosition(prev => ({ ...prev, x: prev.x - 1 }));
  const moveRight = () => setPosition(prev => ({ ...prev, x: prev.x + 1 }));

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Up button */}
        <button onClick={moveUp}>Up</button>
        
        {/* Left and Right buttons */}
        <div>
          <button onClick={moveLeft}>Left</button>
          <button onClick={moveRight}>Right</button>
        </div>
        
        {/* Down button */}
        <button onClick={moveDown}>Down</button>
      </div>

      {/* Displaying the current position */}
      <div>
        Current Position: X: {position.x}, Y: {position.y}
      </div>
    </div>
  );
};

export default AnalogStick;
