"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronDown } from "lucide-react";

export default function HeroSection() {
  const [opacity, setOpacity] = useState(1);
  const [translateY, setTranslateY] = useState(0);
  const [mounted, setMounted] = useState(false);
  const rafRef = useRef(0);

  useEffect(() => {
    // Trigger entrance animations after mount
    requestAnimationFrame(() => setMounted(true));

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const y = window.scrollY;
        setOpacity(Math.max(0, 1 - y / 500));
        setTranslateY(y * 0.16);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated gradient mesh */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 via-background to-cyan-950/15" />
        <div className="hero-orb-1 absolute top-1/3 -left-32 w-[500px] h-[500px] rounded-full bg-emerald-500/[0.07] blur-[100px]" />
        <div className="hero-orb-2 absolute bottom-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-cyan-500/[0.05] blur-[80px]" />
        <div className="hero-orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.03] blur-[120px]" />
      </div>

      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Hero content with scroll parallax */}
      <div
        style={{ opacity, transform: `translateY(${translateY}px)` }}
        className="relative z-10 text-center px-6 max-w-3xl"
      >
        <div
          className={`transition-all duration-700 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          <div className="inline-flex items-center gap-2 border border-border-theme rounded-full px-4 py-1.5 mb-8">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-text-muted tracking-wide">
              Available for opportunities
            </span>
          </div>
        </div>

        <h1
          className={`text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight mb-6 transition-all duration-700 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          Ryder Tetreault
        </h1>

        <p
          className={`text-accent text-lg sm:text-xl font-medium tracking-wide mb-6 transition-all duration-700 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "400ms" }}
        >
          Software Engineer · AI · Cyber Defense
        </p>

        <p
          className={`text-text-muted text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed transition-all duration-700 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "500ms" }}
        >
          AI-native software, security-minded engineering. I build products
          where AI does real work, grounded in cybersecurity and
          infrastructure defense.
        </p>

        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "600ms" }}
        >
          <button
            onClick={() => scrollTo("skills")}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium px-7 py-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20 cursor-pointer w-full sm:w-auto justify-center"
          >
            Learn More <ChevronDown size={16} />
          </button>
          <button
            onClick={() => scrollTo("contact")}
            className="inline-flex items-center gap-2 border border-border-theme hover:border-text-faint text-foreground px-7 py-3 rounded-xl transition-all duration-300 cursor-pointer w-full sm:w-auto justify-center"
          >
            Contact
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className={`absolute bottom-10 left-1/2 -translate-x-1/2 transition-opacity duration-500 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDelay: "1200ms" }}
      >
        <div className="animate-bounce-slow">
          <ChevronDown size={20} className="text-text-faint" />
        </div>
      </div>
    </section>
  );
}
