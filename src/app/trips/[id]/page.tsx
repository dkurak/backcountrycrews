'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  getTourPost,
  getTourResponses,
  getTourParticipants,
  getTourParticipantsWithContact,
  getTourMessages,
  createTourResponse,
  createTourMessage,
  updateTourResponseStatus,
  updateTourStatus,
  updateTourPlanningNotes,
  deleteTourPost,
  TourPost,
  TourResponse,
  TourParticipant,
  TourParticipantWithContact,
  TourMessage,
  ACTIVITY_LABELS,
  ACTIVITY_COLORS,
  ACTIVITY_ICONS,
} from '@/lib/partners';
import { parseSlugOrId, getTripPath } from '@/lib/slugify';
import { ExperienceIcon } from '@/components/ExperienceIcon';
import { ExperienceLevel, EXPERIENCE_LABELS } from '@/lib/constants';

function InviteSection({ tripSlug, tripTitle, tripDate }: { tripSlug: string; tripTitle: string; tripDate: string }) {
  const [copied, setCopied] = useState(false);
  const tripUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/trips/${tripSlug}`
    : `https://backcountrycrews.com/trips/${tripSlug}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(tripUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = tripUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const emailSubject = encodeURIComponent(`Join my trip: ${tripTitle}`);
  const emailBody = encodeURIComponent(
    `Hey!\n\nI'm planning a trip and would love for you to join.\n\n` +
    `${tripTitle}\nDate: ${new Date(tripDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n\n` +
    `Check out the details and let me know if you're in:\n${tripUrl}\n\n` +
    `See you out there!`
  );

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-5 text-white">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-semibold text-lg mb-1">Invite Your Crew</h3>
          <p className="text-slate-300 text-sm">
            Share this trip with friends to get your crew together.
          </p>
        </div>

        {/* Copy Link */}
        <div className="flex gap-2">
          <input
            type="text"
            value={tripUrl}
            readOnly
            className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-sm text-slate-200 truncate"
          />
          <button
            onClick={handleCopyLink}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-slate-600 text-white hover:bg-slate-500'
            }`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Email, Text buttons */}
        <div className="flex flex-wrap gap-2">
          <a
            href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-800 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email
          </a>
          <a
            href={`sms:?body=${encodeURIComponent(`Join my trip: ${tripTitle} - ${tripUrl}`)}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-800 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Text
          </a>
        </div>
      </div>
    </div>
  );
}

