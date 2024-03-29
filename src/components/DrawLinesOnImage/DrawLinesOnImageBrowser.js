
// Importing necessary React hooks and AWS SDK for accessing AWS services
import React, { useState, useRef, useEffect } from 'react';
import AWS from 'aws-sdk';

// The component function, accepting an image source via props for dynamic image handling
const DrawLinesOnImage = ({ imageSrc }) => {
  // State for storing and updating image dimensions
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  // Static canvas dimensions, set according to desired size
  const canvasWidth = 756;
  const canvasHeight = 1008;
  // State for managing patient ID and line lengths for measurement
  const [patientID, setPatientID] = useState('');
  const [lineLengths, setLineLengths] = useState([]);

  // Refs for directly manipulating canvas elements for image and line drawing
  const imageCanvasRef = useRef(null);
  const linesCanvasRef = useRef(null);

  // State for storing lines (start and end points) and managing drawing state
  const [lines, setLines] = useState([]);
  const [drawing, setDrawing] = useState(false);

  // AWS S3 configuration setup for file uploads
  const region = "us-east-1";
  const accessKeyId = 'REDACT'; // Placeholder for actual access key
  const secretAccessKey = 'REDACT'; // Placeholder for actual secret access key
  const s3 = new AWS.S3({
    region,
    accessKeyId,
    secretAccessKey,
    signatureVersion: 'v4'
  });

  // Effect hook for drawing the image onto the canvas once the component mounts or the image source changes
  useEffect(() => {
    const imageCanvas = imageCanvasRef.current;
    const imageCtx = imageCanvas.getContext('2d');
    const image = new Image();
    image.src = imageSrc;

    image.onload = () => {
      // Calculate scaling to maintain aspect ratio within canvas dimensions
      const scale = Math.min(canvasWidth / image.width, canvasHeight / image.height);
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;
      // Centering the image on the canvas
      const startX = (canvasWidth - scaledWidth) / 2;
      const startY = (canvasHeight - scaledHeight) / 2;

      // Drawing the image with calculated dimensions and positions
      imageCtx.drawImage(image, startX, startY, scaledWidth, scaledHeight);
    };
  }, [imageSrc]);

  // Function to calculate the length of a line using Pythagorean theorem
  const calculateLineLength = (line) => {
    const dx = line.endX - line.startX;
    const dy = line.endY - line.startY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Function to initiate drawing a line on mouse down event
  const startDrawing = (e) => {
    if (lines.length < 3) { // Limiting the number of lines to 3
      setDrawing(true);
      const { offsetX, offsetY } = e.nativeEvent; // Getting mouse position
      setLines([...lines, { startX: offsetX, startY: offsetY, length: 0 }]);
    }
  };

  // Function to update the line being drawn with new end coordinates on mouse move
  const drawLine = (e) => {
    if (!drawing) return;
    const { offsetX, offsetY } = e.nativeEvent;
    const updatedLines = [...lines];
    const lastIndex = updatedLines.length - 1;
    updatedLines[lastIndex] = {
      ...updatedLines[lastIndex],
      endX: offsetX,
      endY: offsetY,
      length: calculateLineLength(updatedLines[lastIndex]),
    };
    setLines(updatedLines);

    // Updating line lengths state with newly calculated lengths
    const updatedLineLengths = updatedLines.map(line => line.length);
    setLineLengths(updatedLineLengths);

    // Clearing and redrawing lines on the lines canvas
    const linesCanvas = linesCanvasRef.current;
    const linesCtx = linesCanvas.getContext('2d');
    linesCtx.clearRect(0, 0, linesCanvas.width, linesCanvas.height);
    updatedLines.forEach(line => {
      linesCtx.beginPath();
      linesCtx.moveTo(line.startX, line.startY);
      linesCtx.lineTo(line.endX, line.endY);
      linesCtx.strokeStyle = 'blue'; // Line color
      linesCtx.lineWidth = 2; // Line width
      linesCtx.stroke();

      // Displaying the length of the line next to it
      const textX = line.endX + 5;
      const textY = line.endY - 5;
      linesCtx.font = '24px Arial';
      linesCtx.fillStyle = 'white';
      linesCtx.fillText(`${line.length.toFixed(2)} px`, textX, textY);
    });
  };

  // Function to stop drawing once the mouse is released
  const stopDrawing = () => {
    setDrawing(false);
  };

  // Function to clear all lines from the state and the canvas
  const resetLines = () => {
    setLines([]);
    setLineLengths([]);
    const linesCanvas = linesCanvasRef.current;
    const linesCtx = linesCanvas.getContext('2d');
    linesCtx.clearRect(0, 0, linesCanvas.width, linesCanvas.height);
  };

  // Function to handle submission of data, including uploading the image and lines to AWS S3
  const submit = async () => {
    if (lineLengths.length < 4) {
      alert('Please draw all lines before submitting.');
      return;
    }

    // Merging the image and lines canvases into one for upload
    const imageCanvas = imageCanvasRef.current;
    const linesCanvas = linesCanvasRef.current;
    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = canvasWidth;
    mergedCanvas.height = canvasHeight;
    const mergedCtx = mergedCanvas.getContext('2d');
    mergedCtx.drawImage(imageCanvas, 0, 0, canvasWidth, canvasHeight);
    mergedCtx.drawImage(linesCanvas, 0, 0, canvasWidth, canvasHeight);

    // Converting the merged canvas to a Blob for S3 upload
    const mergedBlob = await new Promise((resolve) => mergedCanvas.toBlob(resolve, 'image/png'));

    // S3 bucket and object key configuration
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
      // Uploading the merged image to S3
      const s3UploadResponse = await s3.upload(s3UploadParams).promise();
      const s3ImageUrl = s3UploadResponse.Location; // URL of the uploaded image

      // Preparing data payload for backend submission
      const raw = JSON.stringify({
        "patientId": patientID,
        "verticalLength": String(lineLengths[0]),
        "horizontalLength": String(lineLengths[1]),
        "imageLocation": s3ImageUrl
      });

      // Sending the payload to the backend
      const response = await fetch('https://REDACT.us-east-1.amazonaws.com/prod/patient', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: raw
      });

      // Handling the response
      if (response.ok) {
        alert('Submission successful!');
      } else {
        alert('Submission failed. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting data:', error);
      alert('Error submitting data. Please try again.');
    }

    // Resetting lines and patient ID state after submission
    setLines([]);
    setPatientID('');
  };

  // Functions to calculate object sizes in inches based on drawn lines
  const calculateHorizontalSizeInInches = () => {
    if (!lineLengths[0] || !lineLengths[1]) {
      return 'Not enough data to calculate.';
    }
    const pixelsPerInch = lineLengths[0]; // Assuming first line is the reference for 1 inch
    const objectPixels = lineLengths[1]; // Second line is the object measured
    const objectSizeInInches = objectPixels / pixelsPerInch;
    return `${objectSizeInInches.toFixed(2)} in`;
  };

  const calculateVerticalSizeInInches = () => {
    if (!lineLengths[0] || !lineLengths[2]) {
      return 'Not enough data to calculate.';
    }
    const pixelsPerInch = lineLengths[0]; // Assuming first line is the reference for 1 inch
    const objectPixels = lineLengths[2]; // Third line is the object measured
    const objectSizeInInches = objectPixels / pixelsPerInch;
    return `${objectSizeInInches.toFixed(2)} in`;
  };

  // Rendering the component's UI
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
        onMouseDown={startDrawing}
        onMouseMove={drawLine}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
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
    </div>
  );
};

