import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import type { VoiceState } from '@/types';
import { cn } from '@/utils';

interface VoiceButtonProps {
  state: VoiceState;
  onClick: () => void;
  size?: 'md' | 'lg';
  className?: string;
}

export default function VoiceButton({ state, onClick, size = 'lg', className }: VoiceButtonProps) {
  const isListening = state === 'listening';
  const isProcessing = state === 'processing';
  const isActive = isListening || isProcessing;

  const sizeClasses = size === 'lg'
    ? 'w-20 h-20 text-3xl'
    : 'w-14 h-14 text-xl';

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      disabled={isProcessing}
      aria-label={
        isListening
          ? 'Stop listening'
          : isProcessing
          ? 'Processing your voice'
          : 'Tap to speak'
      }
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        `relative flex items-center justify-center rounded-full transition-colors duration-200 cursor-pointer border-0 outline-none`,
        isActive ? 'bg-orange-500' : 'bg-orange-500 hover:bg-orange-600',
        isProcessing && 'opacity-80 cursor-not-allowed',
        sizeClasses,
        className
      )}
      style={{
        boxShadow: isActive
          ? '0 0 0 0 rgba(249,115,22,0.4)'
          : '0 4px 20px rgba(249,115,22,0.4)',
      }}
    >
      {/* Pulse rings when listening */}
      <AnimatePresence>
        {isListening && (
          <>
            {[1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full bg-orange-400"
                initial={{ opacity: 0.6, scale: 1 }}
                animate={{ opacity: 0, scale: 1.6 + i * 0.3 }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeOut',
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Processing spinner */}
      {isProcessing && (
        <motion.span
          className="absolute inset-0 rounded-full border-4 border-white/30 border-t-white"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Icon */}
      <span className="relative z-10 text-white">
        {isActive ? (
          <Mic size={size === 'lg' ? 32 : 22} />
        ) : (
          <MicOff size={size === 'lg' ? 32 : 22} className="hidden" />
        )}
        {!isActive && <Mic size={size === 'lg' ? 32 : 22} />}
      </span>
    </motion.button>
  );
}
