import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AWS from 'aws-sdk';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid'

const DrawLinesOnImage = () => {
  
  const { state } = useLocation();
  const { referenceDimensions, pixelLength, imageSrc } = state;
  console.log(referenceDimensions)
  console.log(pixelLength)


    // State variables and refs
  const [patientID, setPatientID] = useState('');
  const [lineLengths, setLineLengths] = useState([]);
  const [lines, setLines] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState('start'); // New state for selected point
  const [selectedLineIndex, setSelectedLineIndex] = useState(null); // For joystick to know which line to adjust

  const canvasWidth = 378; // Set your desired width
  const canvasHeight = 504; // Set your desired height
  const imageCanvasRef = useRef(null);
  const linesCanvasRef = useRef(null);

  // AWS S3 configuration
  const region = "us-east-1"
  const accessKeyId = 'REDACT'
  const secretAccessKey = 'REDACT'
  const s3 = new AWS.S3({
    region,
    accessKeyId,
    secretAccessKey,
    signatureVersion: 'v4'
  });

  useEffect(() => {
    // Function to draw the image on the canvas
    const drawImageOnCanvas = () => {
      const imageCanvas = imageCanvasRef.current;
      const imageCtx = imageCanvas.getContext('2d');

      const image = new Image();
      image.src = imageSrc;

      image.onload = () => {
        const scale = Math.min(canvasWidth / image.width, canvasHeight / image.height);
        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;

        const startX = (canvasWidth - scaledWidth) / 2;
        const startY = (canvasHeight - scaledHeight) / 2;

        imageCtx.drawImage(image, startX, startY, scaledWidth, scaledHeight);
      };
    };

    drawImageOnCanvas();
  }, [imageSrc]);

  useEffect(() => {
    const canvas = linesCanvasRef.current;
    const ctx = canvas.getContext('2d');

    const handleTouchStart = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const offsetX = touch.clientX - rect.left;
      const offsetY = touch.clientY - rect.top;
      if (lines.length < 2) {
        setLines([...lines, { startX: offsetX, startY: offsetY, endX: offsetX, endY: offsetY }]);
        setDrawing(true);
      }
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      if (!drawing) return;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const offsetX = touch.clientX - rect.left;
      const offsetY = touch.clientY - rect.top;
      const lastIndex = lines.length - 1;
      const updatedLines = [...lines];
      updatedLines[lastIndex] = {
        ...updatedLines[lastIndex],
        endX: offsetX,
        endY: offsetY
      };
      setLines(updatedLines);
    };

    const handleTouchEnd = () => {
      setDrawing(false);
      calculateLineLengths();
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [drawing, lines]);

  const calculateLineLengths = () => {
    const lengths = lines.map((line) => {
      const dx = line.endX - line.startX;
      const dy = line.endY - line.startY;
      return Math.sqrt(dx * dx + dy * dy);
    });
    setLineLengths(lengths);
  };

  const drawLines = () => {
    const canvas = linesCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    lines.forEach((line, index) => {
      ctx.beginPath();
      ctx.moveTo(line.startX, line.startY);
      ctx.lineTo(line.endX, line.endY);
      // ctx.strokeStyle = 'blue';
      // Set different colors based on the index or any other condition
      if (index === 0) {
        ctx.strokeStyle = 'blue'; // First line is blue
      } else {
        ctx.strokeStyle = 'green'; // Other lines are green
      }
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.closePath();

      const length = Math.sqrt(Math.pow(line.endX - line.startX, 2) + Math.pow(line.endY - line.startY, 2));
      console.log(length)

    // Display length next to the line
      ctx.font = '12px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText(`${length.toFixed(2)} px`, (line.startX + line.endX) / 2, (line.startY + line.endY) / 2);

      
  });
  };

  useEffect(() => {
    drawLines();
  }, [lines]);

  const resetLines = () => {
    setLines([]);
    setLineLengths([]);
  
    const linesCanvas = linesCanvasRef.current;
    const linesCtx = linesCanvas.getContext('2d');
    linesCtx.clearRect(0, 0, linesCanvas.width, linesCanvas.height);
  };

  

  const submit = async () => {
    if (lineLengths.length < 4) {
      alert('Please all lines before submitting.');
      return;
    }

    const imageCanvas = imageCanvasRef.current;
    const linesCanvas = linesCanvasRef.current;

    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = canvasWidth;
    mergedCanvas.height = canvasHeight;
    const mergedCtx = mergedCanvas.getContext('2d');

    mergedCtx.drawImage(imageCanvas, 0, 0, canvasWidth, canvasHeight);
    mergedCtx.drawImage(linesCanvas, 0, 0, canvasWidth, canvasHeight);

    const mergedBlob = await new Promise((resolve) => mergedCanvas.toBlob(resolve, 'image/png'));
  


    // Set your S3 bucket name and key
    const bucketName = 'cornea-defect';
    const key = `images/${Date.now()}_image.png`; // Adjust the key as needed

    // S3 upload parameters
    const s3UploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: mergedBlob,
      ContentType: 'image/png', // Adjust the content type based on your image type
    };

    try {
      // Upload the image to S3
      const s3UploadResponse = await s3.upload(s3UploadParams).promise();
  
      // Get the S3 URL from the S3 upload response
      const s3ImageUrl = s3UploadResponse.Location
  
      // Get patientID from state
      const patientId = patientID;

      console.log('API Request Payload:', {
        patientId: patientId,
        verticalLength: lineLengths[0],
        horizontalLength: lineLengths[1],
        // imageLocation: blob,
      });

      const raw = JSON.stringify({
        "patientId": patientId,
        "verticalLength": String(lineLengths[0]),
        "horizontalLength": String(lineLengths[1]),
        "imageLocation": s3ImageUrl
      });
  
      const response = await fetch('https://REDACT.us-east-1.amazonaws.com/prod/patient', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: raw
      });
    
  
      // Check if the request was successful
      if (response.ok) {
        alert('Submission successful!');
      } else {
        alert('Submission failed. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting data:', error);
      alert('Error submitting data. Please try again.');
    }
  
    // Reset the lines and patientID after submitting
    setLines([]);
    setPatientID('');
  };

  const adjustLine = (direction, point, index) => {
    console.log('Adjusting point:', direction); 
    setSelectedLineIndex(index);
    setSelectedPoint(point); // Set the selected point
    console.log('selectedLineIndex:', selectedLineIndex); 
    const adjustment = 2;
  
    setLines((prevLines) => {
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
      setLineLengths(lengths); // Update line lengths
      return newLines;
    });
  };

  const calculateHorizontalSizeInInches = () => {
    if (!lineLengths[0]) {
        return 'Draw Line';
    }

    const pixelsPerInch = calculateReferencePoint(); // Pixel length of the 1-inch object
    const objectPixels = lineLengths[0]; // Pixel length of the object

    const objectSizeInInches = objectPixels / pixelsPerInch;

    return (
      <span style={{ color: 'blue' }}>
        <b>{objectSizeInInches.toFixed(2)} in</b>
      </span>
    );
  };

  const calculateReferencePoint = () => {

      // Parse the reference dimension to extract the unit (assuming it's always at the end)
    const unit = referenceDimensions.match(/[a-zA-Z]+/)[0];
    
    // Convert the reference dimension to a number (removing the unit)
    const referenceValue = parseFloat(referenceDimensions);

    // Convert the pixel length to inches
    let referencePoint;
    switch (unit.toLowerCase()) {
      case 'inch':
      case 'inches':
        referencePoint = pixelLength / referenceValue;
        break;
      case 'cm':
        referencePoint = pixelLength / 96 * 2.54 / referenceValue; // 1 inch = 96 pixels, 1 inch = 2.54 cm
        break;
      case 'mm':
        referencePoint = pixelLength / 96 * 25.4 / referenceValue; // 1 inch = 96 pixels, 1 inch = 25.4 mm
        break;
      // Add more cases for other units as needed
      default:
        // Default to inches if the unit is not recognized
        referencePoint = pixelLength;
        break;
    }

    return referencePoint;
};

  const calculateVerticalSizeInInches = () => {
    if (!lineLengths[0] || !lineLengths[1]) {
        return 'Draw Line ';
    }

    const pixelsPerInch = calculateReferencePoint(); // Pixel length of the 1-inch object
    const objectPixels = lineLengths[1]; // Pixel length of the object

    const objectSizeInInches = objectPixels / pixelsPerInch;

    return (
      <span style={{ color: 'green' }}>
        <b>{objectSizeInInches.toFixed(2)} in</b>
      </span>
    );
  };

  return (
    <div className="relative h-screen flex flex-col justify-center items-center">
      <canvas
        ref={imageCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{ position: 'absolute', top: '0', zIndex: 1 }}
      />
      <canvas
        ref={linesCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{ position: 'absolute', top: '0', zIndex: 2, touchAction: 'none' }} // Add touchAction property
      />
      
      <div className="absolute bottom-20">
        <label className="text-sm font-semibold mb-1 block">Patient ID:</label>
        <input
          type="text"
          placeholder="patient_007"
          value={patientID}
          onChange={(e) => setPatientID(e.target.value)}
          className="border rounded-md p-2 mb-2"
        />
        {/* <h2>Label: {lineLengths[0] ? `${lineLengths[0].toFixed(2)} px` : 'Not drawn yet'}</h2>
        <h2>Hor Object: {lineLengths[1] ? `${lineLengths[1].toFixed(2)} px` : 'Not drawn yet'}</h2>
        <h2>Vert. Object: {lineLengths[2] ? `${lineLengths[2].toFixed(2)} px` : 'Not drawn yet'}</h2> */}
        {/* <h3>Reference: {calculateReferencePoint()}</h3> */}
        

    <div className="flex">
    <div className="isolate inline-flex flex-col items-center rounded-md shadow-sm">
  {/* <button onClick={() => adjustLine('up', 'start')}
    type="button"
    className="relative inline-flex items-center rounded-t-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
  >
    <span className="sr-only">Previous</span>
    <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
  </button> */}
  <span className="isolate inline-flex rounded-md shadow-sm border-t border-transparent">
    <button onClick={() => adjustLine('left','start', 0)}
      type="button"
      className="relative inline-flex items-center rounded-l-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
    >
      <span className="sr-only">Previous</span>
      <ChevronLeftIcon className="h-5 w-5 text-blue-500" aria-hidden="true" />
    </button>
    <button onClick={() => adjustLine('right','start', 0)}
      type="button"
      className="relative -ml-px inline-flex items-center rounded-r-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
    >
      <span className="sr-only">Next</span>
      <ChevronRightIcon className="h-5 w-5 text-blue-500" aria-hidden="true" />
    </button>
  </span>
  {/* <button onClick={() => adjustLine('down','start')}
    type="button"
    className="relative -mt-px inline-flex items-center rounded-b-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
  >
    <span className="sr-only">Next</span>
    <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
  </button> */}
</div>

 <div style={{ width: '50px' }}></div>

 <div className="flex">
<div className="isolate inline-flex flex-col items-center rounded-md shadow-sm">
  
  <span className="isolate inline-flex rounded-md shadow-sm border-t border-transparent">
  {/* <button onClick={() => adjustLine('up', 'end')}
    type="button"
    className="relative inline-flex items-center rounded-t-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
  >
    <span className="sr-only">Previous</span>
    <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
  </button> */}
    <button onClick={() => adjustLine('left','end', 0)}
      type="button"
      className="relative inline-flex items-center rounded-l-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
    >
      <span className="sr-only">Previous</span>
      <ChevronLeftIcon className="h-5 w-5 text-blue-500" aria-hidden="true" />
    </button>
    <button onClick={() => adjustLine('right','end', 0)}
      type="button"
      className="relative -ml-px inline-flex items-center rounded-r-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
    >
      <span className="sr-only">Next</span>
      <ChevronRightIcon className="h-5 w-5 text-blue-500" aria-hidden="true" />
    </button>
  </span>
  {/* <button onClick={() => adjustLine('down','end')}
    type="button"
    className="relative -mt-px inline-flex items-center rounded-b-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
  >
    <span className="sr-only">Next</span>
    <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
  </button> */}
</div>
</div>
</div>


<div className="flex">
<div className="isolate inline-flex flex-col items-center rounded-md shadow-sm">
<button onClick={() => adjustLine('up', 'start', 1)}
    type="button"
    className="relative inline-flex items-center rounded-t-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
  >
    <span className="sr-only">Previous</span>
    <ChevronUpIcon className="h-5 w-5 text-green-500" aria-hidden="true" />
  </button>

  <button onClick={() => adjustLine('down','start', 1)}
    type="button"
    className="relative -mt-px inline-flex items-center rounded-b-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
  >
    <span className="sr-only">Next</span>
    <ChevronDownIcon className="h-5 w-5 text-green-500" aria-hidden="true" />
  </button>

  
  <br></br>
  <button onClick={() => adjustLine('up', 'end', 1)}
    type="button"
    className="relative inline-flex items-center rounded-t-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
  >
    <span className="sr-only">Previous</span>
    <ChevronUpIcon className="h-5 w-5 text-green-500" aria-hidden="true" />
  </button>

  <button onClick={() => adjustLine('down','end', 1)}
    type="button"
    className="relative -mt-px inline-flex items-center rounded-b-md bg-white px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
  >
    <span className="sr-only">Next</span>
    <ChevronDownIcon className="h-5 w-5 text-green-500" aria-hidden="true" />
  </button>



  <h4>Horizontal Length: {calculateHorizontalSizeInInches()}</h4>
  <h4>Vertical Length: {calculateVerticalSizeInInches()}</h4>

</div>
</div>


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

export default DrawLinesOnImage;