import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className = 'w-9 h-9' }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="#0284C7" />
      <path
        d="M11 27.5V14.5C11 13.1193 12.1193 12 13.5 12H20V28H13.5C12.1193 28 11 27.7761 11 27.5Z"
        fill="#FFFFFF"
        fillOpacity="0.95"
      />
      <path
        d="M29 27.5V14.5C29 13.1193 27.8807 12 26.5 12H20V28H26.5C27.8807 28 29 27.7761 29 27.5Z"
        fill="#14B8A6"
      />
      <path
        d="M15.5 17.5H18M15.5 21.5H18"
        stroke="#0F294A"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M22.5 19.8L24.2 21.5L27.2 17.5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface EditorialImageProps {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}

export function EditorialImage({
  src,
  alt,
  fallbackTitle,
  className = '',
}: EditorialImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-sky-50 via-white to-teal-50 border border-slate-200 text-navy-900 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-12 h-12 rounded-xl bg-sky-100 text-cerulean-600 flex items-center justify-center mb-3">
          <BookOpen className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-navy-900">{fallbackTitle}</p>
        <p className="text-xs text-slate-500 mt-1">ASESMEN CERDAS · SD Fase C</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
