// Import necessary hooks and AWS SDK
import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid'

// Define the React component, receiving `imageSrc` as a prop
const ReferenceObject = ({ imageSrc }) => {
  // State hooks to manage component state
  const [referenceDimensions, setreferenceDimensions] = useState(''); // Stores patient ID
  const [lineLength, setLineLength] = useState([]); // Stores lengths of drawn lines
  const [line, setLine] = useState([]); // Stores line coordinates
  const [drawing, setDrawing] = useState(false); // Flag to manage drawing state
  const [selectedPoint, setSelectedPoint] = useState('start'); // New state for selected point
  const [selectedLineIndex, setSelectedLineIndex] = useState(null); // For joystick to know which line to adjust

  const navigate = useNavigate();

  // Canvas dimensions
  const canvasWidth = 378;
  const canvasHeight = 504;
  // Refs for both the image and lines canvas elements
  const imageCanvasRef = useRef(null);
  const linesCanvasRef = useRef(null);


  // Effect hook to draw the image on the canvas when the image source changes
  useEffect(() => {
    const drawImageOnCanvas = () => {
      const imageCanvas = imageCanvasRef.current;
      const imageCtx = imageCanvas.getContext('2d');

      const image = new Image();
      image.src = imageSrc; // Set image source

      // Draw the image on the canvas once it's loaded
      image.onload = () => {
        // Calculate scale to fit the image within the canvas dimensions
        const scale = Math.min(canvasWidth / image.width, canvasHeight / image.height);
        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;

        // Calculate start position to center the image
        const startX = (canvasWidth - scaledWidth) / 2;
        const startY = (canvasHeight - scaledHeight) / 2;

        // Draw the image
        imageCtx.drawImage(image, startX, startY, scaledWidth, scaledHeight);
      };
    };

    drawImageOnCanvas();
  }, [imageSrc]);

  // Effect hook to handle touch events for drawing lines
  useEffect(() => {
    const canvas = linesCanvasRef.current;
    const ctx = canvas.getContext('2d');
  
    // const selectLine = (offsetX, offsetY) => {
    //   console.log('offsetX:', offsetX); 
    //   console.log('offsetY:', offsetY); 
    
    //   let lineSelected = false; // Flag to indicate if a line has been selected
    
    //   // Loop through lines to find the clicked line
    //   line.forEach((line, index) => {
    //     // Check if the click position is within the bounding box of the line
    //     if (
    //       offsetX >= Math.min(line.startX, line.endX) &&
    //       offsetX <= Math.max(line.startX, line.endX) &&
    //       offsetY >= Math.min(line.startY, line.endY) &&
    //       offsetY <= Math.max(line.startY, line.endY)
    //     ) {
    //       // If the line is clicked, set the selectedLineIndex
    //       setSelectedLineIndex(index);
    //       lineSelected = true; // Set flag to true
    //     }
    //   });
    
    //   console.log(lineSelected)
    //   // If no line was selected, reset the selectedLineIndex to null
    //   if (!lineSelected) {
    //     setSelectedLineIndex(null);
    //   }
    // };
    

    // Start drawing line
    const handleTouchStart = (e) => {
      e.preventDefault(); // Prevent scrolling/zooming on touch
      const touch = e.touches[0]; // Get the first touch point
      const rect = canvas.getBoundingClientRect(); // Get canvas position
      // Calculate touch position relative to the canvas
      const offsetX = touch.clientX - rect.left;
      const offsetY = touch.clientY - rect.top;
      // Limit the number of lines to 1 and start drawing
      if (line.length < 1) {
        setLine([...line, { startX: offsetX, startY: offsetY, endX: offsetX, endY: offsetY }]);
        setDrawing(true);
        // selectLine(offsetX, offsetY);
      }
    };

    // Update line end position
    const handleTouchMove = (e) => {
      e.preventDefault();
      if (!drawing) return; // Exit if not in drawing mode
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const offsetX = touch.clientX - rect.left;
      const offsetY = touch.clientY - rect.top;
      const lastIndex = line.length - 1;
      const updatedLine = [...line];
      // Update the current line's end position
      updatedLine[lastIndex] = {
        ...updatedLine[lastIndex],
        endX: offsetX,
        endY: offsetY
      };
      setLine(updatedLine);
    };

   

    // End drawing
    const handleTouchEnd = () => {
      setDrawing(false);
      calculateLineLengths();
    };

    
    // Add event listeners for touch start, move, and end
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    // Cleanup function to remove event listeners
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [drawing, line]); // Re-run effect if `drawing` or `lines` state changes

  // Calculate lengths of all lines
  const calculateLineLengths = () => {
    const lengths = line.map((line) => {
      const dx = line.endX - line.startX;
      const dy = line.endY - line.startY;
      // Pythagorean theorem to calculate line length
      return Math.sqrt(dx * dx + dy * dy);
    });
    setLineLength(lengths);
  };

  // Draw lines on the canvas
  const drawLines = () => {
    const canvas = linesCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous lines

    // lines.forEach(line => {
    //   ctx.beginPath();
    //   ctx.moveTo(line.startX, line.startY);
    //   ctx.lineTo(line.endX, line.endY);
    //   ctx.strokeStyle = 'blue'; // Line color
    //   ctx.lineWidth = 2; // Line width
    //   ctx.stroke();
    //   ctx.closePath();

    line.forEach((line, index) => {
      ctx.beginPath();
      ctx.moveTo(line.startX, line.startY);
      ctx.lineTo(line.endX, line.endY);
      ctx.strokeStyle = index === selectedLineIndex ? 'blue' : 'blue'; // Highlight selected line
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.closePath();

      // Calculate and log line length
      const length = Math.sqrt(Math.pow(line.endX - line.startX, 2) + Math.pow(line.endY - line.startY, 2));
      console.log(length)

      // Display line length next to the line
      ctx.font = '12px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText(`${length.toFixed(2)} px`, (line.startX + line.endX) / 2, (line.startY + line.endY) / 2);
    });
  };

  const adjustLine = (direction, point) => {
    console.log('Adjusting point:', direction); 
    setSelectedLineIndex(0);
    setSelectedPoint(point); // Set the selected point
    console.log('selectedLineIndex:', selectedLineIndex); 
    const adjustment = 1;
  
    setLine((prevLines) => {
      // Create a copy of the previous lines array
      const newLines = [...prevLines];
      // Retrieve the selected line based on the selected index
      const line = newLines[selectedLineIndex];
  
      // Guard against no selected line
      if (!line) return prevLines;
  
      // Adjust line coordinates based on the selected point and direction
      if (point === 'start') {
        switch (direction) {
          case 'up':
            line.startY -= adjustment;
            if (line.startY < 0) line.startY = 0; // Ensure startY doesn't go below 0
            break;
          case 'down':
            line.startY += adjustment;
            break;
          case 'left':
            line.startX -= adjustment;
            if (line.startX < 0) line.startX = 0; // Ensure startX doesn't go below 0
            break;
          case 'right':
            line.startX += adjustment;
            break;
          default:
            break;
        }
      } else if (point === 'end') {
        switch (direction) {
          case 'up':
            line.endY -= adjustment;
            if (line.endY < 0) line.endY = 0; // Ensure endY doesn't go below 0
            break;
          case 'down':
            line.endY += adjustment;
            break;
          case 'left':
            line.endX -= adjustment;
            if (line.endX < 0) line.endX = 0; // Ensure endX doesn't go below 0
            break;
          case 'right':
            line.endX += adjustment;
            break;
          default:
            break;
        }
      }
  
      // Update the new lines array
      newLines[selectedLineIndex] = line;
      const lengths = newLines.map((line) => {
        const dx = line.endX - line.startX;
        const dy = line.endY - line.startY;
        // Pythagorean theorem to calculate line length
        return Math.sqrt(dx * dx + dy * dy);
      });
      setLineLength(lengths); // Update line lengths
      return newLines;
    });
  };



  // Effect hook to re-draw lines when the `lines` state changes
  useEffect(() => {
    drawLines();
  }, [line]);

  // Reset lines and clear canvas
  const resetLines = () => {
    setLine([]);
    setLineLength([]);
    const linesCanvas = linesCanvasRef.current;
    const linesCtx = linesCanvas.getContext('2d');
    linesCtx.clearRect(0, 0, linesCanvas.width, linesCanvas.height);
  };

  // Submit drawing and line lengths to backend
  const submit = async () => {
    if (lineLength.length < 1) {
      alert('Please draw all lines before submitting.');
      return;
    }

    // Create a new canvas to merge the image and lines for submission
    const imageCanvas = imageCanvasRef.current;
    const linesCanvas = linesCanvasRef.current;
    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = canvasWidth;
    mergedCanvas.height = canvasHeight;
    const mergedCtx = mergedCanvas.getContext('2d');

    // Draw image and lines on the merged canvas
    mergedCtx.drawImage(imageCanvas, 0, 0, canvasWidth, canvasHeight);
    mergedCtx.drawImage(linesCanvas, 0, 0, canvasWidth, canvasHeight);

    navigate('/draw', { state: { referenceDimensions: referenceDimensions, pixelLength: lineLength, imageSrc: imageSrc } });


    // Reset lines and patient ID after submission
    setLine([]);
    setreferenceDimensions('');

  };

  // Render the component
  return (
    <div className="relative h-screen flex flex-col justify-center items-center">
      {/* Canvas for the image */}
      <canvas
        ref={imageCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{ position: 'absolute', top: '0', zIndex: 1 }}
      />
      {/* Canvas for drawing lines */}
      <canvas
        ref={linesCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{ position: 'absolute', top: '0', zIndex: 2, touchAction: 'none' }}
      />

      {/* UI for displaying information and actions */}
      <div className=" absolute bottom-20">
      {/* <div className="container mx-auto sm:px-6 lg:px-8"> */}
        {/* Input for patient ID */}
        <label className="text-sm font-semibold mb-1 block">Refrence dimensions:</label>
        <input
          type="text"
          value={referenceDimensions}
          onChange={(e) => setreferenceDimensions(e.target.value)}
          className="border rounded-md p-2 mb-2"
        />

<div className="flex">
    <div className="isolate inline-flex flex-col items-center rounded-md shadow-sm">
  <button onClick={() => adjustLine('up', 'start')}
    type="button"
    className="relative inline-flex items-center rounded-t-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
  >
    <span className="sr-only">Previous</span>
    <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
  </button>
  <span className="isolate inline-flex rounded-md shadow-sm border-t border-transparent">
    <button onClick={() => adjustLine('left','start')}
      type="button"
      className="relative inline-flex items-center rounded-l-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
    >
      <span className="sr-only">Previous</span>
      <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
    </button>
    <button onClick={() => adjustLine('right','start')}
      type="button"
      className="relative -ml-px inline-flex items-center rounded-r-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
    >
      <span className="sr-only">Next</span>
      <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
    </button>
  </span>
  <button onClick={() => adjustLine('down','start')}
    type="button"
    className="relative -mt-px inline-flex items-center rounded-b-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
  >
    <span className="sr-only">Next</span>
    <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
  </button>
</div>

 <div style={{ width: '50px' }}></div>

<div className="isolate inline-flex flex-col items-center rounded-md shadow-sm">
  <button onClick={() => adjustLine('up', 'end')}
    type="button"
    className="relative inline-flex items-center rounded-t-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
  >
    <span className="sr-only">Previous</span>
    <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
  </button>
  <span className="isolate inline-flex rounded-md shadow-sm border-t border-transparent">
    <button onClick={() => adjustLine('left','end')}
      type="button"
      className="relative inline-flex items-center rounded-l-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
    >
      <span className="sr-only">Previous</span>
      <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
    </button>
    <button onClick={() => adjustLine('right','end')}
      type="button"
      className="relative -ml-px inline-flex items-center rounded-r-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
    >
      <span className="sr-only">Next</span>
      <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
    </button>
  </span>
  <button onClick={() => adjustLine('down','end')}
    type="button"
    className="relative -mt-px inline-flex items-center rounded-b-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
  >
    <span className="sr-only">Next</span>
    <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
  </button>
</div>
</div>

<div style={{ margin: '0 10px' }}></div>
{lineLength.map((length, index) => (
  <div key={index}>{`Length ${index + 1}: ${length.toFixed(2)} px`}</div>
))}
        {/* Buttons for reset and submit */}
        <div className="flex">
          <button
            onClick={resetLines}
            className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded-md ml-2"
          >
            Reset
          </button>
          <button
            onClick={submit}
            className="bg-green-500 text-white py-2 px-4 rounded-md ml-2"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

// Export the component for use in other parts of the application
export default ReferenceObject;


