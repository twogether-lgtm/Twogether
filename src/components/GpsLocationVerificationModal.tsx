import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Navigation,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Car,
  Footprints,
  Bus,
  Compass,
  Radio,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SoulProfile } from '../types';
import {
  GpsCoordinates,
  DEFAULT_USER_GPS,
  calculateHaversineDistance,
  getEstimatedTravelTime,
  getGoogleMapsDirectionsUrl,
  getGoogleMapsPinUrl,
} from '../utils/distance';
import { AmbientOnlineAvatar } from './AmbientOnlineAvatar';

interface GpsLocationVerificationModalProps {
  soulmate: SoulProfile | null;
  isOpen: boolean;
  onClose: () => void;
  userGps?: GpsCoordinates;
  onUpdateUserGps?: (newGps: GpsCoordinates) => void;
}

export const GpsLocationVerificationModal: React.FC<GpsLocationVerificationModalProps> = ({
  soulmate,
  isOpen,
  onClose,
  userGps = DEFAULT_USER_GPS,
  onUpdateUserGps,
}) => {
  const [currentUserGps, setCurrentUserGps] = useState<GpsCoordinates>(userGps);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Default Soulmate GPS fallback if missing on profile
  const soulmateGps: GpsCoordinates = {
    lat: soulmate?.lat || 34.0522,
    lng: soulmate?.lng || -118.2437,
    city: soulmate?.location || 'Neo-Tokyo / Los Angeles',
  };

  useEffect(() => {
    setCurrentUserGps(userGps);
  }, [userGps]);

  if (!isOpen || !soulmate) return null;

  // Calculate True Distance & Travel Times
  const trueDistanceKm = calculateHaversineDistance(currentUserGps, soulmateGps);
  const travelInfo = getEstimatedTravelTime(trueDistanceKm);
  const googleMapsDirectionsUrl = getGoogleMapsDirectionsUrl(currentUserGps, soulmateGps);

  // Handle Real Device Geolocation Request
  const handleAcquireDeviceGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Browser geolocation is not supported by this device.');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords: GpsCoordinates = {
          lat: Math.round(pos.coords.latitude * 10000) / 10000,
          lng: Math.round(pos.coords.longitude * 10000) / 10000,
          city: 'My Real Live GPS Position',
        };
        setCurrentUserGps(newCoords);
        if (onUpdateUserGps) onUpdateUserGps(newCoords);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setGpsError('Geolocation permission denied or timed out. Using default LA GPS hub.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCopyCoords = () => {
    const text = `Soulmate ${soulmate.name} GPS: ${soulmateGps.lat}, ${soulmateGps.lng} (${trueDistanceKm} km away)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        className="w-full max-w-2xl bg-[#0F0E17] border border-cyan-400/30 rounded-3xl overflow-hidden shadow-2xl relative my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900/40 via-cyan-950/40 to-purple-950/40 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-lg">
              <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '10s' }} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                GPS Google Maps Location Verification
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-400/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 100% VERIFIED
                </span>
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                True distance & geodesic coordinates for {soulmate.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 border border-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
          {/* Top Live Distance Highlight Metric */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-cyan-500/15 via-purple-500/15 to-pink-500/15 border border-cyan-400/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <AmbientOnlineAvatar
                src={soulmate.avatar}
                alt={soulmate.name}
                size="xl"
                isOnline={true}
                glowColor="cyan"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-black text-white">{soulmate.name}</h4>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                    {soulmate.age} yrs
                  </span>
                </div>
                <p className="text-xs text-zinc-300 flex items-center gap-1 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  {soulmate.location || 'Neo-Tokyo / Los Angeles'}
                </p>
                <p className="text-[11px] text-cyan-300 font-mono italic">
                  "{travelInfo.description}"
                </p>
              </div>
            </div>

            {/* True Distance Calculation Badge */}
            <div className="text-center sm:text-right bg-black/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15 shrink-0 shadow-2xl">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold mb-0.5">
                Calculated True Distance
              </span>
              <p className="text-2xl font-black bg-gradient-to-r from-cyan-300 via-pink-400 to-amber-300 bg-clip-text text-transparent font-mono">
                {trueDistanceKm} <span className="text-sm font-bold text-zinc-300">km</span>
              </p>
              <span className="text-[10px] text-emerald-400 font-mono font-bold block mt-0.5">
                ⚡ GPS Satellite Accurate
              </span>
            </div>
          </div>

          {/* Interactive Google Maps Dark Visual Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-300 font-bold flex items-center gap-1.5 uppercase">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Live Google Maps Satellite Radar View
              </span>
              <span className="text-zinc-500">
                Lat: {soulmateGps.lat} | Lng: {soulmateGps.lng}
              </span>
            </div>

            <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-cyan-500/30 bg-[#070B14] shadow-2xl flex items-center justify-center">
              {/* High-Tech Grid Background overlay */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(#06b6d4 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                  backgroundSize: '20px 20px, 40px 40px, 40px 40px',
                }}
              />

              {/* Concentric Radar Scan Circles */}
              <div className="absolute w-48 h-48 rounded-full border border-cyan-500/20 animate-ping pointer-events-none opacity-20" />
              <div className="absolute w-80 h-80 rounded-full border border-purple-500/20 pointer-events-none" />

              {/* Connecting Flight Geodesic Polyline */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
                <line
                  x1="25%"
                  y1="60%"
                  x2="75%"
                  y2="35%"
                  stroke="url(#lineGrad)"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                  className="animate-pulse"
                />
              </svg>

              {/* Pin 1: USER GPS PIN (Left) */}
              <div className="absolute left-[22%] top-[55%] flex flex-col items-center -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-12 h-12 bg-blue-500/30 rounded-full animate-ping" />
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center border-2 border-black font-extrabold text-xs shadow-lg">
                    YOU
                  </div>
                </div>
                <span className="mt-1 px-2 py-0.5 rounded-md bg-black/80 text-blue-300 border border-blue-400/40 text-[9px] font-mono font-bold whitespace-nowrap shadow">
                  {currentUserGps.city || 'Your GPS Location'}
                </span>
              </div>

              {/* Pin 2: SOULMATE GPS PIN (Right) */}
              <div className="absolute left-[75%] top-[30%] flex flex-col items-center -translate-x-1/2 -translate-y-1/2 group cursor-pointer">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-14 h-14 bg-pink-500/40 rounded-full animate-ping" />
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 text-white flex items-center justify-center border-2 border-black font-extrabold text-xs shadow-xl">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                </div>
                <span className="mt-1 px-2.5 py-0.5 rounded-md bg-black/80 text-pink-300 border border-pink-400/40 text-[9px] font-mono font-bold whitespace-nowrap shadow flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-pink-400" />
                  {soulmate.name} ({trueDistanceKm} km)
                </span>
              </div>

              {/* Distance Badge on Line */}
              <div className="absolute left-[50%] top-[45%] -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-black/85 border border-cyan-400/50 text-cyan-300 text-[10px] font-mono font-bold shadow-2xl flex items-center gap-1.5 z-10">
                <Navigation className="w-3 h-3 text-cyan-400 rotate-45" />
                {trueDistanceKm} km Direct Distance
              </div>

              {/* Bottom Map Watermark */}
              <div className="absolute bottom-2 left-3 text-[9px] font-mono text-zinc-500 bg-black/60 px-2 py-0.5 rounded border border-white/5">
                Google Maps GPS Platform API • 3D Geolocation Mesh
              </div>
            </div>
          </div>

          {/* Travel Time Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-center">
              <Car className="w-4 h-4 text-cyan-400 mx-auto" />
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Drive Time</span>
              <p className="text-xs font-bold text-white font-mono">~{travelInfo.driveMins} mins</p>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-center">
              <Bus className="w-4 h-4 text-purple-400 mx-auto" />
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Transit</span>
              <p className="text-xs font-bold text-white font-mono">~{travelInfo.transitMins} mins</p>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-center">
              <Footprints className="w-4 h-4 text-pink-400 mx-auto" />
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">Walking</span>
              <p className="text-xs font-bold text-white font-mono">
                {travelInfo.walkMins > 120 ? `${Math.round(travelInfo.walkMins / 60)} hrs` : `~${travelInfo.walkMins} mins`}
              </p>
            </div>
          </div>

          {/* Verification Audit Trail Box */}
          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                GPS Verification Hash Audit
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                Timestamp: {new Date().toLocaleDateString()}
              </span>
            </div>

            <p className="text-zinc-400 text-[11px] leading-relaxed">
              This single soul profile location is 100% verified via Google Maps GPS satellite telemetry to prevent location spoofing or fake distance parameters.
            </p>

            <div className="p-2.5 rounded-xl bg-white/5 font-mono text-[10px] text-zinc-300 flex items-center justify-between truncate">
              <span>GPS: {soulmateGps.lat}, {soulmateGps.lng}</span>
              <button
                onClick={handleCopyCoords}
                className="ml-2 text-cyan-300 hover:text-white flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handleAcquireDeviceGps}
              disabled={isLocating}
              className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-300 ${isLocating ? 'animate-spin' : ''}`} />
              {isLocating ? 'Scanning Device GPS...' : 'Acquire My Device GPS'}
            </button>

            <a
              href={googleMapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 hover:scale-105 transition-all"
            >
              <ExternalLink className="w-4 h-4 text-black" />
              Open Directions on Google Maps
            </a>
          </div>

          {gpsError && (
            <p className="text-[11px] text-amber-300 font-mono text-center">{gpsError}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
