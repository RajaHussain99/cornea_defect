import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';

const ImageUpload = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const navigate = useNavigate();

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    setUploadedImage(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleSubmit = () => {
    // Perform any additional actions before navigating, if needed
  
    // Get the dimensions of the uploaded image
    const image = new Image();
    image.src = uploadedImage;
    
    const width = image.width;
    const height = image.height;
  
    // Redirect to the "/draw" page along with the uploaded image and its dimensions
    navigate('/reference', { state: { uploadedImage, width, height } });
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-8 bg-white rounded-md shadow-md">
      <div
        {...getRootProps()}
        className={`border-4 border-dashed border-gray-300 p-8 text-center cursor-pointer ${
          isDragActive ? 'border-green-500' : 'hover:border-green-500'
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-green-500">Drop the image here...</p>
        ) : (
          <p className="text-gray-500">Drag & drop an image here, or click to select one</p>
        )}
      </div>

      {uploadedImage && (
        <div className="mt-6">
          <p className="text-lg font-semibold mb-2">Preview:</p>
          <img src={uploadedImage} alt="Uploaded" className="rounded-md shadow-md" />
          <button
            onClick={handleSubmit}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md focus:outline-none"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;