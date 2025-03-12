import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { gsap } from "gsap";

const Upload = () => {
  const [file, setFile] = useState(null);
  const [imageURL, setImageURL] = useState("");
  const [detections, setDetections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImageURL(URL.createObjectURL(selectedFile));
      setDetections([]);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) return alert("Please select an image first!");

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Upload image to backend
      const uploadResponse = await axios.post(
        "http://127.0.0.1:8000/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const { image_path } = uploadResponse.data;

      // Send for prediction
      const predictResponse = await axios.post("http://127.0.0.1:8000/predict", {
        image_path: image_path.replace(/\\/g, "/"),
        score_threshold: 0,
      });

      setDetections(predictResponse.data);
      gsap.from(".processed-image", { opacity: 0, y: 50, duration: 1 });
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to process image!");
    } finally {
      setIsLoading(false);
    }
  };

  // Draw bounding boxes on canvas
  useEffect(() => {
    if (!imageURL || detections.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = imageURL;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      detections.forEach((det) => {
        const color = det.class === "Hole" ? "#EF4444" : "#F59E0B"; // Red for Hole, Yellow for infected
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(det.x, det.y, det.width, det.height);

        // Add label text
        ctx.fillStyle = color;
        ctx.font = "16px Arial";
        ctx.fillText(`${det.class} (${(det.confidence * 100).toFixed(1)}%)`, det.x, det.y - 5);
      });
    };
  }, [imageURL, detections]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center py-12">
      <h1 className="text-4xl font-bold mb-8 animate-fade-in">
        Leaf Disease Detection
      </h1>

      {/* File Input */}
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96 animate-fade-in">
        <input
          type="file"
          accept="image/*"
          className="p-3 rounded-md bg-gray-100 text-black w-full mb-4"
          onChange={handleFileChange}
        />

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={isLoading}
          className="w-full px-6 py-3 bg-blue-600 rounded-lg text-lg font-semibold hover:bg-blue-700 transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Processing..." : "Upload & Analyze"}
        </button>
      </div>

      {/* Display Image with Bounding Boxes */}
      {imageURL && (
        <div className="mt-8 text-center processed-image">
          <h2 className="text-2xl font-bold mb-4">Processed Image:</h2>
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="rounded-lg shadow-lg max-w-full"
            />
            {/* Hover Tooltips */}
            {detections.map((det) => (
              <div
                key={det.detection_id}
                className="absolute"
                style={{
                  left: `${det.x}px`,
                  top: `${det.y}px`,
                  width: `${det.width}px`,
                  height: `${det.height}px`,
                }}
              >
                <div className="tooltip bg-gray-800/50 cursor-default text-white w-fit  top-0 p-2 rounded-lg opacity-0 hover:opacity-100 transition-opacity">
                  <p>Class: {det.class}</p>
                  <p>Confidence: {(det.confidence * 100).toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="mt-8">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default Upload;