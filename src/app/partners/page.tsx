'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getTourPosts, TourPost } from '@/lib/partners';

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

function TourPostCard({ post }: { post: TourPost }) {
  const tourDate = new Date(post.tour_date + 'T12:00:00');
  const isToday = new Date().toISOString().split('T')[0] === post.tour_date;
  const isTomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0] === post.tour_date;

  return (
    <Link
      href={`/partners/${post.id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{post.title}</h3>
          <p className="text-sm text-gray-500 mt-1">
            Posted by {post.profiles?.display_name || 'Anonymous'}
            {post.profiles?.experience_level && (
              <span className="ml-2 text-gray-400">
                ({EXPERIENCE_LABELS[post.profiles.experience_level]})
              </span>
            )}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div
            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              isToday
                ? 'bg-green-100 text-green-700'
                : isTomorrow
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {isToday
              ? 'Today'
              : isTomorrow
              ? 'Tomorrow'
              : tourDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
          </div>
          {post.tour_time && (
            <div className="text-xs text-gray-500 mt-1">{post.tour_time}</div>
          )}
        </div>
      </div>

      {post.description && (
        <p className="text-sm text-gray-600 mt-3 line-clamp-2">{post.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-3 mt-4 text-sm">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            post.zone === 'southeast'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-cyan-100 text-cyan-700'
          }`}
        >
          {post.zone === 'southeast' ? 'Southeast' : 'Northwest'}
        </span>

        {post.experience_required && (
          <span className="text-gray-500">
            {EXPERIENCE_LABELS[post.experience_required]}+ required
          </span>
        )}

        {post.status === 'full' ? (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
            Full
          </span>
        ) : (
          <span className="text-gray-500">
            {post.accepted_count || 0}/{post.spots_available + (post.accepted_count || 0)} spots filled
          </span>
        )}
      </div>
    </Link>
  );
}

export default function PartnersPage() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<TourPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  useEffect(() => {
    async function loadPosts() {
      setLoading(true);
      const data = await getTourPosts(selectedZone || undefined);
      setPosts(data);
      setLoading(false);
    }
    loadPosts();
  }, [selectedZone]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Find Touring Partners</h1>
          <p className="text-gray-500">
            {posts.length} {posts.length === 1 ? 'tour' : 'tours'} posted
          </p>
        </div>
        {user ? (
          <Link
            href="/partners/new"
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            + Post a Tour
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Sign in to Post
          </Link>
        )}
      </div>

      {/* Zone filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedZone(null)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedZone === null
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All Zones
        </button>
        <button
          onClick={() => setSelectedZone('southeast')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedZone === 'southeast'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Southeast
        </button>
        <button
          onClick={() => setSelectedZone('northwest')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedZone === 'northwest'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Northwest
        </button>
      </div>

      {/* Tour posts list */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading tours...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-4">🎿</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No tours posted yet</h3>
          <p className="text-gray-500 mb-4">
            Be the first to post a tour and find partners!
          </p>
          {user ? (
            <Link
              href="/partners/new"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Post a Tour
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Sign in to Get Started
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <TourPostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>1. Create a profile with your experience and gear</li>
          <li>2. Post a tour with date, zone, and requirements</li>
          <li>3. Others can express interest in joining</li>
          <li>4. Review requests and coordinate directly</li>
        </ul>
      </div>
    </div>
  );
}
