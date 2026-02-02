'use client';

import { useState } from 'react';
import { TourParticipant } from '@/lib/partners';

interface AttendanceModalProps {
  participants: TourParticipant[];
  onSave: (attendance: Record<string, boolean>) => Promise<void>;
  onCancel: () => void;
}

export function AttendanceModal({ participants, onSave, onCancel }: AttendanceModalProps) {
  // Initialize all participants as attended (checked by default)
  const [attendance, setAttendance] = useState<Record<string, boolean>>(
    () => Object.fromEntries(participants.map(p => [p.user_id, true]))
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (userId: string) => {
    setAttendance(prev => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(attendance);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Mark Trip Completed
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Check the participants who attended. Uncheck anyone who didn't show up.
        </p>

        <div className="space-y-3 mb-6">
          {participants.map((participant) => (
            <label
              key={participant.user_id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                checked={attendance[participant.user_id] ?? true}
                onChange={() => handleToggle(participant.user_id)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div className="flex items-center gap-3 flex-1">
                {participant.avatar_url ? (
                  <img
                    src={participant.avatar_url}
                    alt={participant.display_name || 'Participant'}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">
                    {(participant.display_name || '?')[0].toUpperCase()}
                  </span>
                )}
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {participant.display_name || 'Anonymous'}
                  </div>
                  {participant.experience_level && (
                    <div className="text-xs text-gray-500">
                      {participant.experience_level}
                    </div>
                  )}
                </div>
                {attendance[participant.user_id] ? (
                  <span className="text-sm text-green-600 font-medium">Attended</span>
                ) : (
                  <span className="text-sm text-gray-500">No-show</span>
                )}
              </div>
            </label>
          ))}
        </div>

        {participants.length === 0 && (
          <p className="text-gray-500 text-sm italic text-center py-4">
            No accepted participants to mark attendance for.
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isSaving ? 'Saving...' : 'Mark Completed'}
          </button>
        </div>
      </div>
    </div>
  );
}
