import React, { useState, useEffect } from 'react';
import { User, Settings, LogOut, ChevronRight, CreditCard, HelpCircle, Globe, Bell, Shield } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from '../i18n/useTranslation';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { requestNotificationPermission, getNotificationPermission } from '../services/notificationService';

export default function ProfilePage() {
  const { user, language, setLanguage } = useStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission());
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    const checkAdmin = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
          return;
        }
      } catch {}
      const adminEmails = ['gacacagodwin@gmail.com', 'mikelgodwin1234@gmail.com'];
      if (user.email && adminEmails.includes(user.email)) {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotifPermission(permission);
  };

  const [toast, setToast] = useState(false);

  const showComingSoon = () => {
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'rw' : 'en');
  };

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      <div className="bg-blue-600 px-6 pt-12 pb-8 text-white shadow-md">
        <h1 className="text-2xl font-bold mb-6">{t('profileTitle')}</h1>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/50">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="h-8 w-8 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user?.displayName || t('commuter')}</h2>
            <p className="text-blue-100 text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto pb-4">
        {/* Language Toggle */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <button
            onClick={toggleLanguage}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-50 rounded-full flex items-center justify-center">
                <Globe className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-left">
                <span className="font-medium text-gray-900">{t('language')}</span>
                <p className="text-xs text-gray-500">{language === 'en' ? 'English' : 'Ikinyarwanda'}</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full uppercase">{language}</span>
          </button>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <button
            onClick={handleEnableNotifications}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-orange-50 rounded-full flex items-center justify-center">
                <Bell className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-left">
                <span className="font-medium text-gray-900">{t('notifications')}</span>
                <p className="text-xs text-gray-500">
                  {notifPermission === 'granted' ? t('notificationsEnabled') : notifPermission === 'denied' ? t('notificationPermissionDenied') : t('enableNotifications')}
                </p>
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${notifPermission === 'granted' ? 'bg-green-500' : 'bg-gray-300'}`} />
          </button>
        </div>

        {/* Main Menu */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <button onClick={showComingSoon} className="w-full p-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <span className="font-medium text-gray-900">{t('paymentMethods')}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
          <button onClick={showComingSoon} className="w-full p-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Settings className="h-5 w-5 text-gray-600" />
              </div>
              <span className="font-medium text-gray-900">{t('settings')}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
          <button onClick={showComingSoon} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-gray-600" />
              </div>
              <span className="font-medium text-gray-900">{t('helpSupport')}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Coming Soon Toast */}
        {toast && (
          <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium animate-bounce">
            {t('comingSoon')}
          </div>
        )}

        {/* Admin Panel */}
        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full bg-gray-900 p-4 rounded-2xl shadow-sm flex items-center justify-between mb-4 hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-yellow-400/20 rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 text-yellow-400" />
              </div>
              <span className="font-medium text-white">{t('adminPanel')}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
        )}

        <button
          onClick={handleSignOut}
          className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center gap-2 text-red-600 font-semibold hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          {t('signOut')}
        </button>
      </div>
    </div>
  );
}