export default function TourPostPage() {
  const router = useRouter();
  const params = useParams();
  const urlParam = params.id as string;
  const postId = parseSlugOrId(urlParam); // Extract ID from slug or use as-is
  const { user, loading: authLoading } = useAuth();

  const [post, setPost] = useState<TourPost | null>(null);
  const [responses, setResponses] = useState<TourResponse[]>([]);
  const [participants, setParticipants] = useState<TourParticipant[]>([]);
  const [participantsWithContact, setParticipantsWithContact] = useState<TourParticipantWithContact[]>([]);
  const [messages, setMessages] = useState<TourMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [planningNotes, setPlanningNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isOwner = user && post && user.id === post.user_id;
  const userResponse = responses.find((r) => r.user_id === user?.id);
  const isAccepted = userResponse?.status === 'accepted';
  const isPending = userResponse?.status === 'pending';
  const hasResponded = !!userResponse;
  const isParticipant = isOwner || isAccepted;
  const isConfirmed = post?.status === 'confirmed' || post?.status === 'completed';

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const postData = await getTourPost(postId);
      setPost(postData);
      if (postData) {
        setPlanningNotes(postData.planning_notes || '');
        // Use the full UUID from the loaded post for subsequent queries
        const fullId = postData.id;
        const [responseData, participantData] = await Promise.all([
          getTourResponses(fullId),
          getTourParticipants(fullId),
        ]);
        setResponses(responseData);
        setParticipants(participantData);
      }
      setLoading(false);
    }
    loadData();
  }, [postId]);

  // Load messages and contact info for participants
  useEffect(() => {
    async function loadParticipantData() {
      if (!post || !user) return;

      const userIsParticipant = post.user_id === user.id ||
        responses.some(r => r.user_id === user.id && r.status === 'accepted');

      if (!userIsParticipant) return;

      // Load messages - use post.id (full UUID) not postId (short ID from URL)
      const messagesData = await getTourMessages(post.id);
      setMessages(messagesData);

      // Load contact info if tour is confirmed
      if (post.status === 'confirmed' || post.status === 'completed') {
        const contactData = await getTourParticipantsWithContact(post.id, post.user_id);
        setParticipantsWithContact(contactData);
      }
    }
    loadParticipantData();
  }, [post, user, responses]);

  const handleSubmitInterest = async () => {
    if (!user || !post) {
      router.push('/login');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { error: submitError } = await createTourResponse(post.id, user.id, message);

    if (submitError) {
      setError(submitError.message);
    } else {
      setSuccess('Your interest has been submitted!');
      setMessage('');
      // Refresh responses
      const responseData = await getTourResponses(post.id);
      setResponses(responseData);
    }

    setIsSubmitting(false);
  };

  const handleResponseUpdate = async (responseId: string, status: 'accepted' | 'declined') => {
    if (!post) return;
    const { error: updateError } = await updateTourResponseStatus(responseId, status);

    if (!updateError) {
      // Refresh responses and participants
      const [responseData, participantData] = await Promise.all([
        getTourResponses(post.id),
        getTourParticipants(post.id),
      ]);
      setResponses(responseData);
      setParticipants(participantData);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    if (!confirm('Are you sure you want to delete this trip?')) {
      return;
    }

    const { error: deleteError } = await deleteTourPost(post.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      router.push('/trips');
    }
  };

  const handleStatusChange = async (newStatus: 'confirmed' | 'completed') => {
    if (!post) return;
    const { error: statusError } = await updateTourStatus(post.id, newStatus);

    if (statusError) {
      setError(statusError.message);
    } else {
      // Refresh post data
      const postData = await getTourPost(post.id);
      setPost(postData);
      // Load contact info if now confirmed
      if (postData && (postData.status === 'confirmed' || postData.status === 'completed')) {
        const contactData = await getTourParticipantsWithContact(postData.id, postData.user_id);
        setParticipantsWithContact(contactData);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!user || !post || !newMessage.trim()) return;

    setIsSendingMessage(true);
    const { data, error: msgError } = await createTourMessage(post.id, user.id, newMessage.trim());

    if (msgError) {
      setError(msgError.message);
    } else if (data) {
      setMessages([...messages, data]);
      setNewMessage('');
    }
    setIsSendingMessage(false);
  };

  const handleSavePlanningNotes = async () => {
    if (!post) return;
    setIsSavingNotes(true);
    const { error: notesError } = await updateTourPlanningNotes(post.id, planningNotes);

    if (notesError) {
      setError(notesError.message);
    } else {
      setSuccess('Planning notes saved!');
      setTimeout(() => setSuccess(null), 2000);
    }
    setIsSavingNotes(false);
  };

  if (loading || authLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Trip not found</h1>
        <p className="text-gray-500 mb-4">This trip may have been deleted or doesn&apos;t exist.</p>
        <Link
          href="/trips"
          className="text-blue-600 hover:text-blue-800"
        >
          Browse other trips
        </Link>
      </div>
    );
  }

  const tourDate = new Date(post.tour_date + 'T12:00:00');
  const isPast = new Date(post.tour_date) < new Date(new Date().toISOString().split('T')[0]);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/trips"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        ← Back to trips
      </Link>

      {/* Main card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${ACTIVITY_COLORS[post.activity || 'ski_tour']}`}>
                <span>{ACTIVITY_ICONS[post.activity || 'ski_tour']}</span>
                {ACTIVITY_LABELS[post.activity || 'ski_tour']}
              </span>
              <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
              {isOwner && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  Organizer
                </span>
              )}
              {!isOwner && isAccepted && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Joined
                </span>
              )}
            </div>
            <p className="text-gray-500 mt-1">
              Posted by{' '}
              <Link
                href={`/profile/${post.user_id}`}
                className="text-blue-600 hover:text-blue-800"
              >
                {post.profiles?.display_name || 'Anonymous'}
              </Link>
              {post.profiles?.experience_level && (
                <span className="ml-2">
                  ({EXPERIENCE_LABELS[post.profiles.experience_level]})
                </span>
              )}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              post.status === 'confirmed'
                ? 'bg-blue-100 text-blue-700'
                : post.status === 'open'
                ? 'bg-green-100 text-green-700'
                : post.status === 'full'
                ? 'bg-yellow-100 text-yellow-700'
                : post.status === 'completed'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {post.status === 'confirmed' ? "It's On!" : post.status.charAt(0).toUpperCase() + post.status.slice(1)}
          </span>
        </div>

        {/* Tour info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-gray-200">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Date</div>
            <div className="font-medium text-gray-900">
              {tourDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
          {post.tour_time && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Time</div>
              <div className="font-medium text-gray-900">{post.tour_time}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Zone</div>
            <div className="font-medium text-gray-900">
              {post.zone === 'southeast' ? 'Southeast' : 'Northwest'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Spots</div>
            <div className="font-medium text-gray-900">
              {participants.length}/{post.spots_available + participants.length} filled
            </div>
          </div>
        </div>

        {/* Who's Going (visible to logged-in users) */}
        {user && (
          <div className="py-4 border-t border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Who&apos;s Going ({participants.length + 1})
            </h2>
            <div className="flex flex-wrap gap-2">
              {/* Organizer */}
              <Link
                href={`/profile/${post.user_id}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full hover:bg-purple-100 transition-colors"
              >
                {post.profiles?.avatar_url ? (
                  <img
                    src={post.profiles.avatar_url}
                    alt={post.profiles.display_name || 'Organizer'}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center text-xs font-bold text-purple-700">
                    {(post.profiles?.display_name || '?')[0].toUpperCase()}
                  </span>
                )}
                <span className="text-sm font-medium text-purple-800">
                  {post.profiles?.display_name || 'Anonymous'}
                </span>
                {post.profiles?.experience_level && (
                  <span className="flex items-center justify-center w-5 h-5 bg-purple-100 rounded">
                    <ExperienceIcon level={post.profiles.experience_level as ExperienceLevel} size="sm" />
                  </span>
                )}
                <span className="text-xs bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded">
                  Organizer
                </span>
              </Link>
              {/* Accepted participants */}
              {participants.map((participant) => (
                <Link
                  key={participant.user_id}
                  href={`/profile/${participant.user_id}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full hover:bg-green-100 transition-colors"
                >
                  {participant.avatar_url ? (
                    <img
                      src={participant.avatar_url}
                      alt={participant.display_name || 'Participant'}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-700">
                      {(participant.display_name || '?')[0].toUpperCase()}
                    </span>
                  )}
                  <span className="text-sm font-medium text-green-800">
                    {participant.display_name || 'Anonymous'}
                  </span>
                  {participant.experience_level && (
                    <span className="flex items-center justify-center w-5 h-5 bg-green-100 rounded">
                      <ExperienceIcon level={participant.experience_level as ExperienceLevel} size="sm" />
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {post.description && (
          <div className="py-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Description
            </h2>
            <p className="text-gray-700 whitespace-pre-line">{post.description}</p>
          </div>
        )}

        {/* Meeting location */}
        {post.meeting_location && (
          <div className="py-4 border-t border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Meeting Location
            </h2>
            <p className="text-gray-700">{post.meeting_location}</p>
          </div>
        )}

        {/* Requirements */}
        <div className="py-4 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Requirements
          </h2>
          <div className="flex flex-wrap gap-2">
            {post.experience_required && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {EXPERIENCE_LABELS[post.experience_required]}+ experience
              </span>
            )}
            {post.gear_requirements?.map((gear) => (
              <span
                key={gear}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
              >
                {gear}
              </span>
            ))}
            {!post.experience_required && !post.gear_requirements?.length && (
              <span className="text-gray-500 text-sm">No specific requirements</span>
            )}
          </div>
        </div>

        {/* Owner actions */}
        {isOwner && (
          <div className="pt-4 border-t border-gray-200 flex flex-wrap gap-2">
            <Link
              href={`/trips/${postId}/edit`}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Edit Trip
            </Link>
            {post.status === 'open' && (
              <button
                onClick={() => handleStatusChange('confirmed')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Confirm Trip - It&apos;s On!
              </button>
            )}
            {(post.status === 'open' || post.status === 'confirmed') && (
              <button
                onClick={() => handleStatusChange('completed')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                Mark Completed
              </button>
            )}
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
            >
              Delete Trip
            </button>
          </div>
        )}
      </div>

      {/* Invite section (for owner) */}
      {isOwner && !isPast && post.status !== 'completed' && (
        <InviteSection tripSlug={post.slug || post.id} tripTitle={post.title} tripDate={post.tour_date} />
      )}

      {/* You're In! (for accepted participants) */}
      {!isOwner && isAccepted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">✓</span>
            <h2 className="text-lg font-semibold text-green-800">You&apos;re In!</h2>
          </div>
          <p className="text-green-700">
            You&apos;ve been accepted to this trip. Check back for updates from the organizer.
          </p>
        </div>
      )}

      {/* Pending response */}
      {!isOwner && isPending && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Interest Submitted</h2>
          <p className="text-yellow-700">
            Your request is pending. The organizer will review and respond.
          </p>
        </div>
      )}

      {/* Express interest (for non-owners who haven't responded) */}
      {!isOwner && !isPast && !hasResponded && post.status === 'open' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Interested in Joining?
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
              {success}
            </div>
          )}

          {user ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Introduce yourself, mention your experience, etc."
                />
              </div>
              <button
                onClick={handleSubmitInterest}
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : "I'm Interested"}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">Sign in to express interest in this trip.</p>
              <Link
                href="/login"
                className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Responses (for owner) */}
      {isOwner && responses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Interested People ({responses.length})
          </h2>
          <div className="space-y-4">
            {responses.map((response) => (
              <div
                key={response.id}
                className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {response.profiles?.display_name || 'Anonymous'}
                  </div>
                  {response.profiles?.experience_level && (
                    <div className="text-sm text-gray-500">
                      {EXPERIENCE_LABELS[response.profiles.experience_level]}
                      {response.profiles.has_beacon &&
                        response.profiles.has_probe &&
                        response.profiles.has_shovel &&
                        ' • Has avy gear'}
                    </div>
                  )}
                  {response.message && (
                    <p className="text-sm text-gray-700 mt-2">{response.message}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {response.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResponseUpdate(response.id, 'accepted')}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleResponseUpdate(response.id, 'declined')}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        response.status === 'accepted'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {response.status.charAt(0).toUpperCase() + response.status.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Info (for confirmed tours - visible to participants) */}
      {isParticipant && isConfirmed && participantsWithContact.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">
            Contact Info
          </h2>
          <div className="space-y-3">
            {participantsWithContact.map((p) => (
              <div key={p.user_id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${p.user_id}`}>
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt={p.display_name || 'Participant'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-sm font-bold text-blue-700">
                        {(p.display_name || '?')[0].toUpperCase()}
                      </span>
                    )}
                  </Link>
                  <div>
                    <Link href={`/profile/${p.user_id}`} className="font-medium text-blue-900 hover:underline">
                      {p.display_name || 'Anonymous'}
                    </Link>
                    {p.user_id === post.user_id && (
                      <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                        Organizer
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-blue-800">
                  {p.phone && (
                    <a href={`tel:${p.phone}`} className="hover:underline">
                      {p.phone}
                    </a>
                  )}
                  {p.phone && p.email && <span className="mx-2">•</span>}
                  {p.email && (
                    <a href={`mailto:${p.email}`} className="hover:underline">
                      {p.email}
                    </a>
                  )}
                  {!p.phone && !p.email && (
                    <span className="text-blue-600 italic">No contact info</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planning Notes (editable by owner, visible to participants) */}
      {isParticipant && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Planning Notes
          </h2>
          {isOwner ? (
            <div className="space-y-3">
              <textarea
                value={planningNotes}
                onChange={(e) => setPlanningNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                placeholder="Add route plans, meeting details, Plan A/B, etc."
              />
              <button
                onClick={handleSavePlanningNotes}
                disabled={isSavingNotes}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          ) : (
            <div className="text-gray-700 whitespace-pre-line">
              {planningNotes || <span className="text-gray-400 italic">No planning notes yet.</span>}
            </div>
          )}
        </div>
      )}

      {/* Discussion Thread (for participants) */}
      {isParticipant && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Discussion
          </h2>

          {/* Messages */}
          {messages.length > 0 ? (
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg ${
                    msg.user_id === user?.id
                      ? 'bg-blue-50 ml-8'
                      : 'bg-gray-50 mr-8'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">
                      {msg.profiles?.display_name || 'Anonymous'}
                    </span>
                    {msg.user_id === post.user_id && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                        Organizer
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(msg.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{msg.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 italic mb-6">No messages yet. Start the conversation!</p>
          )}

          {/* New message input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={isSendingMessage || !newMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSendingMessage ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
