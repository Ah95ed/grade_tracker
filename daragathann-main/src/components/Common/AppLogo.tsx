import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number | string;
  alt?: string;
}

/**
 * Official App Logo for "Teacher Gradebook - دفتر درجات المعلم"
 * Renders the brand SVG with graduation cap, performance charts, and academic star.
 */
export const AppLogo: React.FC<AppLogoProps> = ({
  className = 'w-10 h-10',
  size,
  alt = 'شعار دفتر درجات المعلم',
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={alt}
    >
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id="logo-cap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="logo-chart" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#5eead4" />
        </linearGradient>
      </defs>
      {/* Circular Background */}
      <circle cx="256" cy="256" r="246" fill="url(#logo-bg)" />
      {/* Analytics Chart Bars */}
      <rect x="130" y="300" width="34" height="90" rx="10" fill="url(#logo-chart)" />
      <rect x="176" y="262" width="34" height="128" rx="10" fill="url(#logo-chart)" />
      <rect x="222" y="222" width="34" height="168" rx="10" fill="url(#logo-chart)" />
      {/* Performance Upward Trend Line */}
      <polyline
        points="120,330 200,270 260,240 330,180 395,150"
        fill="none"
        stroke="#ffffff"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="395" cy="150" r="16" fill="#fbbf24" stroke="#ffffff" strokeWidth="6" />
      {/* Graduation Cap */}
      <polygon points="256,52 396,116 256,180 116,116" fill="url(#logo-cap)" />
      <path d="M180 146 v52 c0 22 34 42 76 42 s76 -20 76 -42 v-52 l-76 34 z" fill="#f59e0b" />
      <line x1="396" y1="116" x2="396" y2="196" stroke="#fde68a" strokeWidth="9" strokeLinecap="round" />
      <circle cx="396" cy="206" r="13" fill="#fde68a" />
      {/* Academic Excellence Star */}
      <path
        d="M352,298 L362,321 L386,322 L367,337 L373,361 L352,347 L331,361 L337,337 L318,322 L342,321 Z"
        fill="#fbbf24"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </svg>
  );
};
