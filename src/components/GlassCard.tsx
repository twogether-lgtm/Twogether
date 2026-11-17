import React from 'react';
import { motion } from 'motion/react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'pink' | 'purple' | 'amber';
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glowColor = 'cyan',
  onClick,
  hoverEffect = true,
}) => {
  const borderGlowMap = {
    cyan: 'hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(0,242,254,0.25)]',
    pink: 'hover:border-pink-500/50 hover:shadow-[0_0_25px_rgba(255,8,68,0.25)]',
    purple: 'hover:border-purple-400/50 hover:shadow-[0_0_25px_rgba(187,134,252,0.25)]',
    amber: 'hover:border-amber-400/50 hover:shadow-[0_0_25px_rgba(255,184,0,0.25)]',
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={hoverEffect ? { y: -3, scale: 1.005 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={`
        relative backdrop-blur-2xl bg-white/[0.05]
        border border-white/10 rounded-2xl
        shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]
        transition-all duration-300 overflow-hidden
        ${hoverEffect ? borderGlowMap[glowColor] : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Light sheen gradient overlay */}
      <div className="absolute -inset-px bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none rounded-2xl" />
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
};
