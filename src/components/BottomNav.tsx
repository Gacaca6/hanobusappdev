import React from 'react';
import { Home, Map as MapIcon, Bell, Heart, User } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../i18n/useTranslation';
import { TranslationKey } from '../i18n/translations';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const navItems: { id: string; icon: typeof Home; labelKey: TranslationKey }[] = [
    { id: '/', icon: Home, labelKey: 'home' },
    { id: '/routes', icon: MapIcon, labelKey: 'routes' },
    { id: '/alerts', icon: Bell, labelKey: 'alerts' },
    { id: '/favorites', icon: Heart, labelKey: 'favorites' },
    { id: '/profile', icon: User, labelKey: 'profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-50 flex items-center justify-around px-2 pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.id;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={clsx(
              "flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors",
              isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Icon className={clsx("h-6 w-6", isActive && "fill-blue-100")} />
            <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
