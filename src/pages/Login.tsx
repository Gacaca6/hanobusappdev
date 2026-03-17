import React from 'react';
import { signInWithPopup, signInWithRedirect, signInAnonymously, GoogleAuthProvider, getRedirectResult } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Bus } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/errorHandler';
import { useTranslation } from '../i18n/useTranslation';

export default function Login() {
  const { t } = useTranslation();
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        // If popup is blocked, fall back to redirect
        if (popupError?.code === 'auth/popup-blocked' || popupError?.code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupError;
      }
      const user = result.user;

      // Check if user exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        return;
      }

      if (!userSnap.exists()) {
        // Create new user profile
        try {
          await setDoc(userRef, {
            uid: user.uid,
            name: user.displayName || 'Commuter',
            email: user.email,
            createdAt: new Date(),
            role: 'commuter'
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
        }
      }
    } catch (error: any) {
      console.error('Error signing in with Google', error);
      if (error?.code === 'auth/unauthorized-domain') {
        alert('Google sign-in is not configured for this domain. Use "Continue as Guest" to test the app.');
      } else {
        alert('Failed to sign in. Please try again.');
      }
    }
  };

  const handleGuestSignIn = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Error signing in as guest', error);
      alert('Guest sign-in failed. Please enable Anonymous auth in Firebase Console.');
    }
  };

  return (
    <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-6 text-white">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center mb-12"
      >
        <div className="bg-white p-4 rounded-3xl shadow-xl mb-6">
          <Bus className="h-16 w-16 text-blue-600" />
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-2">HanoBus</h1>
        <p className="text-blue-100 text-lg text-center max-w-xs">
          {t('appTagline')}
        </p>
      </motion.div>

      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-sm"
      >
        <button
          onClick={handleGoogleSignIn}
          className="w-full bg-white text-gray-900 font-semibold py-4 px-6 rounded-2xl shadow-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-3 border-b-4 border-lime-400 active:border-b-0 active:translate-y-1"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
            <path fill="none" d="M1 1h22v22H1z" />
          </svg>
          {t('continueWithGoogle')}
        </button>

        <button
          onClick={handleGuestSignIn}
          className="w-full mt-4 bg-white/10 text-white font-semibold py-3 px-6 rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 border border-white/30"
        >
          {t('continueAsGuest')}
        </button>

        <p className="text-center text-blue-200 text-sm mt-8">
          {t('termsNotice')}
        </p>
      </motion.div>
    </div>
  );
}
