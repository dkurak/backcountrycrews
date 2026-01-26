'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getPartnersLooking } from '@/lib/partners';
import { ExperienceIcon } from '@/components/ExperienceIcon';
import { Avatar } from '@/components/Avatar';
import {
  ExperienceLevel,
  EXPERIENCE_LABELS,
  EXPERIENCE_COLORS,
  FITNESS_LABELS,
} from '@/lib/constants';

const ALL_EXPERIENCE_LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];

interface Partner {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
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
        <Avatar src={partner.avatar_url} name={partner.display_name} size="lg" />

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
            + Post a Trip
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Sign in to Post Trip
          </Link>
        )}
      </div>

      {/* Invite a Friend CTA */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <span className="text-3xl">📨</span>
          <div className="flex-1">
            <h3 className="font-semibold text-teal-900 mb-1">Already have a crew in mind?</h3>
            <p className="text-sm text-teal-700 mb-3">
              Post a trip and share the link directly with your friends. No need to wait for them to sign up first.
            </p>
            <Link
              href={user ? "/trips/new" : "/login"}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              Post a Trip &amp; Invite Friends
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
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
                  className={`px-4 py-2 rounded-lg transition-all flex flex-col items-center ${
                    isSelected
                      ? `${EXPERIENCE_COLORS[level]} ring-2 ring-offset-1 ring-gray-400`
                      : `${EXPERIENCE_COLORS[level]} opacity-70 hover:opacity-100`
                  }`}
                >
                  <div className="text-xs font-medium">{EXPERIENCE_LABELS[level]}</div>
                  <div className="flex items-center gap-1">
                    <ExperienceIcon level={level} size="lg" />
                    <span className="text-lg font-bold">{count}</span>
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
        <h3 className="font-semibold text-blue-900 mb-2">Want to be listed here?</h3>
        <p className="text-sm text-blue-800 mb-3">
          Enable &quot;Looking for partners&quot; in your profile to let others find you for trips.
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
