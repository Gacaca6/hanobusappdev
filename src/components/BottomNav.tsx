import React from 'react';
import { Home, Map as MapIcon, Bell, Heart, User } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: '/', icon: Home, label: 'Home' },
    { id: '/routes', icon: MapIcon, label: 'Routes' },
    { id: '/alerts', icon: Bell, label: 'Alerts' },
    { id: '/favorites', icon: Heart, label: 'Favorites' },
    { id: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-20 flex items-center justify-around px-2 pb-safe">
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
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
