import { Link } from "react-router-dom";
import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const Home = () => {
  useEffect(() => {
    // GSAP animations for the project info section
    gsap.from(".project-info", {
      opacity: 0,
      y: 50,
      duration: 1,
      scrollTrigger: {
        trigger: ".project-info",
        start: "top 80%",
        toggleActions: "play none none none",
      },
    });

    gsap.from(".project-image", {
      opacity: 0,
      x: -50,
      duration: 1,
      scrollTrigger: {
        trigger: ".project-image",
        start: "top 80%",
        toggleActions: "play none none none",
      },
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Hero Section */}
      <div className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
        >
          <source
            src="https://videos.pexels.com/video-files/3132090/3132090-uhd_2560_1440_24fps.mp4"
            type="video/mp4"
          />
          Your browser does not support the video tag.
        </video>

        {/* Hero Content */}
        <div className="relative z-10 text-center">
          <h1 className="text-6xl font-bold mb-6 animate-fade-in">
            Leaf Hole Detection
          </h1>
          <p className="text-xl mb-8 animate-fade-in">
            Upload an image of a leaf, and our AI model will detect holes in it.
          </p>
          <Link to="/upload">
            <button className="px-8 py-4 bg-green-600 rounded-lg text-xl font-semibold hover:bg-green-700 transition transform hover:scale-105">
              Upload Leaf Image
            </button>
          </Link>
        </div>
      </div>

      {/* Project Info Section */}
      <div className="py-20 px-10 bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 project-info">
            About the Project
          </h2>
          <div className="grid text-white grid-cols-1 md:grid-cols-2 gap-12">
            <div className="project-info">
              <h3 className="text-2xl font-bold mb-4">How It Works</h3>
              <p className="text-lg">
                Our advanced AI model analyzes leaf images to detect holes caused
                by pests or diseases. Simply upload an image, and the system will
                highlight the affected areas.
              </p>
            </div>
            <div className="project-image">
              <img
                src="https://images.unsplash.com/photo-1597334948332-2a775b4e2af6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80"
                alt="Leaf Analysis"
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;