// Exporting the component for use in other parts of the application
export default DrawLinesOnImage;


// Raja version below

// import React, { useState, useRef, useEffect } from 'react';
// import AWS from 'aws-sdk';

// const DrawLinesOnImage = ({ imageSrc }) => {
//   const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
//   const canvasWidth = 756; // Set your desired width
//   const canvasHeight = 1008; // Set your desired height
//   const [patientID, setPatientID] = useState('');
//   const [lineLengths, setLineLengths] = useState([]);

//   const imageCanvasRef = useRef(null);
//   const linesCanvasRef = useRef(null);
//   const [lines, setLines] = useState([]);
//   const [drawing, setDrawing] = useState(false);


//   const region = "us-east-1"
//   const accessKeyId = 'REDACT'
//   const secretAccessKey = 'REDACT'
//   const s3 = new AWS.S3({
//     region,
//     accessKeyId,
//     secretAccessKey,
//     signatureVersion: 'v4'
//   })

//   useEffect(() => {
//     const imageCanvas = imageCanvasRef.current;
//     const imageCtx = imageCanvas.getContext('2d');

//     const image = new Image();
//     image.src = imageSrc;

//     image.onload = () => {
//       const scale = Math.min(canvasWidth / image.width, canvasHeight / image.height);
//       const scaledWidth = image.width * scale;
//       const scaledHeight = image.height * scale;

