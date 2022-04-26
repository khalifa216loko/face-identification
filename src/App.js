import React, { useEffect, useState, useRef } from 'react';
import * as faceapi from 'face-api.js';
import './App.css';

function App() {
  const videoHeight = 720;
  const videoWidth = 550;
  const videoRef = useRef();
  const canvasRef = useRef();
  const [detect, setDetect] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + '/models';
      Promise.all([
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL) //heavier/accurate version of tiny face detector
      ]).then(startVideo);
    }

    loadModels();
  }, []);

  const startVideo = () => {
    navigator.getUserMedia(
      {video: {}},
      stream => videoRef.current.srcObject = stream,
      err => console.error(err)
    );
  }

  const loadLabeledImages = () => {
    const LABELS_URL = process.env.PUBLIC_URL + '/labeled_images/';
    const labels = ['Black Widow', 'Captain America', 'Captain Marvel', 'Hawkeye', 'Jim Rhodes', 'Thor', 'Tony Stark', 'Umair Nadeem'];
    // const labels = ['Umair Nadeem'];

    return Promise.all(
        labels.map(async (label) => {
            const descriptions = [];
            for(let i=1 ; i<=2 ; i++) {
                // const img = await faceapi.fetchImage(`https://eximo-hrms.s3.amazonaws.com/labeled_images/${label}/${i}.jpg`);
                const img = await faceapi.fetchImage(`${LABELS_URL}${label}/${i}.jpg`);
                const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

                descriptions.push(detections.descriptor);
            }
            document.body.append(label + 'Faces Loaded');
            return new faceapi.LabeledFaceDescriptors(label, descriptions);
        })
    )
  }

  const handleVideoOnPlay = async () => {
    const labeledDescriptors = await loadLabeledImages();
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);

    // videoRef.current.addEventListener('play', () => {
        console.log('video playing...');

        canvasRef.current.innerHTML = faceapi.createCanvasFromMedia(videoRef.current);
        // document.body.append(canvas);

        const displaySize = { width: videoWidth, height: videoHeight };
        faceapi.matchDimensions(canvasRef.current, displaySize);

        setInterval(async () => {
            const detections = await faceapi.detectAllFaces(videoRef.current).withFaceLandmarks().withFaceDescriptors();

            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            canvasRef.current.getContext('2d').clearRect(0, 0, videoWidth, videoHeight);

            const results = resizedDetections.map((d) => {
                return faceMatcher.findBestMatch(d.descriptor);
            })

            results.forEach((result, i) => {
                const box = resizedDetections[i].detection.box;
                const drawBox = new faceapi.draw.DrawBox(box, {label: result.toString()});

                drawBox.draw(canvasRef.current);

                if (result._label === 'Umair Nadeem') {
                  setDetect(true);
                }
            });
        }, 100);
    // })
  }

  return (
    <div className="App">
      <span>{detect ? 'Detected' : 'Not Detected yet...'}</span>
      <div className="display-flex justify-content-center">
        <video ref={videoRef} id="videoInput" width={videoWidth} height={videoHeight} muted controls onPlay={handleVideoOnPlay}></video>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default App;
