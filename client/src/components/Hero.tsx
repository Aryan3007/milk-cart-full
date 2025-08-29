import { useState, useEffect } from "react";
import { Leaf, Shield, Heart } from "lucide-react";

export default function Hero() {
  const [currentMobileVideo, setCurrentMobileVideo] = useState(0);
  const mobileVideos = ["/vid1.mp4", "/vid2.mp4"];

  // Auto-switch videos on mobile every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMobileVideo((prev) => (prev + 1) % mobileVideos.length);
    }, 5000); // Switch every 5 seconds

    return () => clearInterval(interval);
  }, [mobileVideos.length]);

  const scrollToProducts = () => {
    document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      className="relative flex items-center justify-center h-full min-h-screen pt-24 pb-8 overflow-hidden bg-black lg:pt-12"
    >
      {/* Background Videos */}
      <div className="absolute inset-0 bg-black pointer-events-none opacity-40">
        {/* Desktop videos - hidden on mobile */}
        <div className="hidden w-full h-full md:block">
          <video
            src="/herovid.mp4"
            autoPlay
            loop
            muted
            className="object-cover w-full h-full"
          ></video>
        </div>

        {/* Mobile videos - with smooth transitions */}
        <div className="relative w-full h-full md:hidden">
          {mobileVideos.map((videoSrc, index) => (
            <video
              key={videoSrc}
              src={videoSrc}
              autoPlay
              loop
              muted
              className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-1000 ${
                index === currentMobileVideo ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl px-4 mx-auto text-center sm:px-6 lg:px-8">
        {/* Hero Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-medium border rounded-full shadow-lg bg-white/80 backdrop-blur-sm text-emerald-700 border-emerald-100">
          <Leaf size={16} className="text-emerald-600" />
          <span>100% Pure & Natural</span>
        </div>

        {/* Main Heading */}
        <h1 className="mb-6 text-4xl font-black leading-tight sm:text-6xl lg:text-7xl">
          <span className="text-transparent bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text">
            Farm Fresh Dairy
          </span>
          <span className="block mt-2 text-slate-100">
            Delivered with
            <span className="relative">
              <span className="text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text">
                {" "}
                Love
              </span>
              <Heart
                className="absolute text-pink-400 -top-2 -right-8 animate-pulse"
                size={24}
              />
            </span>
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-3xl mx-auto mb-8 text-xl leading-relaxed sm:text-2xl text-slate-100">
          Bringing 100% pure, authentic dairy products from our farm to your
          family — with sustainable practices in{" "}
          <span className="font-semibold text-green-600">
            hygienic glass bottles
          </span>{" "}
          and <span className="font-semibold text-green-600">utensils</span>{" "}
          that preserve freshness and flavor.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-emerald-100 text-emerald-700">
            <Shield size={16} />
            <span>Quality Assured</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-full">
            <Leaf size={16} />
            <span>Eco-Friendly</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-100 rounded-full">
            <Heart size={16} />
            <span>100% Pure</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={scrollToProducts}
            className="relative px-8 py-4 text-lg font-semibold text-white transition-all duration-300 transform rounded-full shadow-xl group bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 hover:scale-105 hover:shadow-2xl"
          >
            <span className="relative z-10">Explore Products</span>
            <div className="absolute inset-0 transition-opacity duration-300 rounded-full opacity-0 bg-gradient-to-r from-emerald-500 to-teal-500 group-hover:opacity-100 blur-sm"></div>
          </button>

          {/* <button className="flex items-center px-6 py-4 space-x-2 text-lg font-semibold transition-all duration-300 transform border rounded-full shadow-lg group bg-white/90 backdrop-blur-sm hover:bg-white text-slate-700 hover:text-emerald-600 hover:scale-105 border-emerald-100">
            <div className="p-1 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400">
              <Play size={16} className="text-white ml-0.5" />
            </div>
            <span>Watch Our Story</span>
          </button> */}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </section>
  );
}
