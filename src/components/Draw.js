import React from 'react';
import { useLocation } from 'react-router-dom';
import DrawLinesOnImage from './DrawLinesOnImage/DrawLinesOnImage2';

const Draw = () => {
  const location = useLocation();
  // const uploadedImage = location?.state?.uploadedImage;
  const { state } = useLocation();
  const { referenceDimensions, pixelLength, imageSrc } = state;

  return (
    <div className="max-w-md mx-auto mt-8 p-20 bg-white rounded-md shadow-md">
      <p className="text-lg font-semibold mb-4">Draw Page</p>
      
        <div>
          <p className="text-lg font-semibold mb-2">Uploaded Image:</p>
          {/* <img src={uploadedImage} alt="Uploaded" className="rounded-md shadow-md" /> */}
          <DrawLinesOnImage 
            referenceDimensions={referenceDimensions} 
            pixelLength={pixelLength} 
            imageSrc={imageSrc} 
            />
        </div>
    </div>
  );
};

export default Draw;