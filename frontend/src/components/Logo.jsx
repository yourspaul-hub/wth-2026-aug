import React from 'react';
import logoWithTagline from '../assets/wth-logo.svg';
import logoClean from '../assets/wth-logo-clean.png';

/**
 * Brand logo component.
 * - variant="dark"  → default black artwork (light backgrounds)
 * - variant="light" → inverted for dark backgrounds (footer, admin sidebar)
 * - withTagline=true → uses SVG with tagline; default false uses clean PNG
 */
const Logo = ({ variant = 'dark', withTagline = false, className = 'h-10', alt = 'Wear The Hope' }) => {
  const invert = variant === 'light' ? { filter: 'invert(1) brightness(2)' } : undefined;
  const src = withTagline ? logoWithTagline : logoClean;
  return (
    <img src={src} alt={alt} draggable={false} style={invert} className={`${className} w-auto select-none`} />
  );
};

export default Logo;
