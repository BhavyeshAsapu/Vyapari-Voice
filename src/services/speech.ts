/**
 * SpeechRecognitionService — modular Web Speech API wrapper.
 *
 * Supports:
 *   - English (en-IN / en-US)
 *   - Telugu (te-IN)
 *   - Hindi (hi-IN)
 *   - Mixed-language transcription (browser best-effort)
 *
 * Provider can be swapped later (e.g. Google Cloud STT, Whisper) by
 * replacing this service while keeping the same interface.
 */

export interface SpeechResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  detectedLanguage?: string;
}

export type SpeechResultCallback = (result: SpeechResult) => void;
export type SpeechErrorCallback = (error: string) => void;
export type SpeechStartCallback = () => void;
export type SpeechEndCallback = () => void;

// Language code mapping for Web Speech API
export const SPEECH_LANGUAGE_CODES: Record<string, string> = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN',
};

// SpeechRecognition types (not in lib.dom.d.ts for all TS versions)
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onnomatch: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private _isListening = false;
  private _lastInterimTranscript = '';

  /** True if Web Speech API is supported by the current browser. */
  isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  get isListening(): boolean {
    return this._isListening;
  }

  /**
   * Start speech recognition.
   *
   * @param language - BCP-47 language code (e.g. 'te-IN', 'hi-IN', 'en-IN')
   *                   or our short code ('te', 'hi', 'en')
   * @param onResult  - called with each speech result (interim and final)
   * @param onError   - called on error
   * @param onStart   - called when mic is actually open
   * @param onEnd     - called when recognition ends (user stop or auto-stop)
   */
  start(
    language: string,
    onResult: SpeechResultCallback,
    onError: SpeechErrorCallback,
    onStart?: SpeechStartCallback,
    onEnd?: SpeechEndCallback,
  ): void {
    if (!this.isSupported()) {
      onError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (this._isListening) {
      this.stop();
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionAPI();

    // Resolve short codes to BCP-47
    const langCode =
      SPEECH_LANGUAGE_CODES[language] ?? (language.includes('-') ? language : 'en-IN');

    this.recognition.lang = langCode;
    this.recognition.continuous = false;        // Single utterance per tap
    this.recognition.interimResults = true;     // Show live transcript
    this.recognition.maxAlternatives = 1;

    this._lastInterimTranscript = '';

    this.recognition.onstart = () => {
      this._isListening = true;
      onStart?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          finalTranscript += text;
          onResult({
            transcript: finalTranscript.trim(),
            confidence: confidence ?? 0.9,
            isFinal: true,
          });
        } else {
          interimTranscript += text;
          this._lastInterimTranscript = interimTranscript;
          onResult({
            transcript: interimTranscript.trim(),
            confidence: 0.5,
            isFinal: false,
          });
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this._isListening = false;
      const msg = _friendlyError(event.error);
      onError(msg);
    };

    this.recognition.onend = () => {
      this._isListening = false;
      // If we have an interim result but no final, return it as best-effort
      if (this._lastInterimTranscript) {
        onResult({
          transcript: this._lastInterimTranscript.trim(),
          confidence: 0.7,
          isFinal: true,
        });
        this._lastInterimTranscript = '';
      }
      onEnd?.();
    };

    this.recognition.onnomatch = () => {
      this._isListening = false;
      onError('Could not recognize speech. Please speak more clearly.');
    };

    try {
      this.recognition.start();
    } catch (e) {
      onError('Failed to start microphone. Please check permissions.');
    }
  }

  /** Stop recognition gracefully (triggers onend after processing). */
  stop(): void {
    if (this.recognition && this._isListening) {
      this.recognition.stop();
    }
  }

  /** Abort immediately without triggering final result. */
  abort(): void {
    if (this.recognition) {
      this.recognition.abort();
      this._isListening = false;
    }
  }
}

function _friendlyError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'permission-denied':
      return 'Microphone permission denied. Please allow microphone access in your browser.';
    case 'no-speech':
      return 'No speech detected. Please try again.';
    case 'audio-capture':
      return 'No microphone found. Please connect a microphone.';
    case 'network':
      return 'Network error. Speech recognition requires internet connection.';
    case 'aborted':
      return ''; // User-initiated — silent
    default:
      return `Speech recognition error: ${code}. Please try again.`;
  }
}

// Singleton export
export const speechService = new SpeechRecognitionService();
