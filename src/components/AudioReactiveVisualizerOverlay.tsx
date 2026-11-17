import React, { useEffect, useRef } from 'react';

export type VisualizerMode = 'spectrum_bars' | 'love_halo' | 'plasma_wave';

interface AudioReactiveVisualizerOverlayProps {
  isPlaying: boolean;
  songBpm?: number;
  audioElement?: HTMLAudioElement | null;
  mode?: VisualizerMode;
  colorScheme?: 'neon' | 'rose' | 'gold';
  height?: string;
  className?: string;
}

export const AudioReactiveVisualizerOverlay: React.FC<AudioReactiveVisualizerOverlayProps> = ({
  isPlaying,
  songBpm = 104,
  audioElement,
  mode = 'spectrum_bars',
  colorScheme = 'neon',
  height = '100%',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Setup Web Audio Analyser if audioElement is provided
  useEffect(() => {
    if (!audioElement) return;

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      // Note: We avoid reconnecting if already connected to prevent errors
      const ctx = new AudioCtxClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      try {
        const source = ctx.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(ctx.destination);
      } catch {
        // Fallback to simulated pulse if CORS restricts createMediaElementSource
      }

      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
    } catch {
      // ignore
    }
  }, [audioElement]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = (canvas.width = canvas.clientWidth);
      const height = (canvas.height = canvas.clientHeight);

      ctx.clearRect(0, 0, width, height);

      // Read real audio frequency data or simulate rhythmic pulse
      let frequencies: number[] = [];
      if (analyserRef.current && dataArrayRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        frequencies = Array.from(dataArrayRef.current).map((v: number) => v / 255);
      } else {
        // Fallback rhythmic frequency generator based on BPM
        const beatInterval = 60 / songBpm; // seconds per beat
        const t = performance.now() / 1000;
        const beatPhase = (t % beatInterval) / beatInterval;
        const pulse = isPlaying ? Math.exp(-beatPhase * 4) * 0.9 : 0.08;

        frequencies = Array.from({ length: 32 }).map((_, i) => {
          const wave = Math.sin(t * 3 + i * 0.3) * 0.25;
          const bassBoost = i < 8 ? pulse * 0.8 : pulse * 0.3;
          return Math.max(0.04, Math.min(1, bassBoost + wave + 0.15));
        });
      }

      phase += isPlaying ? 0.04 : 0.005;

      // Color palette definitions
      const colors = {
        neon: {
          primary: '#06B6D4', // Cyan
          secondary: '#EC4899', // Pink
          glow: 'rgba(6, 182, 212, 0.4)',
        },
        rose: {
          primary: '#F43F5E', // Rose
          secondary: '#FB7185', // Light Rose
          glow: 'rgba(244, 63, 94, 0.4)',
        },
        gold: {
          primary: '#F59E0B', // Amber
          secondary: '#FCD34D', // Gold
          glow: 'rgba(245, 158, 11, 0.4)',
        },
      }[colorScheme];

      // -------------------------------------------------------------
      // MODE 1: SPECTRUM BARS (Holographic Equalizer across bottom)
      // -------------------------------------------------------------
      if (mode === 'spectrum_bars') {
        const barCount = 36;
        const barWidth = width / barCount - 2;

        for (let i = 0; i < barCount; i++) {
          const freqVal = frequencies[i % frequencies.length] || 0.1;
          const barHeight = freqVal * (height * 0.45);
          const x = i * (barWidth + 2);
          const y = height - barHeight;

          // Gradient
          const grad = ctx.createLinearGradient(0, y, 0, height);
          grad.addColorStop(0, colors.secondary);
          grad.addColorStop(0.5, colors.primary);
          grad.addColorStop(1, 'transparent');

          ctx.fillStyle = grad;
          ctx.shadowColor = colors.primary;
          ctx.shadowBlur = isPlaying ? 10 : 2;

          // Rounded bar top
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
          ctx.fill();
        }
      }

      // -------------------------------------------------------------
      // MODE 2: LOVE HALO (Pulsing Concentric Love Heart & Rings)
      // -------------------------------------------------------------
      else if (mode === 'love_halo') {
        const cx = width / 2;
        const cy = height / 2;
        const avgFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
        const baseRadius = Math.min(width, height) * 0.18;
        const dynamicRadius = baseRadius + avgFreq * 60;

        // Outer ripple rings
        for (let r = 1; r <= 3; r++) {
          ctx.beginPath();
          ctx.arc(cx, cy, dynamicRadius * (1 + r * 0.28), 0, Math.PI * 2);
          ctx.strokeStyle = colors.primary;
          ctx.globalAlpha = Math.max(0.05, (0.4 / r) * (isPlaying ? avgFreq * 1.5 : 0.2));
          ctx.lineWidth = 2;
          ctx.shadowColor = colors.secondary;
          ctx.shadowBlur = 12;
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        // Central Heart / Orb Pulse
        ctx.beginPath();
        ctx.arc(cx, cy, dynamicRadius, 0, Math.PI * 2);
        const haloGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, dynamicRadius);
        haloGrad.addColorStop(0, 'rgba(236, 72, 153, 0.45)');
        haloGrad.addColorStop(0.7, 'rgba(6, 182, 212, 0.2)');
        haloGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = haloGrad;
        ctx.fill();
      }

      // -------------------------------------------------------------
      // MODE 3: PLASMA WAVE (Flowing Sine Waveform Ribbon)
      // -------------------------------------------------------------
      else if (mode === 'plasma_wave') {
        const cy = height * 0.65;
        const step = 6;

        ctx.beginPath();
        for (let x = 0; x <= width; x += step) {
          const idx = Math.floor((x / width) * frequencies.length);
          const f = frequencies[idx] || 0.1;
          const y =
            cy +
            Math.sin(x * 0.015 + phase) * (f * 50) +
            Math.cos(x * 0.03 - phase * 0.8) * (f * 25);

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = 3;
        ctx.shadowColor = colors.primary;
        ctx.shadowBlur = 14;
        ctx.stroke();

        // Second subtle wave
        ctx.beginPath();
        for (let x = 0; x <= width; x += step) {
          const idx = Math.floor((x / width) * frequencies.length);
          const f = frequencies[idx] || 0.1;
          const y =
            cy +
            Math.cos(x * 0.02 + phase * 1.2) * (f * 40) -
            Math.sin(x * 0.01 - phase) * (f * 15);

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, songBpm, mode, colorScheme]);

  return (
    <div
      className={`relative w-full pointer-events-none overflow-hidden ${className}`}
      style={{ height }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
