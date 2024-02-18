import React from 'react';
import { useLocation } from 'react-router-dom';
import DrawLinesOnImage from './DrawLinesOnImage/DrawLinesOnImage';

const Draw = () => {
  const location = useLocation();
  const uploadedImage = location?.state?.uploadedImage;
  const width = location?.state?.width;
  const height= location?.state?.height;

  return (
    <div className="max-w-md mx-auto mt-8 p-8 bg-white rounded-md shadow-md">
      <p className="text-lg font-semibold mb-4">Draw Page</p>
      
      {uploadedImage && (
        <div>
          <p className="text-lg font-semibold mb-2">Uploaded Image:</p>
          {/* <img src={uploadedImage} alt="Uploaded" className="rounded-md shadow-md" /> */}
          <DrawLinesOnImage imageSrc={uploadedImage} />
        </div>
      )}
    </div>
  );
};

export default Draw;