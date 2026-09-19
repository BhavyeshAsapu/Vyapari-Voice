import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Store, Globe, Mic, Ruler, Bell, HelpCircle,
  ChevronRight, User, Shield, FileText, Star, LogOut
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { DEFAULT_SETTINGS } from '@/data/mockData';

interface SettingItemProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  badge?: string;
}

function SettingItem({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  onClick,
  badge,
}: SettingItemProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 text-left"
      aria-label={title}
    >
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-[--color-text]">{title}</p>
        {subtitle && <p className="text-xs text-[--color-text-secondary] mt-0.5">{subtitle}</p>}
      </div>
      {badge && (
        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
          {badge}
        </span>
      )}
      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
    </motion.button>
  );
}

type SheetKey = 'language' | 'voice' | 'units' | 'notifications' | null;

export default function MorePage() {
  const [openSheet, setOpenSheet] = useState<SheetKey>(null);
  const [lang, setLang] = useState(DEFAULT_SETTINGS.language);
  const [notif, setNotif] = useState(DEFAULT_SETTINGS.notificationsEnabled);

  const sheet = (key: SheetKey) => () => setOpenSheet(key);

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <PageHeader title="More" />

      <div className="page-container pt-4 space-y-3">
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <User size={28} className="text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg text-[--color-text]">{DEFAULT_SETTINGS.ownerName}</p>
            <p className="text-sm text-[--color-text-secondary]">{DEFAULT_SETTINGS.shopName}</p>
            <p className="text-xs text-orange-500 font-medium mt-0.5">Owner</p>
          </div>
          <button className="btn btn-secondary btn-sm" aria-label="Edit profile">
            Edit
          </button>
        </motion.div>

        {/* Settings Sections */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card p-4"
        >
          <h2 className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wider mb-2">
            Shop Settings
          </h2>
          <div className="divide-y divide-[--color-border]">
            <SettingItem
              icon={Store}
              iconBg="bg-orange-50"
              iconColor="text-orange-500"
              title="Shop Profile"
              subtitle={DEFAULT_SETTINGS.shopName}
              onClick={sheet(null)}
            />
            <SettingItem
              icon={Globe}
              iconBg="bg-blue-50"
              iconColor="text-blue-500"
              title="Language"
              subtitle={lang === 'en' ? 'English' : lang === 'te' ? 'తెలుగు' : 'हिन्दी'}
              onClick={sheet('language')}
            />
            <SettingItem
              icon={Ruler}
              iconBg="bg-purple-50"
              iconColor="text-purple-500"
              title="Units"
              subtitle={`Default: ${DEFAULT_SETTINGS.defaultUnit}`}
              onClick={sheet('units')}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4"
        >
          <h2 className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wider mb-2">
            Voice & Notifications
          </h2>
          <div className="divide-y divide-[--color-border]">
            <SettingItem
              icon={Mic}
              iconBg="bg-orange-50"
              iconColor="text-orange-500"
              title="Voice Settings"
              subtitle="Language, sensitivity"
              onClick={sheet('voice')}
            />
            <div className="flex items-center gap-3 py-3">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <Bell size={18} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-[--color-text]">Notifications</p>
                <p className="text-xs text-[--color-text-secondary]">Low stock, out of stock alerts</p>
              </div>
              <button
                role="switch"
                aria-checked={notif}
                onClick={() => setNotif((n) => !n)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  notif ? 'bg-orange-500' : 'bg-gray-200'
                }`}
                aria-label="Toggle notifications"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    notif ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card p-4"
        >
          <h2 className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wider mb-2">
            Support
          </h2>
          <div className="divide-y divide-[--color-border]">
            <SettingItem
              icon={HelpCircle}
              iconBg="bg-gray-50"
              iconColor="text-gray-500"
              title="Help & FAQ"
              subtitle="Common questions"
            />
            <SettingItem
              icon={Star}
              iconBg="bg-yellow-50"
              iconColor="text-yellow-500"
              title="Rate the App"
              subtitle="Tell us how we're doing"
              badge="New"
            />
            <SettingItem
              icon={Shield}
              iconBg="bg-gray-50"
              iconColor="text-gray-500"
              title="Privacy Policy"
            />
            <SettingItem
              icon={FileText}
              iconBg="bg-gray-50"
              iconColor="text-gray-500"
              title="Terms of Service"
            />
          </div>
        </motion.div>

        {/* App info */}
        <div className="text-center py-4 space-y-1">
          <p className="text-sm font-semibold text-[--color-text]">Vyapari Voice</p>
          <p className="text-xs text-[--color-text-secondary]">Version 1.0 — Milestone 1</p>
          <p className="text-xs text-[--color-text-secondary]">"Speak Naturally. Manage Your Shop Easily."</p>
        </div>

        {/* Language Sheet (mock modal) */}
        {openSheet === 'language' && (
          <div className="fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/30" onClick={() => setOpenSheet(null)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full bg-white rounded-t-2xl p-6 space-y-4"
            >
              <h2 className="font-bold text-xl text-[--color-text]">Choose Language</h2>
              {[
                { code: 'en', label: 'English', native: 'English' },
                { code: 'te', label: 'Telugu', native: 'తెలుగు' },
                { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code as typeof lang); setOpenSheet(null); }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 ${
                    lang === l.code ? 'border-orange-500 bg-orange-50' : 'border-[--color-border] bg-white'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{l.native}</p>
                    <p className="text-sm text-[--color-text-secondary]">{l.label}</p>
                  </div>
                  {lang === l.code && <span className="text-orange-500">✓</span>}
                </button>
              ))}
              <button onClick={() => setOpenSheet(null)} className="btn btn-secondary w-full">
                Close
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
