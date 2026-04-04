import { useEffect, useState } from "react";
import "../../styles/homeHeroSlider.css";

import hero1 from "../../assets/home/slide_1.jpg";
import hero2 from "../../assets/home/slide_2.jpg";
import hero4 from "../../assets/home/slide_4.jpg";
import hero5 from "../../assets/home/slide_5.jpg";
import hero6 from "../../assets/home/slide_6.jpg";

const heroImages = [hero1, hero2, hero4, hero5, hero6];

const STAY_TIME = 4000; // how long image stays before next slide starts
const ANIMATION_TIME = 800; // must match CSS animation time (0.8s)

export default function HomeHeroSliderBackground() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);

  useEffect(() => {
    const stayTimer = setTimeout(() => {
      const nextIndex = (currentIndex + 1) % heroImages.length;

      setIncomingIndex(nextIndex);

      const animationTimer = setTimeout(() => {
        setCurrentIndex(nextIndex);
        setIncomingIndex(null);
      }, ANIMATION_TIME);

      return () => clearTimeout(animationTimer);
    }, STAY_TIME);

    return () => clearTimeout(stayTimer);
  }, [currentIndex]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-100" />

      <div className="absolute inset-0 opacity-90">
        {/* Current image stays fixed */}
        <img
          key={`current-${currentIndex}`}
          src={heroImages[currentIndex]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* Only new image slides from top to down */}
        {incomingIndex !== null && (
          <img
            key={`incoming-${incomingIndex}`}
            src={heroImages[incomingIndex]}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center animate-slide-down-in"
          />
        )}
      </div>

      <div className="absolute inset-0 bg-white/0" />
    </div>
  );
}
