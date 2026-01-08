'use client';

import { useState } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
  src: string;
  alt: string;
  className?: string;
  thumbnailClassName?: string;
}

export function ImageLightbox({ src, alt, className, thumbnailClassName }: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Thumbnail with click handler */}
      <div
        className={cn("relative cursor-pointer group", className)}
        onClick={() => setIsOpen(true)}
      >
        <img
          src={src}
          alt={alt}
          className={cn("w-full h-full object-cover", thumbnailClassName)}
        />
        {/* Hover overlay with zoom icon */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
      </div>

      {/* Lightbox modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-8 w-8" />
          </button>

          {/* Full size image */}
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// Simplified version that wraps existing img elements
interface ClickableImageProps {
  src: string;
  alt: string;
  children: React.ReactNode;
}

export function ClickableImage({ src, alt, children }: ClickableImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Wrapper with click handler */}
      <div
        className="relative cursor-pointer group"
        onClick={() => setIsOpen(true)}
      >
        {children}
        {/* Hover overlay with zoom icon */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center pointer-events-none">
          <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
      </div>

      {/* Lightbox modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-8 w-8" />
          </button>

          {/* Full size image */}
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
