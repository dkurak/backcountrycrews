'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getPartnersLooking } from '@/lib/partners';

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

const EXPERIENCE_COLORS: Record<ExperienceLevel, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-gray-900 text-white',
  expert: 'bg-gray-900 text-white',
};

// Ski trail difficulty icons
function ExperienceIcon({ level, size = 'sm' }: { level: ExperienceLevel; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  switch (level) {
    case 'beginner':
      // Green circle
      return (
        <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" className="text-green-500" />
        </svg>
      );
    case 'intermediate':
      // Blue square
      return (
        <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor">
          <rect x="2" y="2" width="20" height="20" className="text-blue-500" />
        </svg>
      );
    case 'advanced':
      // Black diamond
      return (
        <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L22 12L12 22L2 12L12 2Z" className="text-gray-900" />
        </svg>
      );
    case 'expert':
      // Double black diamond
      return (
        <svg className={sizeClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 2L12 7L7 12L2 7L7 2Z" className="text-gray-900" />
          <path d="M17 12L22 17L17 22L12 17L17 12Z" className="text-gray-900" />
        </svg>
      );
  }
}

const FITNESS_LABELS: Record<string, string> = {
  moderate: 'Moderate',
  fit: 'Fit',
  very_fit: 'Very Fit',
  athlete: 'Athlete',
};

const ALL_EXPERIENCE_LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];

interface Partner {
  id: string;
  display_name: string | null;
  experience_level: string | null;
  fitness_level: string | null;
  certifications: string[] | null;
  bio: string | null;
  has_beacon: boolean;
  has_probe: boolean;
  has_shovel: boolean;
  preferred_zones: string[];
}

function PartnerCard({ partner }: { partner: Partner }) {
  const hasFullGear = partner.has_beacon && partner.has_probe && partner.has_shovel;
  const expLevel = partner.experience_level as ExperienceLevel | null;

  return (
    <Link
      href={`/profile/${partner.id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-4">
        {/* Avatar placeholder */}
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-500 flex-shrink-0">
          {(partner.display_name || '?')[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{partner.display_name || 'Anonymous'}</h3>
            {hasFullGear && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Full avy gear
              </span>
            )}
          </div>

          {/* Experience and fitness */}
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
            {expLevel && (
              <span className="flex items-center gap-1">
                <ExperienceIcon level={expLevel} />
                {EXPERIENCE_LABELS[expLevel]}
              </span>
            )}
            {expLevel && partner.fitness_level && (
              <span className="text-gray-300">|</span>
            )}
            {partner.fitness_level && (
              <span>{FITNESS_LABELS[partner.fitness_level]}</span>
            )}
          </div>

          {/* Bio */}
          {partner.bio && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{partner.bio}</p>
          )}

          {/* Zones and certifications */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {partner.preferred_zones?.map((zone) => (
              <span
                key={zone}
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  zone === 'southeast'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-cyan-100 text-cyan-700'
                }`}
              >
                {zone === 'southeast' ? 'Southeast' : 'Northwest'}
              </span>
            ))}
            {partner.certifications?.slice(0, 2).map((cert) => (
              <span
                key={cert}
                className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
              >
                {cert}
              </span>
            ))}
            {partner.certifications && partner.certifications.length > 2 && (
              <span className="text-xs text-gray-400">
                +{partner.certifications.length - 2} more
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function PartnersPage() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<Set<ExperienceLevel>>(new Set());

  useEffect(() => {
    async function loadPartners() {
      setLoading(true);
      const data = await getPartnersLooking(selectedZone || undefined);
      setPartners(data);
      setLoading(false);
    }
    loadPartners();
  }, [selectedZone]);

  // Count partners by experience level
  const experienceCounts = partners.reduce((acc, p) => {
    const level = p.experience_level as ExperienceLevel;
    if (level) {
      acc[level] = (acc[level] || 0) + 1;
    }
    return acc;
  }, {} as Record<ExperienceLevel, number>);

  // Toggle experience level selection
  const toggleExperience = (level: ExperienceLevel) => {
    setSelectedExperience((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  // Filter by experience level client-side (multi-select)
  const filteredPartners = selectedExperience.size === 0
    ? partners
    : partners.filter((p) => selectedExperience.has(p.experience_level as ExperienceLevel));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Find Partners</h1>
          <p className="text-gray-500">
            {filteredPartners.length} {filteredPartners.length === 1 ? 'person' : 'people'} looking for partners
          </p>
        </div>
        {user ? (
          <Link
            href="/trips/new"
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            + Create a Trip
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Sign in to Create Trip
          </Link>
        )}
      </div>

      {/* Zone filter */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedZone || ''}
          onChange={(e) => setSelectedZone(e.target.value || null)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Zones</option>
          <option value="southeast">Southeast</option>
          <option value="northwest">Northwest</option>
        </select>
      </div>

      {/* Experience Level Filter Cards */}
      {partners.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-3">
            Experience Level ({partners.length} total){selectedExperience.size > 0 && ` · ${filteredPartners.length} selected`}
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_EXPERIENCE_LEVELS.map((level) => {
              const count = experienceCounts[level] || 0;
              if (count === 0) return null;
              const isSelected = selectedExperience.has(level);
              return (
                <button
                  key={level}
                  onClick={() => toggleExperience(level)}
                  className={`px-3 py-2 rounded-lg text-left transition-all flex items-center gap-2 ${
                    isSelected
                      ? `${EXPERIENCE_COLORS[level]} ring-2 ring-offset-1 ring-gray-400`
                      : `${EXPERIENCE_COLORS[level]} opacity-70 hover:opacity-100`
                  }`}
                >
                  <ExperienceIcon level={level} size="lg" />
                  <div>
                    <div className="text-xs font-medium">{EXPERIENCE_LABELS[level]}</div>
                    <div className="text-lg font-bold">{count}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Partners list */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading partners...</p>
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No partners found</h3>
          <p className="text-gray-500 mb-4">
            {selectedZone || selectedExperience.size > 0
              ? 'Try adjusting your filters to find more partners.'
              : 'No one is currently looking for partners. Check back later!'}
          </p>
          {user && (
            <Link
              href="/profile"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Update Your Profile
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPartners.map((partner) => (
            <PartnerCard key={partner.id} partner={partner} />
          ))}
        </div>
      )}

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Looking for partners?</h3>
        <p className="text-sm text-blue-800 mb-3">
          Enable &quot;Looking for partners&quot; in your profile to appear here and let others find you.
        </p>
        <Link
          href="/profile"
          className="inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Update your profile →
        </Link>
      </div>
    </div>
  );
}
