import React, { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  placeholder?: React.ReactNode;
}

export function LazyImage({ src, alt, className, onClick, placeholder }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const defaultPlaceholder = (
    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <div className="w-16 h-2 bg-gray-300 rounded-full animate-pulse"></div>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`} onClick={onClick}>
      {!isInView || !isLoaded ? (
        placeholder || defaultPlaceholder
      ) : null}
      
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={handleLoad}
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            position: isLoaded ? 'static' : 'absolute',
            top: isLoaded ? 'auto' : 0,
            left: isLoaded ? 'auto' : 0,
            width: '100%',
            height: '100%'
          }}
        />
      )}
    </div>
  );
}
