import React from "react";
import { Link } from "react-router-dom";
import DrawLinesOnImage from '../components/DrawLinesOnImage/DrawLinesOnImage';
import eyeImage from "../assets/eye.jpeg";

const HomePage = () => {
  return (
    
    <div>
      <h1>Test</h1>
      <DrawLinesOnImage imageSrc={eyeImage} />
    </div>
  );
};

export default HomePage;
