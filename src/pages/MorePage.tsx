import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Store, Globe, Mic, Ruler, Bell, HelpCircle,
  ChevronRight, User, Shield, FileText, Star, X, Save, CheckCircle2
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useSettings } from '@/hooks/useSettings';
import { getProfile, updateProfile } from '@/services/api';

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

type SheetKey = 'language' | 'voice' | 'units' | 'notifications' | 'editProfile' | null;

export default function MorePage() {
  const { settings, updateSettings } = useSettings();
  const [openSheet, setOpenSheet] = useState<SheetKey>(null);
  const [notif, setNotif] = useState(settings.notificationsEnabled);

  // Profile edit state
  const [profileForm, setProfileForm] = useState({
    ownerName: settings.ownerName || '',
    shopName: settings.shopName || '',
    phone: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Load persisted profile from backend on mount
  useEffect(() => {
    getProfile().then((p) => {
      setProfileForm({
        ownerName: p.ownerName || settings.ownerName || '',
        shopName: p.shopName || settings.shopName || '',
        phone: p.phone || '',
      });
      // Sync language from backend if available
      if (p.language && p.language !== settings.language) {
        updateSettings({ language: p.language as 'en' | 'te' | 'hi' });
      }
    }).catch(() => {
      // If backend not reachable, use local settings
    });
  }, []);

  const sheet = (key: SheetKey) => () => setOpenSheet(key);

  const handleLanguageSelect = (code: 'en' | 'te' | 'hi') => {
    updateSettings({ language: code });
    // Also persist language to backend profile
    updateProfile({ language: code }).catch(() => {});
    setOpenSheet(null);
  };

  const handleProfileSave = async () => {
    if (!profileForm.ownerName.trim() || !profileForm.shopName.trim()) {
      setProfileError('Owner name and shop name are required.');
      return;
    }
    setProfileSaving(true);
    setProfileError('');
    try {
      await updateProfile({
        ownerName: profileForm.ownerName.trim(),
        shopName: profileForm.shopName.trim(),
        phone: profileForm.phone.trim(),
      });
      // Sync to localStorage settings too
      updateSettings({
        ownerName: profileForm.ownerName.trim(),
        shopName: profileForm.shopName.trim(),
      });
      setProfileSaved(true);
      setTimeout(() => {
        setProfileSaved(false);
        setOpenSheet(null);
      }, 1200);
    } catch {
      setProfileError('Failed to save. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const langLabel = settings.language === 'te' ? 'తెలుగు' : settings.language === 'hi' ? 'हिन्दी' : 'English';

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
            <p className="font-bold text-lg text-[--color-text]">{profileForm.ownerName || settings.ownerName || 'Owner'}</p>
            <p className="text-sm text-[--color-text-secondary]">{profileForm.shopName || settings.shopName || 'My Shop'}</p>
            <p className="text-xs text-orange-500 font-medium mt-0.5">Owner</p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            aria-label="Edit profile"
            onClick={sheet('editProfile')}
          >
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
              subtitle={profileForm.shopName || settings.shopName}
              onClick={sheet('editProfile')}
            />
            <SettingItem
              icon={Globe}
              iconBg="bg-blue-50"
              iconColor="text-blue-500"
              title="Language"
              subtitle={langLabel}
              onClick={sheet('language')}
            />
            <SettingItem
              icon={Ruler}
              iconBg="bg-purple-50"
              iconColor="text-purple-500"
              title="Units"
              subtitle={`Default: ${settings.defaultUnit}`}
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
            Voice &amp; Notifications
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
              title="Help &amp; FAQ"
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
          <p className="text-xs text-[--color-text-secondary]">Version 2.0 — Milestone 2</p>
          <p className="text-xs text-[--color-text-secondary]">"Speak Naturally. Manage Your Shop Easily."</p>
        </div>

        {/* Language Sheet */}
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
                { code: 'en' as const, label: 'English', native: 'English' },
                { code: 'te' as const, label: 'Telugu', native: 'తెలుగు' },
                { code: 'hi' as const, label: 'Hindi', native: 'हिन्दी' },
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => handleLanguageSelect(l.code)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 ${
                    settings.language === l.code ? 'border-orange-500 bg-orange-50' : 'border-[--color-border] bg-white'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{l.native}</p>
                    <p className="text-sm text-[--color-text-secondary]">{l.label}</p>
                  </div>
                  {settings.language === l.code && <span className="text-orange-500">✓</span>}
                </button>
              ))}
              <button onClick={() => setOpenSheet(null)} className="btn btn-secondary w-full">
                Close
              </button>
            </motion.div>
          </div>
        )}

        {/* Edit Profile Sheet */}
        {openSheet === 'editProfile' && (
          <div className="fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/30" onClick={() => setOpenSheet(null)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full bg-white rounded-t-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-xl text-[--color-text]">Edit Profile</h2>
                <button onClick={() => setOpenSheet(null)} className="btn btn-ghost p-2" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              {profileSaved ? (
                <div className="flex flex-col items-center py-6 gap-3 text-green-600">
                  <CheckCircle2 size={36} />
                  <p className="font-bold text-lg">Profile saved!</p>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="profile-owner" className="label">Owner Name *</label>
                    <input
                      id="profile-owner"
                      type="text"
                      className="input"
                      placeholder="Your name"
                      value={profileForm.ownerName}
                      onChange={(e) => setProfileForm((f) => ({ ...f, ownerName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-shop" className="label">Shop Name *</label>
                    <input
                      id="profile-shop"
                      type="text"
                      className="input"
                      placeholder="e.g. Sri Lakshmi Stores"
                      value={profileForm.shopName}
                      onChange={(e) => setProfileForm((f) => ({ ...f, shopName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-phone" className="label">Phone Number (Optional)</label>
                    <input
                      id="profile-phone"
                      type="tel"
                      className="input"
                      placeholder="+91 99999 99999"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  {profileError && <p className="text-xs text-red-500">{profileError}</p>}
                  <button
                    onClick={handleProfileSave}
                    disabled={profileSaving}
                    className="btn btn-primary w-full disabled:opacity-40"
                    id="save-profile-btn"
                  >
                    {profileSaving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <><Save size={16} /> Save Profile</>
                    )}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
