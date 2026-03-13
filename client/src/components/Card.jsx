import React from 'react';

export default function Card({ children, style, className = '' }) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  );
}
