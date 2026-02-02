'use client';

import { useState } from 'react';
import { ActivityType, TripReport } from '@/lib/partners';

interface TripReportFormProps {
  activity: ActivityType;
  existingReport?: TripReport | null;
  onSave: (report: TripReport) => Promise<void>;
  onCancel: () => void;
}

export function TripReportForm({ activity, existingReport, onSave, onCancel }: TripReportFormProps) {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(existingReport?.overall_rating || 3);
  const [summary, setSummary] = useState(existingReport?.summary || '');
  const [conditions, setConditions] = useState<Record<string, string>>(
    (existingReport?.conditions as Record<string, string>) || {}
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleConditionChange = (field: string, value: string) => {
    setConditions(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!summary.trim()) {
      alert('Please add a trip summary');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        overall_rating: rating,
        summary: summary.trim(),
        conditions,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {existingReport ? 'Edit Trip Report' : 'Add Trip Report'}
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Share how the trip went for future reference.
          </p>

          {/* Overall Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Rating
            </label>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as const).map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="text-3xl focus:outline-none transition-transform hover:scale-110"
                >
                  {star <= rating ? '⭐' : '☆'}
                </button>
              ))}
            </div>
          </div>

          {/* Activity-Specific Conditions */}
          {activity === 'ski_tour' && (
            <div className="space-y-4 mb-6">
              <h3 className="font-medium text-gray-900">Ski Tour Conditions</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Snow Quality
                </label>
                <select
                  value={conditions.snow_quality || ''}
                  onChange={(e) => handleConditionChange('snow_quality', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select...</option>
                  <option value="powder">Powder</option>
                  <option value="crud">Crud</option>
                  <option value="corn">Corn</option>
                  <option value="ice">Ice</option>
                  <option value="variable">Variable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skintrack Condition
                </label>
                <select
                  value={conditions.skintrack_condition || ''}
                  onChange={(e) => handleConditionChange('skintrack_condition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select...</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="not_established">Not Established</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descent Quality
                </label>
                <select
                  value={conditions.descent_quality || ''}
                  onChange={(e) => handleConditionChange('descent_quality', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select...</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="unskiable">Unskiable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dangers Noticed (optional)
                </label>
                <textarea
                  value={conditions.dangers_noticed || ''}
                  onChange={(e) => handleConditionChange('dangers_noticed', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Avalanche activity, cornices, crevasses, etc."
                />
              </div>
            </div>
          )}

          {activity === 'offroad' && (
            <div className="space-y-4 mb-6">
              <h3 className="font-medium text-gray-900">Trail Conditions</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trail Condition
                </label>
                <select
                  value={conditions.trail_condition || ''}
                  onChange={(e) => handleConditionChange('trail_condition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select...</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="muddy">Muddy</option>
                  <option value="washed_out">Washed Out</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Rating
                </label>
                <select
                  value={conditions.difficulty_rating || ''}
                  onChange={(e) => handleConditionChange('difficulty_rating', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select...</option>
                  <option value="easier_than_expected">Easier than Expected</option>
                  <option value="as_expected">As Expected</option>
                  <option value="harder_than_expected">Harder than Expected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Obstacles (optional)
                </label>
                <textarea
                  value={conditions.obstacles || ''}
                  onChange={(e) => handleConditionChange('obstacles', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Downed trees, washouts, rocky sections, etc."
                />
              </div>
            </div>
          )}

          {activity === 'mountain_bike' && (
            <div className="space-y-4 mb-6">
              <h3 className="font-medium text-gray-900">Trail Conditions</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trail Condition
                </label>
                <select
                  value={conditions.trail_condition || ''}
                  onChange={(e) => handleConditionChange('trail_condition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select...</option>
                  <option value="tacky">Tacky</option>
                  <option value="dry">Dry</option>
                  <option value="dusty">Dusty</option>
                  <option value="muddy">Muddy</option>
                  <option value="wet">Wet</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Obstacles (optional)
                </label>
                <textarea
                  value={conditions.obstacles || ''}
                  onChange={(e) => handleConditionChange('obstacles', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Technical features, new obstacles, trail conditions, etc."
                />
              </div>
            </div>
          )}

          {(activity === 'hike' || activity === 'trail_run') && (
            <div className="space-y-4 mb-6">
              <h3 className="font-medium text-gray-900">Trail Conditions</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trail Condition
                </label>
                <select
                  value={conditions.trail_condition || ''}
                  onChange={(e) => handleConditionChange('trail_condition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select...</option>
                  <option value="clear">Clear</option>
                  <option value="overgrown">Overgrown</option>
                  <option value="muddy">Muddy</option>
                  <option value="snow">Snow</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Obstacles (optional)
                </label>
                <textarea
                  value={conditions.obstacles || ''}
                  onChange={(e) => handleConditionChange('obstacles', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Stream crossings, downed trees, snow patches, etc."
                />
              </div>
            </div>
          )}

          {activity === 'climb' && (
            <div className="space-y-4 mb-6">
              <h3 className="font-medium text-gray-900">Route Conditions</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Route Condition
                </label>
                <select
                  value={conditions.route_condition || ''}
                  onChange={(e) => handleConditionChange('route_condition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select...</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rock Quality
                </label>
                <select
                  value={conditions.rock_quality || ''}
                  onChange={(e) => handleConditionChange('rock_quality', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select...</option>
                  <option value="solid">Solid</option>
                  <option value="loose">Loose</option>
                  <option value="variable">Variable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Rating
                </label>
                <select
                  value={conditions.difficulty_rating || ''}
                  onChange={(e) => handleConditionChange('difficulty_rating', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select...</option>
                  <option value="easier_than_expected">Easier than Expected</option>
                  <option value="as_expected">As Expected</option>
                  <option value="harder_than_expected">Harder than Expected</option>
                </select>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trip Summary *
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value.slice(0, 500))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="How did the trip go? What went well? Any noteworthy moments?"
            />
            <div className="text-xs text-gray-500 mt-1">
              {summary.length}/500 characters
            </div>
          </div>

          {/* Actions */}
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isSaving ? 'Saving...' : existingReport ? 'Update Report' : 'Save Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
