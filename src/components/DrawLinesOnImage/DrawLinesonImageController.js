import React, { useState, useRef, useEffect } from 'react';
import AWS from 'aws-sdk';

const DrawLinesOnImage = ({ imageSrc }) => {
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const canvasWidth = 378; // Set your desired width
  const canvasHeight = 504; // Set your desired height
  const [patientID, setPatientID] = useState('');
  const [lineLengths, setLineLengths] = useState([]);

  const imageCanvasRef = useRef(null);
  const linesCanvasRef = useRef(null);
  const [lines, setLines] = useState([]);
  const [drawing, setDrawing] = useState(false);

  // AWS S3 Configuration
  const region = "us-east-1"
  const accessKeyId = 'REDACT'
  const secretAccessKey = 'REDACT'
  const s3 = new AWS.S3({
    region,
    accessKeyId,
    secretAccessKey,
    signatureVersion: 'v4'
  })

  useEffect(() => {
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
  }, [imageSrc]);

  const calculateLineLength = (line) => {
    const dx = line.endX - line.startX;
    const dy = line.endY - line.startY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const startDrawing = (e) => {
    if (lines.length < 3) {
      setDrawing(true);
      const { offsetX, offsetY } = e.nativeEvent.touches[0];
      setLines([...lines, { startX: offsetX, startY: offsetY, endX: offsetX, endY: offsetY, length: 0 }]);
    }
  };

  const adjustLine = (lineIndex, point, x, y) => {
    if (!drawing) return;

    const updatedLines = [...lines];
    const line = updatedLines[lineIndex];
    if (point === 'left') {
      line.startX = x;
      line.startY = y;
    } else if (point === 'right') {
      line.endX = x;
      line.endY = y;
    }
    line.length = calculateLineLength(line);
    setLines(updatedLines);

    const updatedLineLengths = updatedLines.map((line) => line.length);
    setLineLengths(updatedLineLengths);

    const linesCanvas = linesCanvasRef.current;
    const linesCtx = linesCanvas.getContext('2d');

    linesCtx.clearRect(0, 0, linesCanvas.width, linesCanvas.height);

    updatedLines.forEach((line) => {
      linesCtx.beginPath();
      linesCtx.moveTo(line.startX, line.startY);
      linesCtx.lineTo(line.endX, line.endY);
      linesCtx.strokeStyle = 'blue';
      linesCtx.lineWidth = 2;
      linesCtx.stroke();

      const textX = line.endX + 5;
      const textY = line.endY - 5;

      linesCtx.font = '24px Arial';
      linesCtx.fillStyle = 'white';
      linesCtx.fillText(`${line.length.toFixed(2)} px`, textX, textY);
    });
  };

  const stopDrawing = () => {
    setDrawing(false);
  };

  const resetLines = () => {
    setLines([]);
    setLineLengths([]);

    const linesCanvas = linesCanvasRef.current;
    const linesCtx = linesCanvas.getContext('2d');
    linesCtx.clearRect(0, 0, linesCanvas.width, linesCanvas.height);
  };

  // Function to submit data to AWS S3 and API
  const submit = async () => {
    // Check if enough lines are drawn
    if (lineLengths.length < 4) {
      alert('Please draw all lines before submitting.');
      return;
    }

    // Get image and lines canvas references
    const imageCanvas = imageCanvasRef.current;
    const linesCanvas = linesCanvasRef.current;

    // Create a new canvas to merge both image and lines
    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = canvasWidth;
    mergedCanvas.height = canvasHeight;
    const mergedCtx = mergedCanvas.getContext('2d');

    // Draw image and lines on the merged canvas
    mergedCtx.drawImage(imageCanvas, 0, 0, canvasWidth, canvasHeight);
    mergedCtx.drawImage(linesCanvas, 0, 0, canvasWidth, canvasHeight);

    // Convert the merged canvas to a blob
    const mergedBlob = await new Promise((resolve) => mergedCanvas.toBlob(resolve, 'image/png'));

    // Set S3 bucket name and key
    const bucketName = 'cornea-defect';
    const key = `images/${Date.now()}_image.png`;

    // S3 upload parameters
    const s3UploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: mergedBlob,
      ContentType: 'image/png',
    };

    try {
      // Upload the image to S3
      const s3UploadResponse = await s3.upload(s3UploadParams).promise();
      const s3ImageUrl = s3UploadResponse.Location;

      // Get patientID from state
      const patientId = patientID;

      // Prepare the request payload
      const raw = JSON.stringify({
        "patientId": patientId,
        "verticalLength": String(lineLengths[0]),
        "horizontalLength": String(lineLengths[1]),
        "imageLocation": s3ImageUrl
      });

      // Send POST request to API
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

  // Calculate horizontal size in inches
  const calculateHorizontalSizeInInches = () => {
    if (!lineLengths[0] || !lineLengths[1]) {
      return 'Not enough data to calculate.';
    }

    const pixelsPerInch = lineLengths[0];
    const objectPixels = lineLengths[1];

    const objectSizeInInches = objectPixels / pixelsPerInch;

    return objectSizeInInches.toFixed(2) + ' in';
  };

  // Calculate vertical size in inches
  const calculateVerticalSizeInInches = () => {
    if (!lineLengths[0] || !lineLengths[2]) {
      return 'Not enough data to calculate.';
    }

    const pixelsPerInch = lineLengths[0];
    const objectPixels = lineLengths[2];

    const objectSizeInInches = objectPixels / pixelsPerInch;

    return objectSizeInInches.toFixed(2) + ' in';
  };

  return (
    <div className="flex items-center justify-center h-screen" style={{ overflowY: 'hidden' }}>
      <canvas
        ref={imageCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{ position: 'absolute', zIndex: 1 }}
      />
      <canvas
        ref={linesCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{ position: 'absolute', zIndex: 2, touchAction: 'none' }}
        onTouchStart={startDrawing}
        onTouchMove={(e) => {
          e.preventDefault();
          const touch = e.touches[0];
          const { clientX, clientY } = touch;
          const rect = e.target.getBoundingClientRect();
          const x = clientX - rect.left;
          const y = clientY - rect.top;
          adjustLine(lines.length - 1, 'right', x, y);
        }}
        onTouchEnd={stopDrawing}
        onTouchCancel={stopDrawing}
      />
      <div className="absolute bottom-0 left-0 p-4">
        <label className="text-sm font-semibold mb-1 block">Patient ID:</label>
        <input
          type="text"
          value={patientID}
          onChange={(e) => setPatientID(e.target.value)}
          className="border rounded-md p-2 mb-2"
        />
        <h3>Hor. Length: {calculateHorizontalSizeInInches()}</h3>
        <h3>Vert. Length: {calculateVerticalSizeInInches()}</h3>

        <button
          onClick={resetLines}
          className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded-md ml-2"
        >
          Reset Lines
        </button>
        <button
          onClick={submit}
          className="bg-green-500 text-white py-2 px-4 rounded-md ml-2"
        >
          Submit
        </button>
      </div>
      <div className="controller" style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)' }}>
        {lines.map((line, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
            <div
              style={{ width: '20px', height: '20px', background: 'red', borderRadius: '50%', cursor: 'pointer' }}
              draggable
              onDrag={(e) => {
                const rect = e.target.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                adjustLine(index, 'left', x, y);
              }}
            />
            <div
              style={{ width: '20px', height: '20px', background: 'green', borderRadius: '50%', cursor: 'pointer' }}
              draggable
              onDrag={(e) => {
                const rect = e.target.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                adjustLine(index, 'right', x, y);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default DrawLinesOnImage;
