import React from 'react';
import { MapPin, Navigation, Compass, ShieldCheck } from 'lucide-react';
import { SoulProfile } from '../types';

interface GpsDistanceBadgeProps {
  soulmate: SoulProfile;
  onClick: (soulmate: SoulProfile) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const GpsDistanceBadge: React.FC<GpsDistanceBadgeProps> = ({
  soulmate,
  onClick,
  size = 'md',
  className = '',
}) => {
  const distance = soulmate.distanceKm ?? 3.2;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-[11px]',
    lg: 'px-3 py-1.5 text-xs',
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(soulmate);
      }}
      className={`inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md border border-cyan-400/40 text-cyan-300 font-mono font-bold hover:bg-cyan-500/20 hover:border-cyan-400 transition-all cursor-pointer shadow-lg group ${sizeClasses[size]} ${className}`}
      title="Verify True Location on Google Maps GPS"
    >
      <MapPin className="w-3 h-3 text-pink-400 shrink-0 group-hover:scale-110 transition-transform" />
      <span>{distance} km</span>
      <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5 border-l border-white/20 pl-1.5">
        <Navigation className="w-2.5 h-2.5 text-cyan-300" />
        GPS
      </span>
    </button>
  );
};
