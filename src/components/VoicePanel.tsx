/**
 * VoicePanel — real AI-powered voice inventory panel.
 *
 * Pipeline:
 *   TAP MIC → Web Speech API listens
 *   STOP → transcript sent to POST /api/voice/parse (AI + DB search)
 *   CONFIRMATION → user reviews parsed action with real product/quantity
 *   CONFIRM → POST /api/voice/confirm (DB write)
 *   SUCCESS → stock updated, callback fired
 *
 * Extra states:
 *   clarification — AI needs more info (missing qty, ambiguous product)
 *   new_product   — product not found, propose creation
 *   ambiguous     — multiple matching products, user picks one
 *
 * Milestone 1 visual design is preserved. Only the data is real.
 */
import { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2, X, Edit3, RotateCcw, AlertCircle,
  ArrowDownLeft, ArrowUpRight, HelpCircle, PackagePlus,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { VoiceParseResponse } from '@/types';
import VoiceButton from './VoiceButton';
import VoiceWaveform from './VoiceWaveform';
import { parseVoiceCommand, confirmVoiceAction } from '@/services/api';
import { speechService } from '@/services/speech';
import { VOICE_SUGGESTIONS } from '@/data/mockData';
import { useSettings } from '@/hooks/useSettings';

type PanelState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'transcript'
  | 'confirmation'
  | 'clarification'
  | 'new_product'
  | 'ambiguous'
  | 'success'
  | 'error';

interface VoicePanelProps {
  onStockUpdated?: () => void;
  compact?: boolean;
}

export default function VoicePanel({ onStockUpdated, compact = false }: VoicePanelProps) {
  const { settings } = useSettings();
  const [panelState, setPanelState] = useState<PanelState>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [parseResult, setParseResult] = useState<VoiceParseResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const sessionIdRef = useRef(uuidv4());

  // ── Reset ─────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setPanelState('idle');
    setLiveTranscript('');
    setFinalTranscript('');
    setParseResult(null);
    setErrorMessage('');
    setSuccessMessage('');
    sessionIdRef.current = uuidv4(); // New session for next command
  }, []);

  // ── Run processing (transcript → AI → confirm UI) ─────────────────────────

  const runProcessing = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      setPanelState('error');
      setErrorMessage('No speech detected. Please try again.');
      return;
    }

    setFinalTranscript(transcript);
    setPanelState('processing');

    try {
      const result = await parseVoiceCommand(
        transcript,
        sessionIdRef.current,
        settings.voiceLanguage,
      );
      setParseResult(result);

      // Determine next panel state based on backend response
      const action = result.proposedAction;

      if (!result.requiresConfirmation && action.type === 'QUERY') {
        // Read-only query — show answer in clarification pane (reuse it)
        setPanelState('clarification');
        return;
      }

      if (action.type === 'CLARIFICATION') {
        setPanelState('clarification');
        return;
      }

      if (result.productMatch.status === 'AMBIGUOUS') {
        setPanelState('ambiguous');
        return;
      }

      if (action.type === 'CREATE_PRODUCT') {
        setPanelState('new_product');
        return;
      }

      if (action.type === 'UNDO') {
        setPanelState('confirmation');
        return;
      }

      // Standard STOCK_IN / STOCK_OUT
      setPanelState('transcript');
      setTimeout(() => setPanelState('confirmation'), 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to understand. Please try again.';
      setPanelState('error');
      setErrorMessage(msg);
    }
  }, [settings.voiceLanguage]);

  // ── Mic click handler ─────────────────────────────────────────────────────

  const handleMicClick = useCallback(() => {
    if (panelState === 'listening') {
      speechService.stop();
      return;
    }

    if (panelState !== 'idle' && panelState !== 'error') return;

    setPanelState('listening');
    setLiveTranscript('');
    setErrorMessage('');
    setParseResult(null);

    if (!speechService.isSupported()) {
      // Fallback to mock for browsers without Web Speech API
      setPanelState('processing');
      import('@/data/mockData').then(({ DEMO_TRANSCRIPT }) => {
        void runProcessing(DEMO_TRANSCRIPT.rawText);
      });
      return;
    }

    const langCode = settings.voiceLanguage === 'te' ? 'te-IN'
      : settings.voiceLanguage === 'hi' ? 'hi-IN'
      : 'en-IN';

    speechService.start(
      langCode,
      (result) => {
        setLiveTranscript(result.transcript);
        if (result.isFinal) {
          setPanelState((cur) => {
            if (cur === 'listening') void runProcessing(result.transcript);
            return cur;
          });
        }
      },
      (err) => {
        if (!err) return; // Silent abort
        setPanelState('error');
        setErrorMessage(err);
      },
      undefined,
      () => {
        // onEnd — if still listening (no final result), use last interim
        setPanelState((cur) => {
          if (cur === 'listening' && liveTranscript) {
            void runProcessing(liveTranscript);
          }
          return cur === 'listening' ? 'processing' : cur;
        });
      },
    );
  }, [panelState, runProcessing, settings.voiceLanguage, liveTranscript]);

  // ── Confirm ───────────────────────────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    if (!parseResult) return;
    setPanelState('processing');
    try {
      const res = await confirmVoiceAction(sessionIdRef.current);
      if (res.success) {
        setSuccessMessage(res.message);
        setPanelState('success');
        onStockUpdated?.();
        setTimeout(reset, 3000);
      } else {
        setPanelState('error');
        setErrorMessage(res.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update stock.';
      setPanelState('error');
      setErrorMessage(msg);
    }
  }, [parseResult, onStockUpdated, reset]);

  // ── Voice correction handler ──────────────────────────────────────────────

  const handleVoiceCorrection = useCallback(() => {
    // Re-enter listening with existing sessionId so backend gets correction context
    setPanelState('idle');
    setTimeout(handleMicClick, 100);
  }, [handleMicClick]);

  // ── Select from ambiguous candidates ─────────────────────────────────────

  const handleSelectCandidate = useCallback(async (candidateId: string, candidateName: string) => {
    if (!parseResult) return;
    // Re-run parse with the specific product name selected
    await runProcessing(`${candidateName} ${parseResult.interpretation.quantity ?? ''} ${parseResult.interpretation.unit ?? ''}`);
  }, [parseResult, runProcessing]);

  // ── Render helpers ────────────────────────────────────────────────────────

  const action = parseResult?.proposedAction;
  const isIn = action?.type === 'STOCK_IN';
  const isQuery = action?.type === 'QUERY';
  const isUndo = action?.type === 'UNDO';

  return (
    <div className={`card-elevated p-6 ${compact ? '' : 'mx-0'}`}>
      <AnimatePresence mode="wait">

        {/* ── Idle / Listening / Processing ─────────────────────────────── */}
        {(panelState === 'idle' || panelState === 'listening' || panelState === 'processing') && (
          <motion.div
            key="mic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center"
          >
            <div className="relative mb-4">
              <VoiceButton
                state={panelState === 'listening' ? 'listening' : panelState === 'processing' ? 'processing' : 'idle'}
                onClick={handleMicClick}
                size="lg"
              />
            </div>

            {panelState === 'idle' && (
              <>
                <p className="font-bold text-lg text-[--color-text]">TAP TO SPEAK</p>
                <p className="text-sm text-[--color-text-secondary] mt-1">Tell me what happened...</p>
              </>
            )}
            {panelState === 'listening' && (
              <>
                <VoiceWaveform />
                <p className="font-semibold text-orange-500 mt-2">Listening...</p>
                {liveTranscript && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-[--color-text-secondary] mt-1 italic max-w-xs"
                  >
                    "{liveTranscript}"
                  </motion.p>
                )}
                <p className="text-xs text-[--color-text-secondary] mt-1">Tap mic to stop</p>
              </>
            )}
            {panelState === 'processing' && (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-orange-300 border-t-orange-500 rounded-full mb-2"
                />
                <p className="font-semibold text-[--color-text-secondary]">Understanding you...</p>
                {finalTranscript && (
                  <p className="text-xs text-[--color-text-secondary] mt-1 italic">"{finalTranscript}"</p>
                )}
              </>
            )}

            {panelState === 'idle' && !compact && (
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

        {/* ── Transcript (showing what was heard, parsing…) ─────────────── */}
        {panelState === 'transcript' && finalTranscript && (
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
              <p className="font-medium text-[--color-text] italic">"{finalTranscript}"</p>
            </div>
            <div className="text-center py-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-orange-300 border-t-orange-500 rounded-full mx-auto"
              />
              <p className="text-xs text-[--color-text-secondary] mt-1">Analysing...</p>
            </div>
          </motion.div>
        )}

        {/* ── Clarification / Query Answer ──────────────────────────────── */}
        {panelState === 'clarification' && parseResult && (
          <motion.div
            key="clarification"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-4 border border-blue-100">
              <HelpCircle size={20} className="text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                  {isQuery ? 'Answer' : 'Need clarification'}
                </p>
                <p className="text-[--color-text] font-medium">
                  {parseResult.queryAnswer}
                </p>
                {!isQuery && parseResult.interpretation.clarificationQuestion && (
                  <p className="text-sm text-[--color-text-secondary] mt-1">
                    {parseResult.interpretation.clarificationQuestion}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {!isQuery && (
                <button onClick={handleMicClick} className="btn btn-primary btn-sm flex-1">
                  Speak Again
                </button>
              )}
              <button onClick={reset} className={`btn btn-ghost btn-sm ${isQuery ? 'flex-1' : ''}`}>
                <X size={14} /> {isQuery ? 'Close' : 'Cancel'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Ambiguous product — user picks one ───────────────────────── */}
        {panelState === 'ambiguous' && parseResult && (
          <motion.div
            key="ambiguous"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="text-center">
              <p className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wider">
                Which product?
              </p>
              <p className="text-sm text-[--color-text-secondary] mt-1">
                "{parseResult.interpretation.productName}" matches multiple products
              </p>
            </div>
            <div className="space-y-2">
              {parseResult.productMatch.candidates?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => void handleSelectCandidate(c.id, c.name)}
                  className="w-full text-left p-3 rounded-xl border border-[--color-border] hover:border-orange-400 hover:bg-orange-50 transition-colors"
                >
                  <p className="font-semibold text-[--color-text]">{c.name}</p>
                  <p className="text-xs text-[--color-text-secondary]">
                    {c.brand} · {c.currentStock} {c.unit}
                  </p>
                </button>
              ))}
            </div>
            <button onClick={reset} className="btn btn-ghost btn-sm w-full">
              <X size={14} /> Cancel
            </button>
          </motion.div>
        )}

        {/* ── New Product Proposal ──────────────────────────────────────── */}
        {panelState === 'new_product' && parseResult && (
          <motion.div
            key="new_product"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <PackagePlus size={18} className="text-orange-500" />
              <p className="font-semibold text-[--color-text]">New product found</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 space-y-2">
              <div className="flex justify-between">
                <p className="text-sm text-[--color-text-secondary]">Product</p>
                <p className="font-semibold text-[--color-text]">
                  {parseResult.proposedAction.productName}
                </p>
              </div>
              {parseResult.interpretation.brand && (
                <div className="flex justify-between">
                  <p className="text-sm text-[--color-text-secondary]">Brand</p>
                  <p className="font-medium text-[--color-text]">{parseResult.interpretation.brand}</p>
                </div>
              )}
              <div className="flex justify-between">
                <p className="text-sm text-[--color-text-secondary]">Initial Stock</p>
                <p className="font-medium text-green-600">
                  +{parseResult.proposedAction.change} {parseResult.proposedAction.unit}
                </p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm text-[--color-text-secondary]">Category</p>
                <p className="font-medium text-[--color-text]">
                  {parseResult.interpretation.category || 'Other'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={reset} className="btn btn-ghost btn-sm">
                <X size={14} /> Cancel
              </button>
              <button onClick={handleConfirm} className="btn btn-primary btn-sm">
                <PackagePlus size={14} /> Create & Add
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Confirmation ──────────────────────────────────────────────── */}
        {panelState === 'confirmation' && parseResult && action && (
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
                "{finalTranscript}"
              </p>
            </div>

            {isUndo ? (
              // Undo confirmation
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 space-y-2">
                <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wider">Undo last transaction</p>
                <p className="font-bold text-[--color-text]">{action.productName}</p>
                <p className="text-sm text-[--color-text-secondary]">
                  {action.change} {action.unit} will be reversed
                </p>
              </div>
            ) : (
              // Stock In/Out confirmation
              <div className="bg-[--color-bg] rounded-xl p-4 border border-[--color-border]">
                <p className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wider mb-3">
                  I understood:
                </p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isIn ? 'bg-green-100' : 'bg-red-50'}`}>
                    {isIn
                      ? <ArrowDownLeft size={20} className="text-green-600" />
                      : <ArrowUpRight size={20} className="text-red-500" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[--color-text] text-lg">{action.productName}</p>
                    <p className={`font-semibold text-base ${isIn ? 'text-green-600' : 'text-red-500'}`}>
                      {isIn ? '+' : '-'}{action.change} {action.unit}
                    </p>
                  </div>
                </div>
                {/* Stock before/after */}
                {action.currentQuantity !== undefined && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-[--color-text-secondary]">Current</p>
                      <p className="font-bold text-[--color-text]">{action.currentQuantity} {action.unit}</p>
                    </div>
                    <div className={`rounded-lg p-2 ${isIn ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className="text-[--color-text-secondary]">After</p>
                      <p className={`font-bold ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                        {action.resultQuantity} {action.unit}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button onClick={reset} className="btn btn-ghost btn-sm col-span-1" aria-label="Cancel">
                <X size={14} /> Cancel
              </button>
              <button onClick={handleVoiceCorrection} className="btn btn-secondary btn-sm col-span-1" aria-label="Correct">
                <Edit3 size={14} /> Edit
              </button>
              <button onClick={handleConfirm} className="btn btn-primary btn-sm col-span-1" aria-label="Confirm">
                <CheckCircle2 size={14} /> Confirm
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Success ───────────────────────────────────────────────────── */}
        {panelState === 'success' && (
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
            <p className="font-semibold text-[--color-text-secondary] mt-1 text-sm max-w-xs">
              {successMessage}
            </p>
          </motion.div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {panelState === 'error' && (
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
            <p className="font-bold text-[--color-text]">Couldn't process</p>
            <p className="text-sm text-[--color-text-secondary] mt-1 max-w-xs">
              {errorMessage || 'Please mention the product and quantity.'}
            </p>
            <button onClick={reset} className="btn btn-secondary btn-sm mt-4" aria-label="Try again">
              <RotateCcw size={14} />
              Try Again
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
