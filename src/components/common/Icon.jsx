import React from 'react';

export default function Icon({ name, className = 'ico' }) {
  return (
    <svg className={className} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}
