import { motion } from 'framer-motion';

const BAR_COUNT = 9;
const HEIGHTS = [0.3, 0.5, 0.8, 1.0, 0.7, 1.0, 0.8, 0.5, 0.3];

export default function VoiceWaveform() {
  return (
    <div
      className="flex items-end justify-center gap-1 h-10"
      aria-hidden="true"
      role="presentation"
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-full bg-orange-400"
          animate={{
            scaleY: [HEIGHTS[i], HEIGHTS[i] * 2.5, HEIGHTS[i]],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.08,
            ease: 'easeInOut',
          }}
          style={{
            height: 28,
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </div>
  );
}
