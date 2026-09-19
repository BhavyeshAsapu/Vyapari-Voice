import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Mic, ArrowDownLeft, CheckCircle2, Globe } from 'lucide-react';
import type { Language } from '@/types';

const STEPS = 4;

const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
];

const FLOW_STEPS = [
  { icon: Mic, label: 'You speak', color: 'bg-orange-500' },
  { icon: Globe, label: 'Vyapari Voice understands', color: 'bg-blue-500' },
  { icon: CheckCircle2, label: 'You confirm', color: 'bg-purple-500' },
  { icon: ArrowDownLeft, label: 'Stock is updated', color: 'bg-green-500' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState<Language>('en');
  const [shopName, setShopName] = useState('');
  const [shopError, setShopError] = useState('');

  const next = () => {
    if (step === 2) {
      if (!shopName.trim()) {
        setShopError('Please enter your shop name');
        return;
      }
      setShopError('');
    }
    if (step < STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      navigate('/home');
    }
  };

  const skip = () => navigate('/home');

  return (
    <div className="min-h-screen bg-[--color-bg] flex flex-col">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-12 pb-4">
        {Array.from({ length: STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? 'w-6 bg-orange-500' : i < step ? 'w-3 bg-orange-300' : 'w-3 bg-gray-200'
            }`}
            aria-hidden
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 max-w-sm mx-auto w-full">
        <AnimatePresence mode="wait">
          {/* Step 0 — Welcome */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="w-full text-center"
            >
              <div className="w-24 h-24 rounded-3xl bg-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-200 animate-float">
                <Mic size={44} className="text-white" />
              </div>
              <h1 className="text-3xl font-extrabold text-[--color-text] mb-3 leading-tight">
                Vyapari Voice
              </h1>
              <p className="text-lg text-[--color-text-secondary] leading-relaxed mb-2">
                Manage your shop by simply talking.
              </p>
              <p className="text-sm text-[--color-text-secondary] italic">
                "Speak Naturally. Manage Your Shop Easily."
              </p>
            </motion.div>
          )}

          {/* Step 1 — Language */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="w-full"
            >
              <h2 className="text-2xl font-bold text-[--color-text] mb-2 text-center">
                Choose your language
              </h2>
              <p className="text-[--color-text-secondary] text-center mb-6">
                Vyapari Voice works in multiple languages
              </p>
              <div className="space-y-3">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      language === lang.code
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-[--color-border] bg-white hover:border-orange-200'
                    }`}
                    aria-pressed={language === lang.code}
                  >
                    <div>
                      <p className="font-semibold text-[--color-text]">{lang.native}</p>
                      <p className="text-sm text-[--color-text-secondary]">{lang.label}</p>
                    </div>
                    {language === lang.code && (
                      <CheckCircle2 size={22} className="text-orange-500" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2 — Shop Name */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="w-full"
            >
              <h2 className="text-2xl font-bold text-[--color-text] mb-2">
                Your shop name
              </h2>
              <p className="text-[--color-text-secondary] mb-6">
                We'll personalize your experience
              </p>
              <div className="space-y-3">
                <div>
                  <label htmlFor="shop-name" className="label">Shop Name</label>
                  <input
                    id="shop-name"
                    type="text"
                    placeholder="e.g. Sri Lakshmi Stores"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className={`input ${shopError ? 'border-red-400' : ''}`}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && next()}
                  />
                  {shopError && <p className="text-xs text-red-500 mt-1">{shopError}</p>}
                </div>
                <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                  <p className="text-xs text-orange-700">
                    💡 You can change this anytime in Settings
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Try first command */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="w-full"
            >
              <h2 className="text-2xl font-bold text-[--color-text] mb-2">
                How it works
              </h2>
              <p className="text-[--color-text-secondary] mb-6">
                Try saying: <span className="font-semibold text-orange-600">"Biyyam 5 bags vachayi"</span>
              </p>

              {/* Voice example */}
              <div className="bg-white rounded-2xl border border-[--color-border] p-4 mb-5 shadow-sm">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center shadow-md shadow-orange-200">
                    <Mic size={24} className="text-white" />
                  </div>
                </div>
                <p className="text-center font-semibold text-orange-600 italic mb-4">
                  "Biyyam 5 bags vachayi"
                </p>

                {/* Flow steps */}
                <div className="space-y-2">
                  {FLOW_STEPS.map((step, i) => {
                    const Icon = step.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.12 }}
                        className="flex items-center gap-3"
                      >
                        <div className={`w-8 h-8 rounded-lg ${step.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon size={16} className="text-white" />
                        </div>
                        <span className="text-sm font-medium text-[--color-text]">{step.label}</span>
                        {i < FLOW_STEPS.length - 1 && (
                          <div className="ml-3 mt-0.5 absolute" />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-center text-[--color-text-secondary]">
                Works in Telugu, Hindi, English & mixed
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="px-6 pb-10 max-w-sm mx-auto w-full space-y-3">
        <button
          onClick={next}
          className="btn btn-primary w-full text-base"
          id="onboarding-next-btn"
        >
          {step === STEPS - 1 ? 'Get Started' : 'Continue'}
          {step < STEPS - 1 && <ChevronRight size={18} />}
        </button>
        {step < STEPS - 1 && (
          <button
            onClick={skip}
            className="btn btn-ghost w-full text-sm"
            id="onboarding-skip-btn"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
