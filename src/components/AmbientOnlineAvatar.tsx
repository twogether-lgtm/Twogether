import React from 'react';
import { motion } from 'motion/react';

interface AmbientOnlineAvatarProps {
  src: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isOnline?: boolean;
  onlineText?: string;
  glowColor?: 'emerald' | 'cyan' | 'pink' | 'purple' | 'amber';
  className?: string;
  showOnlineBadge?: boolean;
  pulseSpeed?: 'slow' | 'fast';
  onClick?: () => void;
}

export const AmbientOnlineAvatar: React.FC<AmbientOnlineAvatarProps> = ({
  src,
  alt,
  size = 'md',
  isOnline = true,
  onlineText = 'ONLINE',
  glowColor = 'emerald',
  className = '',
  showOnlineBadge = true,
  pulseSpeed = 'slow',
  onClick,
}) => {
  // Size mappings
  const sizeClasses = {
    xs: 'w-7 h-7 text-[8px]',
    sm: 'w-9 h-9 text-[10px]',
    md: 'w-12 h-12 text-xs',
    lg: 'w-16 h-16 text-sm',
    xl: 'w-24 h-24 text-base',
    '2xl': 'w-32 h-32 text-lg',
  };

  const badgeSizeClasses = {
    xs: 'w-2 h-2 -bottom-0.5 -right-0.5',
    sm: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5',
    md: 'w-3.5 h-3.5 -bottom-1 -right-1',
    lg: 'w-4 h-4 -bottom-1 -right-1',
    xl: 'w-5 h-5 -bottom-1.5 -right-1.5',
    '2xl': 'w-6 h-6 -bottom-2 -right-2',
  };

  // Color mappings for ambient glow
  const colorGlows = {
    emerald: {
      aura: 'from-emerald-500/50 via-teal-400/30 to-emerald-600/10',
      ring: 'from-emerald-400 via-teal-300 to-cyan-400',
      dot: 'bg-emerald-400 shadow-emerald-400/80',
      ping: 'bg-emerald-400',
    },
    cyan: {
      aura: 'from-cyan-500/50 via-blue-400/30 to-purple-600/10',
      ring: 'from-cyan-400 via-blue-400 to-purple-500',
      dot: 'bg-cyan-400 shadow-cyan-400/80',
      ping: 'bg-cyan-400',
    },
    pink: {
      aura: 'from-pink-500/50 via-rose-400/30 to-purple-600/10',
      ring: 'from-pink-400 via-rose-400 to-purple-500',
      dot: 'bg-pink-400 shadow-pink-400/80',
      ping: 'bg-pink-400',
    },
    purple: {
      aura: 'from-purple-500/50 via-indigo-400/30 to-pink-600/10',
      ring: 'from-purple-400 via-indigo-400 to-pink-400',
      dot: 'bg-purple-400 shadow-purple-400/80',
      ping: 'bg-purple-400',
    },
    amber: {
      aura: 'from-amber-500/50 via-yellow-400/30 to-orange-600/10',
      ring: 'from-amber-400 via-yellow-300 to-orange-400',
      dot: 'bg-amber-400 shadow-amber-400/80',
      ping: 'bg-amber-400',
    },
  };

  const scheme = colorGlows[glowColor] || colorGlows.emerald;

  return (
    <div
      onClick={onClick}
      className={`relative inline-block group select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      title={isOnline ? `${alt} (${onlineText})` : `${alt} (Away)`}
    >
      {/* 1. Ambient Lighting Background Aura Glow */}
      {isOnline && (
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{
            duration: pulseSpeed === 'fast' ? 1.5 : 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={`absolute -inset-2 rounded-full bg-gradient-to-tr ${scheme.aura} blur-md pointer-events-none z-0 group-hover:scale-125 transition-transform`}
        />
      )}

      {/* 2. Outer Gradient Border Ring */}
      <div
        className={`relative z-10 ${sizeClasses[size]} rounded-full p-0.5 bg-gradient-to-tr ${
          isOnline ? scheme.ring : 'from-zinc-600 to-zinc-800'
        } shadow-lg transition-transform group-hover:scale-105`}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-black border border-black/80 relative">
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover rounded-full"
            loading="lazy"
          />
        </div>
      </div>

      {/* 3. Online Status Indicator Dot with Pulsing Radar Ring */}
      {showOnlineBadge && isOnline && (
        <div className={`absolute z-20 ${badgeSizeClasses[size]} flex items-center justify-center`}>
          {/* Radar wave ping */}
          <span
            className={`absolute inset-0 rounded-full ${scheme.ping} animate-ping opacity-75`}
          />
          {/* Solid core indicator */}
          <span
            className={`relative block w-full h-full rounded-full ${scheme.dot} border-2 border-black shadow-md`}
          />
        </div>
      )}
    </div>
  );
};
