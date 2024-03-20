// Import necessary hooks and AWS SDK
import React, { useState, useRef, useEffect } from 'react';
import { Joystick } from 'react-joystick-component';
import { action } from '@storybook/addon-actions'; // Import `action` for logging
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid'
import AWS from 'aws-sdk';

// Define the React component, receiving `imageSrc` as a prop
const DrawLinesOnImage = ({ imageSrc }) => {
  // State hooks to manage component state
  const [patientID, setPatientID] = useState(''); // Stores patient ID
  const [lineLengths, setLineLengths] = useState([]); // Stores lengths of drawn lines
  const [lines, setLines] = useState([]); // Stores line coordinates
  const [drawing, setDrawing] = useState(false); // Flag to manage drawing state
  const [selectedPoint, setSelectedPoint] = useState('start'); // New state for selected point
  const [selectedLineIndex, setSelectedLineIndex] = useState(null); // For joystick to know which line to adjust

  // Canvas dimensions
  const canvasWidth = 378;
  const canvasHeight = 504;
  // Refs for both the image and lines canvas elements
  const imageCanvasRef = useRef(null);
  const linesCanvasRef = useRef(null);

  // AWS S3 configuration
  const region = "us-east-1";
  const accessKeyId = 'REDACT';
  const secretAccessKey = 'REDACT';
  // Initialize AWS S3 with the provided credentials
  const s3 = new AWS.S3({
    region,
    accessKeyId,
    secretAccessKey,
    signatureVersion: 'v4'
  });

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
  
    
    // Start drawing line
    const handleTouchStart = (e) => {
      e.preventDefault(); // Prevent scrolling/zooming on touch
      const touch = e.touches[0]; // Get the first touch point
      const rect = canvas.getBoundingClientRect(); // Get canvas position
      // Calculate touch position relative to the canvas
      const offsetX = touch.clientX - rect.left;
      const offsetY = touch.clientY - rect.top;
      // Limit the number of lines to 3 and start drawing
      if (lines.length < 3) {
        setLines([...lines, { startX: offsetX, startY: offsetY, endX: offsetX, endY: offsetY }]);
        setDrawing(true);
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
      const lastIndex = lines.length - 1;
      const updatedLines = [...lines];
      // Update the current line's end position
      updatedLines[lastIndex] = {
        ...updatedLines[lastIndex],
        endX: offsetX,
        endY: offsetY
      };
      setLines(updatedLines);
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
  }, [drawing, lines]); // Re-run effect if `drawing` or `lines` state changes

  // Calculate lengths of all lines
  const calculateLineLengths = () => {
    const lengths = lines.map((line) => {
      const dx = line.endX - line.startX;
      const dy = line.endY - line.startY;
      // Pythagorean theorem to calculate line length
      return Math.sqrt(dx * dx + dy * dy);
    });
    setLineLengths(lengths);
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

    lines.forEach((line, index) => {
      ctx.beginPath();
      ctx.moveTo(line.startX, line.startY);
      ctx.lineTo(line.endX, line.endY);
      ctx.strokeStyle = index === selectedLineIndex ? 'red' : 'blue'; // Highlight selected line
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

  const adjustPoint = (direction) => {
    const adjustment = 2;
    setLines((prevLines) => {
      const newLines = [...prevLines];
      const line = newLines[selectedLineIndex];
      if (!line) return prevLines; // Guard against no selected line
      
      if (selectedPoint === 'start') {
        switch (direction) {
          case 'up': line.startY -= adjustment; break;
          case 'down': line.startY += adjustment; break;
          case 'left': line.startX -= adjustment; break;
          case 'right': line.startX += adjustment; break;
          default: break;
        }
      } else {
        switch (direction) {
          case 'up': line.endY -= adjustment; break;
          case 'down': line.endY += adjustment; break;
          case 'left': line.endX -= adjustment; break;
          case 'right': line.endX += adjustment; break;
          default: break;
        }
      }
      return newLines;
    });
  };




// Logic to reset lines


  // Effect hook to re-draw lines when the `lines` state changes
  useEffect(() => {
    drawLines();
  }, [lines]);

  // Reset lines and clear canvas
  const resetLines = () => {
    setLines([]);
    setLineLengths([]);
    const linesCanvas = linesCanvasRef.current;
    const linesCtx = linesCanvas.getContext('2d');
    linesCtx.clearRect(0, 0, linesCanvas.width, linesCanvas.height);
  };

  // Submit drawing and line lengths to backend
  const submit = async () => {
    if (lineLengths.length < 4) {
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

    // Convert merged canvas to a Blob for upload
    const mergedBlob = await new Promise((resolve) => mergedCanvas.toBlob(resolve, 'image/png'));

    // S3 bucket name and key for the uploaded image
    const bucketName = 'cornea-defect';
    const key = `images/${Date.now()}_image.png`;

    // Parameters for S3 upload
    const s3UploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: mergedBlob,
      ContentType: 'image/png',
    };

    try {
      // Upload the merged image to S3
      const s3UploadResponse = await s3.upload(s3UploadParams).promise();
      const s3ImageUrl = s3UploadResponse.Location; // URL of the uploaded image

      // Prepare API request payload
      const raw = JSON.stringify({
        "patientId": patientID,
        "verticalLength": String(lineLengths[0]),
        "horizontalLength": String(lineLengths[1]),
        "imageLocation": s3ImageUrl
      });

      // Send API request to backend
      const response = await fetch('https://REDACT.us-east-1.amazonaws.com/prod/patient', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: raw
      });

      // Handle API response
      if (response.ok) {
        alert('Submission successful!');
      } else {
        alert('Submission failed. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting data:', error);
      alert('Error submitting data. Please try again.');
    }

    // Reset lines and patient ID after submission
    setLines([]);
    setPatientID('');
  };

  // Change this function to become more modular 
  // Calculate object sizes in inches
  const calculateHorizontalSizeInInches = () => {
    if (!lineLengths[0] || !lineLengths[1]) {
      return 'Not enough data to calculate.';
    }
    const pixelsPerInch = lineLengths[0];
    const objectPixels = lineLengths[1];
    const objectSizeInInches = objectPixels / pixelsPerInch;
    return objectSizeInInches.toFixed(2) + ' in';
  };

  const calculateVerticalSizeInInches = () => {
    if (!lineLengths[0] || !lineLengths[2]) {
      return 'Not enough data to calculate.';
    }
    const pixelsPerInch = lineLengths[0];
    const objectPixels = lineLengths[2];
    const objectSizeInInches = objectPixels / pixelsPerInch;
    return objectSizeInInches.toFixed(2) + ' in';
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
        <label className="text-sm font-semibold mb-1 block">Patient ID:</label>
        <input
          type="text"
          value={patientID}
          onChange={(e) => setPatientID(e.target.value)}
          className="border rounded-md p-2 mb-2"
        />
        {/* Display calculated sizes */}
        <h3>Horizontal Length: {calculateHorizontalSizeInInches()}</h3>
        <h3>Vertical Length: {calculateVerticalSizeInInches()}</h3>

    <div className="isolate inline-flex flex-col items-center rounded-md shadow-sm">
  <button
    type="button"
    className="relative inline-flex items-center rounded-t-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
  >
    <span className="sr-only">Previous</span>
    <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
  </button>
  <span className="isolate inline-flex rounded-md shadow-sm border-t border-transparent">
    <button
      type="button"
      className="relative inline-flex items-center rounded-l-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
    >
      <span className="sr-only">Previous</span>
      <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
    </button>
    <button
      type="button"
      className="relative -ml-px inline-flex items-center rounded-r-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
    >
      <span className="sr-only">Next</span>
      <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
    </button>
  </span>
  <button
    type="button"
    className="relative -mt-px inline-flex items-center rounded-b-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
  >
    <span className="sr-only">Next</span>
    <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
  </button>
</div>

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
export default DrawLinesOnImage;


