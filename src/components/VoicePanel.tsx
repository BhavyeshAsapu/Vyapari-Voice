import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, X, Edit3, RotateCcw, AlertCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { VoiceState, VoiceTranscriptResult } from '@/types';
import VoiceButton from './VoiceButton';
import VoiceWaveform from './VoiceWaveform';
import { parseVoiceCommand, createTransaction } from '@/services/api';
import { PRODUCTS } from '@/data/mockData';
import { VOICE_SUGGESTIONS } from '@/data/mockData';

interface VoicePanelProps {
  onStockUpdated?: () => void;
  compact?: boolean;
}

export default function VoicePanel({ onStockUpdated, compact = false }: VoicePanelProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<VoiceTranscriptResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ name: string; qty: number; unit: string; type: string } | null>(null);

  const runProcessing = useCallback(async () => {
    setVoiceState('processing');
    try {
      const result = await parseVoiceCommand();
      setTranscript(result);
      setVoiceState('transcript');
      setTimeout(() => setVoiceState('confirmation'), 1200);
    } catch {
      setVoiceState('error');
      setErrorMessage('Could not understand. Please try again.');
    }
  }, []);

  const handleMicClick = useCallback(async () => {
    if (voiceState === 'listening') {
      // User manually stopped — process immediately
      void runProcessing();
      return;
    }

    if (voiceState === 'idle' || voiceState === 'error') {
      setVoiceState('listening');
      setTranscript(null);
      setErrorMessage('');
      setSuccessInfo(null);

      // Auto-stop after 3 seconds for demo
      setTimeout(() => {
        setVoiceState((current) => {
          if (current !== 'listening') return current;
          void runProcessing();
          return 'processing';
        });
      }, 3000);
    }
  }, [voiceState, runProcessing]);

  const handleConfirm = async () => {
    if (!transcript) return;
    const product = PRODUCTS.find((p) =>
      p.name.toLowerCase().includes(transcript.productName.toLowerCase())
    );
    if (!product) return;
    try {
      await createTransaction({
        productId: product.id,
        productName: product.name,
        quantity: transcript.quantity,
        unit: transcript.unit,
        type: transcript.transactionType,
        source: 'voice',
        note: transcript.rawText,
      });
      setSuccessInfo({
        name: product.name,
        qty: transcript.quantity,
        unit: transcript.unit,
        type: transcript.transactionType,
      });
      setVoiceState('success');
      onStockUpdated?.();
      setTimeout(() => {
        setVoiceState('idle');
        setTranscript(null);
        setSuccessInfo(null);
      }, 3000);
    } catch {
      setVoiceState('error');
      setErrorMessage('Failed to update stock. Please try again.');
    }
  };

  const handleCancel = () => {
    setVoiceState('idle');
    setTranscript(null);
    setErrorMessage('');
  };

  const handleRetry = () => {
    setVoiceState('idle');
    setErrorMessage('');
  };

  const isIn = transcript?.transactionType === 'stock_in';

  return (
    <div className={`card-elevated p-6 ${compact ? '' : 'mx-0'}`}>
      {/* Idle / Listening / Processing */}
      <AnimatePresence mode="wait">
        {(voiceState === 'idle' || voiceState === 'listening' || voiceState === 'processing') && (
          <motion.div
            key="mic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center"
          >
            {/* Mic button */}
            <div className="relative mb-4">
              <VoiceButton state={voiceState} onClick={handleMicClick} size="lg" />
            </div>

            {/* State text */}
            {voiceState === 'idle' && (
              <>
                <p className="font-bold text-lg text-[--color-text]">TAP TO SPEAK</p>
                <p className="text-sm text-[--color-text-secondary] mt-1">Tell me what happened...</p>
              </>
            )}
            {voiceState === 'listening' && (
              <>
                <VoiceWaveform />
                <p className="font-semibold text-orange-500 mt-2">Listening...</p>
                <p className="text-xs text-[--color-text-secondary] mt-1">Tap mic to stop</p>
              </>
            )}
            {voiceState === 'processing' && (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-orange-300 border-t-orange-500 rounded-full mb-2"
                />
                <p className="font-semibold text-[--color-text-secondary]">Understanding you...</p>
              </>
            )}

            {/* Suggestion chips */}
            {voiceState === 'idle' && !compact && (
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {VOICE_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={handleMicClick}
                    className="chip text-sm"
                    aria-label={`Say: ${s}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Transcript */}
        {voiceState === 'transcript' && transcript && (
          <motion.div
            key="transcript"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wider">
              You said:
            </p>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="font-medium text-[--color-text] italic">"{transcript.rawText}"</p>
            </div>
            <div className="text-center py-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-orange-300 border-t-orange-500 rounded-full mx-auto"
              />
              <p className="text-xs text-[--color-text-secondary] mt-1">Parsing...</p>
            </div>
          </motion.div>
        )}

        {/* Confirmation */}
        {voiceState === 'confirmation' && transcript && (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="text-center">
              <span className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wider">
                You said:
              </span>
              <p className="font-medium text-[--color-text] italic text-sm mt-1">
                "{transcript.rawText}"
              </p>
            </div>

            <div className="bg-[--color-bg] rounded-xl p-4 border border-[--color-border]">
              <p className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wider mb-3">
                I understood:
              </p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isIn ? 'bg-green-100' : 'bg-red-50'}`}>
                  {isIn ? (
                    <ArrowDownLeft size={20} className="text-green-600" />
                  ) : (
                    <ArrowUpRight size={20} className="text-red-500" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-[--color-text] text-lg">{transcript.productName}</p>
                  <p className={`font-semibold text-base ${isIn ? 'text-green-600' : 'text-red-500'}`}>
                    {isIn ? '+' : '-'}{transcript.quantity} {transcript.unit}
                  </p>
                  <p className="text-xs text-[--color-text-secondary]">
                    {isIn ? 'Stock In' : 'Stock Out'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleCancel}
                className="btn btn-ghost btn-sm col-span-1"
                aria-label="Cancel transaction"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={handleCancel}
                className="btn btn-secondary btn-sm col-span-1"
                aria-label="Edit transaction"
              >
                <Edit3 size={14} />
                Edit
              </button>
              <button
                onClick={handleConfirm}
                className="btn btn-primary btn-sm col-span-1"
                aria-label="Confirm transaction"
              >
                <CheckCircle2 size={14} />
                Confirm
              </button>
            </div>
          </motion.div>
        )}

        {/* Success */}
        {voiceState === 'success' && successInfo && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center py-2"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-3"
            >
              <CheckCircle2 size={32} className="text-green-600" />
            </motion.div>
            <p className="font-bold text-lg text-[--color-text]">Stock Updated!</p>
            <p className="font-semibold text-[--color-text-secondary] mt-1">
              {successInfo.name} {successInfo.type === 'stock_in' ? '+' : '-'}{successInfo.qty} {successInfo.unit}
            </p>
          </motion.div>
        )}

        {/* Error */}
        {voiceState === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center py-2"
          >
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <p className="font-bold text-[--color-text]">Couldn't understand</p>
            <p className="text-sm text-[--color-text-secondary] mt-1">{errorMessage || "Please mention the product and quantity."}</p>
            <button
              onClick={handleRetry}
              className="btn btn-secondary btn-sm mt-4"
              aria-label="Try again"
            >
              <RotateCcw size={14} />
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
