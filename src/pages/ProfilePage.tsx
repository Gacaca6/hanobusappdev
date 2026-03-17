import React from 'react';
import { User, Settings, LogOut, ChevronRight, CreditCard, HelpCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function ProfilePage() {
  const { user } = useStore();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="bg-blue-600 px-6 pt-12 pb-8 text-white shadow-md">
        <h1 className="text-2xl font-bold mb-6">Profile</h1>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/50">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="h-8 w-8 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">{user?.displayName || 'Commuter'}</h2>
            <p className="text-blue-100 text-sm">{user?.email}</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto pb-24">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <span className="font-medium text-gray-900">Payment Methods</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Settings className="h-5 w-5 text-gray-600" />
              </div>
              <span className="font-medium text-gray-900">Settings</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
          <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-gray-600" />
              </div>
              <span className="font-medium text-gray-900">Help & Support</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        <button 
          onClick={handleSignOut}
          className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center gap-2 text-red-600 font-semibold hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