//       const startX = (canvasWidth - scaledWidth) / 2;
//       const startY = (canvasHeight - scaledHeight) / 2;

//       imageCtx.drawImage(image, startX, startY, scaledWidth, scaledHeight);

//       // imageCtx.beginPath();
//       // imageCtx.arc(startX + 100, startY + 100, 50, 0, 2 * Math.PI);
//       // imageCtx.fillStyle = 'red';
//       // imageCtx.fill();
//       // imageCtx.closePath();
//     };
//   }, [imageSrc]);

//   const calculateLineLength = (line) => {
//     const dx = line.endX - line.startX;
//     const dy = line.endY - line.startY;
//     return Math.sqrt(dx * dx + dy * dy);
//   };

//   const startDrawing = (e) => {
//     if (lines.length < 3) {
//       setDrawing(true);
//       const { offsetX, offsetY } = e.nativeEvent;
//       setLines([...lines, { startX: offsetX, startY: offsetY, length: 0 }]);
//     }
//   };

//   const drawLine = (e) => {
//     if (!drawing) return;
  
//     const { offsetX, offsetY } = e.nativeEvent;
//     const updatedLines = [...lines];
//     const lastIndex = updatedLines.length - 1;
//     updatedLines[lastIndex] = {
//       ...updatedLines[lastIndex],
//       endX: offsetX,
//       endY: offsetY,
//       length: calculateLineLength(updatedLines[lastIndex]),
//     };
//     setLines(updatedLines);
  
//     const updatedLineLengths = updatedLines.map((line) => line.length);
//     setLineLengths(updatedLineLengths);
  
//     const linesCanvas = linesCanvasRef.current;
//     const linesCtx = linesCanvas.getContext('2d');
  
//     linesCtx.clearRect(0, 0, linesCanvas.width, linesCanvas.height);
  
//     updatedLines.forEach((line) => {
//       linesCtx.beginPath();
//       linesCtx.moveTo(line.startX, line.startY);
//       linesCtx.lineTo(line.endX, line.endY);
//       linesCtx.strokeStyle = 'blue';
//       linesCtx.lineWidth = 2;
//       linesCtx.stroke();
  
//       const textX = line.endX + 5;
//       const textY = line.endY - 5;
  
//       linesCtx.font = '24px Arial';
//       linesCtx.fillStyle = 'white';
//       linesCtx.fillText(`${line.length.toFixed(2)} px`, textX, textY);
//     });
//   };

//   const stopDrawing = () => {
//     setDrawing(false);
//     //setLineLengths(lines.slice(-2).map((line) => line.length));
//   };

//   const resetLines = () => {
//     setLines([]);
//     setLineLengths([]);
  
//     const linesCanvas = linesCanvasRef.current;
//     const linesCtx = linesCanvas.getContext('2d');
//     linesCtx.clearRect(0, 0, linesCanvas.width, linesCanvas.height);
//   };

  

//   const submit = async () => {
//     if (lineLengths.length < 4) {
//       alert('Please all lines before submitting.');
//       return;
//     }

//     const imageCanvas = imageCanvasRef.current;
//     const linesCanvas = linesCanvasRef.current;

//     const mergedCanvas = document.createElement('canvas');
//     mergedCanvas.width = canvasWidth;
//     mergedCanvas.height = canvasHeight;
//     const mergedCtx = mergedCanvas.getContext('2d');

//     mergedCtx.drawImage(imageCanvas, 0, 0, canvasWidth, canvasHeight);
//     mergedCtx.drawImage(linesCanvas, 0, 0, canvasWidth, canvasHeight);

//     const mergedBlob = await new Promise((resolve) => mergedCanvas.toBlob(resolve, 'image/png'));
  


//     // Set your S3 bucket name and key
//     const bucketName = 'cornea-defect';
//     const key = `images/${Date.now()}_image.png`; // Adjust the key as needed

//     // S3 upload parameters
//     const s3UploadParams = {
//       Bucket: bucketName,
//       Key: key,
//       Body: mergedBlob,
//       ContentType: 'image/png', // Adjust the content type based on your image type
//     };

