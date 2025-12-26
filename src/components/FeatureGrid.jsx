import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../hooks/useLanguage";
const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function FeatureGrid({ onTopicClick }) {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/topics/`);
        if (!res.ok) throw new Error("Failed to fetch topics");
        const data = await res.json();
        setTopics(data);
      } catch (err) {
        console.error("Error fetching topics:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTopics();
  }, []);

  const icons = ["123", "+", "−", "⬤"];
  
  // Colorful gradient backgrounds for each topic
  const gradients = [
    "from-purple-500 to-pink-500",
    "from-blue-500 to-cyan-500",
    "from-green-500 to-emerald-500",
    "from-orange-500 to-yellow-500",
  ];
  
  // Colored glow effects for hover
  const glows = [
    "shadow-glow-purple",
    "shadow-glow-blue",
    "shadow-glow-green",
    "shadow-lg",
  ];

  const features =
    topics.length > 0
      ? topics.map((topic, i) => ({
          label: lang === "hi"
            ? ["संख्याएँ", "जोड़", "घटाव", "आकार"][i] || topic
            : topic,
          icon: icons[i] || "❖",
          gradient: gradients[i] || "from-purple-500 to-pink-500",
          glow: glows[i] || "shadow-glow-purple",
        }))
      : [];

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4 w-full">
        {/* Loading skeleton for browse teachers card */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="w-28 h-4 bg-white/20 rounded mb-2"></div>
              <div className="w-44 h-3 bg-white/20 rounded"></div>
            </div>
            <div className="w-16 h-8 bg-white/20 rounded"></div>
          </div>
        </div>

        {/* Loading skeleton for my teachers card */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="w-24 h-4 bg-white/20 rounded mb-2"></div>
              <div className="w-52 h-3 bg-white/20 rounded"></div>
            </div>
            <div className="w-16 h-8 bg-white/20 rounded"></div>
          </div>
        </div>

        {/* Loading skeleton for math topics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white/10 backdrop-blur-md rounded-xl p-3 sm:p-4 md:p-6 min-h-[100px] sm:min-h-[120px] md:min-h-[140px] flex flex-col items-center justify-center relative overflow-hidden"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
              <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white/20 rounded-full mb-2 sm:mb-3" />
              <div className="w-16 sm:w-20 h-3 sm:h-4 bg-white/20 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Browse Teachers */}
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl p-3 sm:p-4 border border-green-300/30">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm sm:text-base lg:text-lg">
              {lang === "hi" ? "शिक्षक खोजें" : "Browse Teachers"}
            </h3>
            <p className="text-white/70 text-xs sm:text-sm">
              {lang === "hi" ? "वीडियो लेक्चर देखें और सीखें" : "Watch video lectures and learn"}
            </p>
          </div>
          <button
            onClick={() => navigate('/find-teachers')}
            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 text-xs sm:text-sm flex-shrink-0"
          >
            {lang === "hi" ? "खोजें" : "Browse"}
          </button>
        </div>
      </div>

      {/* My Teachers */}
      <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-md rounded-xl p-3 sm:p-4 border border-orange-300/30">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm sm:text-base lg:text-lg">
              {lang === "hi" ? "मेरे शिक्षक" : "My Teachers"}
            </h3>
            <p className="text-white/70 text-xs sm:text-sm">
              {lang === "hi" ? "आपके नामांकित शिक्षकों की सामग्री देखें" : "Access content from your enrolled teachers"}
            </p>
          </div>
          <button
            onClick={() => navigate('/my-teachers')}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-medium hover:from-orange-600 hover:to-red-600 transition-all duration-200 text-xs sm:text-sm flex-shrink-0"
          >
            {lang === "hi" ? "देखें" : "View"}
          </button>
        </div>
      </div>

      {/* Math Topics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {features.map((f, i) => (
          <button
            key={i}
            className={`
              group relative
              bg-white/10 backdrop-blur-md 
              rounded-xl sm:rounded-2xl
              flex flex-col items-center justify-center 
              p-3 sm:p-4 md:p-6
              min-h-[100px] sm:min-h-[120px] md:min-h-[140px]
              text-white font-medium
              border-2 border-white/20
              shadow-lg
              transition-all duration-300 ease-out
              hover:scale-105 hover:shadow-2xl hover:${f.glow}
              active:scale-95
              animate-fade-in
              gpu-accelerated
              ${i === 3 ? 'hidden md:flex' : ''}
            `}
            style={{
              animationDelay: `${i * 100}ms`,
              animationFillMode: 'backwards'
            }}
            onClick={() => onTopicClick(f.label)}
            aria-label={`${lang === "hi" ? "विषय चुनें" : "Select topic"}: ${f.label}`}
          >
            {/* Gradient icon background */}
            <div className={`
              w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20
              rounded-full 
              bg-gradient-to-br ${f.gradient}
              flex items-center justify-center
              mb-2 sm:mb-3
              text-lg sm:text-2xl md:text-3xl
              transition-transform duration-300
              group-hover:scale-110
              group-active:scale-90
              gpu-accelerated
            `}
            aria-hidden="true">
              {f.icon}
            </div>
            
            {/* Topic label */}
            <div className="text-xs sm:text-sm md:text-base text-center leading-tight">
              {f.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
