import React from 'react';
import './App.css';
import ObjectDetection from './ObjectDetection'; // Import the ObjectDetection component

function App() {
  return (
    <div className="App">
      <h1>Animal Health Monitoring</h1>
      <ObjectDetection />  {/* Add the component to render it */}
    </div>
  );
}

export default App;
