import React from 'react';
import { CheckCircle2, Crown } from 'lucide-react';

interface VerificationBadgeProps {
  tier?: 'basic' | 'vip' | string;
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  tier = 'basic',
  isVerified = true,
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const isVip = tier === 'vip';

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const containerSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  if (!isVerified) return null;

  if (isVip) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-bold ${containerSizes[size]} text-amber-300 ${className}`}
        title="VIP Member — Verified Gold Checkmark"
      >
        <span className="relative flex items-center justify-center p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-400 text-black shadow-md shadow-amber-500/30 border border-yellow-200">
          <CheckCircle2 className={`${iconSizes[size]} fill-amber-400 text-black stroke-[2.5]`} />
        </span>
        {showLabel && (
          <span className="flex items-center gap-0.5 font-mono text-amber-300 font-extrabold uppercase tracking-wide">
            <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
            VIP Gold
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold ${containerSizes[size]} text-blue-400 ${className}`}
      title="100% Biometric Verified — Blue Checkmark"
    >
      <span className="relative flex items-center justify-center p-0.5 rounded-full bg-blue-500 text-white shadow-md shadow-blue-500/30">
        <CheckCircle2 className={`${iconSizes[size]} fill-blue-500 text-white stroke-[2.5]`} />
      </span>
      {showLabel && (
        <span className="font-mono text-blue-300 font-extrabold uppercase tracking-wide">
          Blue Verified
        </span>
      )}
    </span>
  );
};
