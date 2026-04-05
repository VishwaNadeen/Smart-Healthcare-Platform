import { useEffect, useRef, useState } from "react";
import lottie from "lottie-web";
import loadingAnimation from "../../assets/animations/loading.json";

type Props = {
  message?: string;
};

function cloneAnimationData<T>(data: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(data);
  }

  return JSON.parse(JSON.stringify(data)) as T;
}

export default function FullScreenPageLoading({
  message = "Loading...",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasAnimationError, setHasAnimationError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: cloneAnimationData(loadingAnimation),
      rendererSettings: {
        preserveAspectRatio: "xMidYMid meet",
      },
    });

    const handleAnimationError = () => {
      setHasAnimationError(true);
    };

    animation.addEventListener("data_failed", handleAnimationError);
    animation.addEventListener("error", handleAnimationError);

    return () => {
      animation.removeEventListener("data_failed", handleAnimationError);
      animation.removeEventListener("error", handleAnimationError);
      animation.destroy();
    };
  }, []);

  return (
    <section className="flex h-[100dvh] w-full items-center justify-center overflow-hidden">
      <div className="flex flex-col items-center justify-center text-center">
        {hasAnimationError ? (
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        ) : (
          <div
            ref={containerRef}
            className="h-32 w-32 sm:h-40 sm:w-40"
            aria-label="Fullscreen page loading animation"
          />
        )}

        <p className="mt-3 text-sm text-slate-700">{message}</p>
      </div>
    </section>
  );
}