//     try {
//       // Upload the image to S3
//       const s3UploadResponse = await s3.upload(s3UploadParams).promise();
  
//       // Get the S3 URL from the S3 upload response
//       const s3ImageUrl = s3UploadResponse.Location
  
//       // Get patientID from state
//       const patientId = patientID;

//       console.log('API Request Payload:', {
//         patientId: patientId,
//         verticalLength: lineLengths[0],
//         horizontalLength: lineLengths[1],
//         // imageLocation: blob,
//       });

//       const raw = JSON.stringify({
//         "patientId": patientId,
//         "verticalLength": String(lineLengths[0]),
//         "horizontalLength": String(lineLengths[1]),
//         "imageLocation": s3ImageUrl
//       });
  
//       const response = await fetch('https://REDACT.us-east-1.amazonaws.com/prod/patient', {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: raw
//       });
    
  
//       // Check if the request was successful
//       if (response.ok) {
//         alert('Submission successful!');
//       } else {
//         alert('Submission failed. Please try again.');
//       }
//     } catch (error) {
//       console.error('Error submitting data:', error);
//       alert('Error submitting data. Please try again.');
//     }
  
//     // Reset the lines and patientID after submitting
//     setLines([]);
//     setPatientID('');
//   };

//   const calculateHorizontalSizeInInches = () => {
//     if (!lineLengths[0] || !lineLengths[1]) {
//         return 'Not enough data to calculate.';
//     }

//     const pixelsPerInch = lineLengths[0]; // Pixel length of the 1-inch object
//     const objectPixels = lineLengths[1]; // Pixel length of the object

//     const objectSizeInInches = objectPixels / pixelsPerInch;

//     return objectSizeInInches.toFixed(2) + ' in';
//   };

//   const calculateVerticalSizeInInches = () => {
//     if (!lineLengths[0] || !lineLengths[2]) {
//         return 'Not enough data to calculate.';
//     }

//     const pixelsPerInch = lineLengths[0]; // Pixel length of the 1-inch object
//     const objectPixels = lineLengths[2]; // Pixel length of the object

//     const objectSizeInInches = objectPixels / pixelsPerInch;

//     return objectSizeInInches.toFixed(2) + ' in';
//   };

//   return (
//     <div className="flex items-center justify-center h-screen" style={{ overflowY: 'hidden' }}>
//       <canvas
//         ref={imageCanvasRef}
//         width={canvasWidth}
//         height={canvasHeight}
//         style={{ position: 'absolute', zIndex: 1 }}
//       />
//       <canvas
//         ref={linesCanvasRef}
//         width={canvasWidth}
//         height={canvasHeight}
//         style={{ position: 'absolute', zIndex: 2, touchAction: 'none' }} // Add touchAction property
//         onMouseDown={startDrawing}
//         onMouseMove={drawLine}
//         onMouseUp={stopDrawing}
//         onMouseOut={stopDrawing}
//       />
//       <div className="absolute bottom-0 left-0 p-4">
//         <label className="text-sm font-semibold mb-1 block">Patient ID:</label>
//         <input
//           type="text"
//           value={patientID}
//           onChange={(e) => setPatientID(e.target.value)}
//           className="border rounded-md p-2 mb-2"
//         />
//         {/* <h2>Label: {lineLengths[0] ? `${lineLengths[0].toFixed(2)} px` : 'Not drawn yet'}</h2>
//         <h2>Hor Object: {lineLengths[1] ? `${lineLengths[1].toFixed(2)} px` : 'Not drawn yet'}</h2>
//         <h2>Vert. Object: {lineLengths[2] ? `${lineLengths[2].toFixed(2)} px` : 'Not drawn yet'}</h2> */}
//         <h3>Hor. Length: {calculateHorizontalSizeInInches()}</h3>
//         <h3>Vert. Length: {calculateVerticalSizeInInches()}</h3>

//         <button
//           onClick={resetLines}
//           className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded-md ml-2"
//         >
//           Reset Lines
//         </button>
//         <button
//           onClick={submit}
//           className="bg-green-500 text-white py-2 px-4 rounded-md ml-2"
//         >
//           Submit
//         </button>
//       </div>
//     </div>
//   );
// };

// export default DrawLinesOnImage;
