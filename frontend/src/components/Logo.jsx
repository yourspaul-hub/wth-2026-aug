import React from 'react';
import logo from '../assets/wth-logo.svg';

/**
 * Brand logo component.
 * - variant="dark" renders on light backgrounds (default black artwork)
 * - variant="light" inverts artwork for dark backgrounds (footer, admin sidebar, dark hero)
 * - className: tailwind sizing e.g. "h-10" (defaults)
 */
const Logo = ({ variant = 'dark', className = 'h-10', alt = 'Wear The Hope' }) => {
  const invert = variant === 'light' ? { filter: 'invert(1) brightness(2)' } : undefined;
  return (
    <img
      src={logo}
      alt={alt}
      draggable={false}
      style={invert}
      className={`${className} w-auto select-none`}
    />
  );
};

export default Logo;
