import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui';
import { Link } from 'react-router-dom';

export function HeroCarousel({ slides, kicker, heading, subheading, showCta, isAuthed }) {
  const activeSlides = useMemo(() => (slides || []).filter((s) => s.isActive !== false), [slides]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % activeSlides.length);
    }, 5000);
    return () => clearInterval(t);
  }, [activeSlides.length]);

  const slide = activeSlides[index] || null;
  const hasTextOverlay = kicker || heading || subheading;

  return (
    <section className="pt-0 w-full">
      <div className="relative w-full h-96 overflow-hidden bg-slate-100">
        <img src={slide?.imageUrl || '/hero-frame.png'} alt="" className="h-full w-full object-cover" />

          {/* Text overlay */}
          {hasTextOverlay && (
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent flex items-end z-10">
              <div className="w-full p-8 sm:p-12 lg:p-16 max-w-3xl">
                {kicker && (
                  <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-slate-300 mb-3">{kicker}</p>
                )}
                {heading && (
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
                    {heading}
                  </h1>
                )}
                {subheading && (
                  <p className="text-base sm:text-lg text-slate-200 mb-6 max-w-xl">
                    {subheading}
                  </p>
                )}
                {showCta && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link to="/courses">
                      <Button className="bg-primary text-white px-6 py-3 text-base">
                        Jelajahi Kursus
                      </Button>
                    </Link>
                    {!isAuthed && (
                      <Link to="/register">
                        <Button variant="outline" className="border-white text-white px-6 py-3 text-base hover:bg-white/10">
                          Daftar Sekarang
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    </section>
  );
}

