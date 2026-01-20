'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LogoutPage() {
  const [status, setStatus] = useState('Logging out...');

  useEffect(() => {
    async function logout() {
      try {
        // Sign out from Supabase
        if (supabase) {
          await supabase.auth.signOut();
        }

        // Clear all Supabase-related localStorage
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('sb-'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Clear session storage too
        const sessionKeysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('sb-'))) {
            sessionKeysToRemove.push(key);
          }
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

        setStatus('Logged out successfully! Redirecting...');

        // Redirect to home after a brief pause
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } catch (error) {
        console.error('Logout error:', error);
        setStatus('Error during logout. Clearing local data and redirecting...');

        // Force clear even on error
        localStorage.clear();
        sessionStorage.clear();

        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      }
    }

    logout();
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg font-medium text-gray-900 mb-2">{status}</div>
        <div className="text-sm text-gray-500">
          If you&apos;re not redirected, <a href="/" className="text-blue-600 underline">click here</a>
        </div>
      </div>
    </div>
  );
}
