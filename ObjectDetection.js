import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs'; // Required to load TensorFlow models
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import './ObjectDetection.css'; // Import the CSS file

const ObjectDetection = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [temperature, setTemperature] = useState(null);
  const [detections, setDetections] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [filterClasses, setFilterClasses] = useState(['person', 'cat', 'dog', 'cow', 'goat']);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);

  const API_URL = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/trichy';
  const API_KEY = 'PPM2RZSCC2Y3SS7FHWTVYJSSV';

  // List of wild animals to check for red alert
  const wildAnimals = ['lion', 'tiger', 'elephant', 'bear', 'leopard'];

  // Fetch the weather temperature
  const fetchTemperature = async () => {
    try {
      const response = await axios.get(`${API_URL}?unitGroup=metric&key=${API_KEY}&contentType=json`);
      setTemperature(response.data.currentConditions.temp);
    } catch (error) {
      console.error('Error fetching temperature:', error);
      setTemperature('Unavailable');
    }
  };

  useEffect(() => {
    fetchTemperature();
  }, []);

  // Load the TensorFlow model and start the webcam stream
  useEffect(() => {
    const loadModelAndStartWebcam = async () => {
      try {
        setIsLoading(true);
        const loadedModel = await cocoSsd.load();
        setModel(loadedModel);
        setIsLoading(false);
        startWebcam();
      } catch (error) {
        console.error('Error loading model:', error);
        setError('Failed to load object detection model.');
      }
    };

    loadModelAndStartWebcam();

    // Cleanup webcam on component unmount
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start the webcam
  const startWebcam = async () => {
    const video = videoRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;

      video.addEventListener('loadeddata', () => {
        if (canvasRef.current) {
          canvasRef.current.width = video.videoWidth;
          canvasRef.current.height = video.videoHeight;
        }
      });
    } catch (error) {
      console.error('Error accessing webcam:', error);
      setError('Please allow access to the webcam.');
    }
  };

  // Detect objects in the video stream
  useEffect(() => {
    if (!model || !canvasRef.current || !videoRef.current || !isDetecting) return;

    const detectObjects = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const predictions = await model.detect(video);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let wildAnimalDetected = false;

      predictions.forEach(prediction => {
        if (filterClasses.includes(prediction.class)) {
          const [x, y, width, height] = prediction.bbox;
          ctx.beginPath();
          ctx.rect(x, y, width, height);
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'red'; // Use a contrasting color
          ctx.fillStyle = 'red';
          ctx.stroke();
          ctx.fillText(
            `${prediction.class} (${Math.round(prediction.score * 100)}%)`,
            x,
            y > 10 ? y - 5 : 10
          );

          // Check if the detected object is a wild animal
          if (wildAnimals.includes(prediction.class.toLowerCase())) {
            wildAnimalDetected = true;
          }
        }
      });

      setDetections(predictions);

      // Show red alert if a wild animal is detected
      if (wildAnimalDetected) {
        setAlertMessage("🚨 Red Alert: Wild Animal Detected! 🚨");
      } else {
        setAlertMessage(null); // Reset alert message if no wild animal detected
      }

      requestAnimationFrame(detectObjects);
    };

    detectObjects();
  }, [model, filterClasses, isDetecting]);

  // Toggle detection
  const toggleDetection = () => {
    setIsDetecting(prevState => !prevState);
  };

  // Render detection results in a table format
  const renderDetectionTable = () => {
    if (detections.length === 0) {
      return <p>No Animal detected yet.</p>;
    }
    return (
      <div className="mt-4">
        <h4 className="text-center">View Results</h4>
        <table className="table table-bordered table-striped">
          <thead>
            <tr>
              <th>Checking Process</th>
              <th>Bounding Box</th>
              <th>Evalution</th>
            </tr>
          </thead>
          <tbody>
            {detections.map((detection, index) => (
              <tr key={index}>
                <td>{detection.class}</td>
                <td>
                  {`[${Math.round(detection.bbox[0])}, ${Math.round(detection.bbox[1])}, 
                  ${Math.round(detection.bbox[2])}, ${Math.round(detection.bbox[3])}]`}
                </td>
                <td>{(detection.score * 100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="container mt-5">
      <div className="row">
        <div className="col">
          <video ref={videoRef} autoPlay className="video-element" />
          <canvas ref={canvasRef} className="canvas-element" />
        </div>
        <div className="col">
          <h3>Animal Temperature: {temperature}🌡</h3>
          <button
            onClick={toggleDetection}
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isDetecting ? 'Stop Detection' : 'Start Detection'}
          </button>
          {isLoading && <div>Loading model...</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          {alertMessage && <div className="alert alert-danger">{alertMessage}</div>}
          {renderDetectionTable()}
        </div>
      </div>
    </div>
  );
};

export default ObjectDetection;
