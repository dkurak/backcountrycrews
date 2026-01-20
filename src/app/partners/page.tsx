'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getPartnersLooking } from '@/lib/partners';

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

const FITNESS_LABELS: Record<string, string> = {
  moderate: 'Moderate',
  fit: 'Fit',
  very_fit: 'Very Fit',
  athlete: 'Athlete',
};

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
            {partner.experience_level && (
              <span>{EXPERIENCE_LABELS[partner.experience_level]}</span>
            )}
            {partner.experience_level && partner.fitness_level && (
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
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);

  useEffect(() => {
    async function loadPartners() {
      setLoading(true);
      const data = await getPartnersLooking(selectedZone || undefined);
      setPartners(data);
      setLoading(false);
    }
    loadPartners();
  }, [selectedZone]);

  // Filter by experience level client-side
  const filteredPartners = selectedExperience
    ? partners.filter((p) => p.experience_level === selectedExperience)
    : partners;

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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Zone filter */}
        <select
          value={selectedZone || ''}
          onChange={(e) => setSelectedZone(e.target.value || null)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Zones</option>
          <option value="southeast">Southeast</option>
          <option value="northwest">Northwest</option>
        </select>

        {/* Experience filter */}
        <select
          value={selectedExperience || ''}
          onChange={(e) => setSelectedExperience(e.target.value || null)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Experience Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="expert">Expert</option>
        </select>
      </div>

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
            {selectedZone || selectedExperience
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
