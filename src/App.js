import React, { useEffect, useRef } from "react";
import * as faceapi from "face-api.js";

const App = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Load face-api models and start the webcam
  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("/models");
      await faceapi.nets.ageGenderNet.loadFromUri("/models");
      startVideo();
    };

    // Start video stream from the webcam
    const startVideo = () => {
      navigator.mediaDevices.getUserMedia({ video: {} })
        .then((stream) => {
          videoRef.current.srcObject = stream;
        })
        .catch((err) => console.error("Error accessing webcam:", err));

      videoRef.current.addEventListener('play', () => {
        // Perform face detection when the video starts playing
        setInterval(async () => {
          const detections = await faceapi.detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions()
          )
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender();

          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          const { videoWidth, videoHeight } = videoRef.current;
          
          canvas.width = videoWidth;
          canvas.height = videoHeight;
          ctx.clearRect(0, 0, videoWidth, videoHeight);

          const resizedDetections = faceapi.resizeResults(detections, {
            width: videoWidth,
            height: videoHeight,
          });
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

          // Display gender, age, and emotion
          resizedDetections.forEach((result) => {
            const { gender, age, expressions } = result;
            const { x, y, width, height } = result.detection.box;
            ctx.font = "16px Arial";
            ctx.fillStyle = "blue";

            // Display gender and age
            ctx.fillText(`${gender} - ${Math.round(age)} years`, x, y - 10);

            // Display emotion
            const mostLikelyEmotion = Object.keys(expressions).reduce((a, b) =>
              expressions[a] > expressions[b] ? a : b
            );
            ctx.fillText(`Emotion: ${mostLikelyEmotion}`, x, y + height + 20);
          });
        }, 100);
      });
    };

    loadModels();
  }, []);

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        muted
        style={{ display: "block", width: "100%" }}
      />
      <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0 }} />
    </div>
  );
};

export default App;

