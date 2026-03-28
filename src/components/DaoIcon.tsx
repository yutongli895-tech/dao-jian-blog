import React from 'react';

export const DaoIcon = ({ className = "w-10 h-10" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="1" />
      <path 
        d="M50 2C50 2 20 20 20 50C20 80 50 98 50 98C50 98 80 80 80 50C80 20 50 2 50 2Z" 
        stroke="currentColor" 
        strokeWidth="0.5" 
        strokeDasharray="2 2"
      />
      <circle cx="50" cy="50" r="15" fill="currentColor" fillOpacity="0.1" />
      <text 
        x="50" 
        y="58" 
        textAnchor="middle" 
        className="font-serif text-[32px] fill-current"
      >
        道
      </text>
    </svg>
  );
};
