'use client';

import { useEffect, useState } from 'react';

export default function ResetPage() {
  const [status, setStatus] = useState('Clearing cached data...');
  const [cleared, setCleared] = useState<string[]>([]);

  useEffect(() => {
    const clearedItems: string[] = [];

    try {
      // Clear all localStorage
      const localStorageCount = localStorage.length;
      localStorage.clear();
      clearedItems.push(`localStorage (${localStorageCount} items)`);

      // Clear all sessionStorage
      const sessionStorageCount = sessionStorage.length;
      sessionStorage.clear();
      clearedItems.push(`sessionStorage (${sessionStorageCount} items)`);

      // Try to clear caches if available
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
          if (names.length > 0) {
            clearedItems.push(`caches (${names.length} caches)`);
          }
        });
      }

      setCleared(clearedItems);
      setStatus('All cached data cleared!');
    } catch (error) {
      console.error('Reset error:', error);
      setStatus('Error clearing data, but attempted cleanup.');
    }
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-2xl font-bold text-gray-900 mb-4">🔄 Reset Complete</div>
        <div className="text-lg text-gray-700 mb-4">{status}</div>

        {cleared.length > 0 && (
          <div className="text-sm text-gray-500 mb-6">
            <div className="mb-2">Cleared:</div>
            <ul className="space-y-1">
              {cleared.map((item, i) => (
                <li key={i}>✓ {item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <a
            href="/"
            className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Home
          </a>
          <a
            href="/login"
            className="block w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Go to Login
          </a>
        </div>

        <div className="mt-6 text-xs text-gray-400">
          Use this page if you get stuck on loading screens or have auth issues.
        </div>
      </div>
    </div>
  );
}
