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

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

export default function TourPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
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
      }

      if (postData) {
        const [responseData, participantData] = await Promise.all([
          getTourResponses(postId),
          getTourParticipants(postId),
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

      // Load messages
      const messagesData = await getTourMessages(postId);
      setMessages(messagesData);

      // Load contact info if tour is confirmed
      if (post.status === 'confirmed' || post.status === 'completed') {
        const contactData = await getTourParticipantsWithContact(postId, post.user_id);
        setParticipantsWithContact(contactData);
      }
    }
    loadParticipantData();
  }, [post, user, responses, postId]);

  const handleSubmitInterest = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { error: submitError } = await createTourResponse(postId, user.id, message);

    if (submitError) {
      setError(submitError.message);
    } else {
      setSuccess('Your interest has been submitted!');
      setMessage('');
      // Refresh responses
      const responseData = await getTourResponses(postId);
      setResponses(responseData);
    }

    setIsSubmitting(false);
  };

  const handleResponseUpdate = async (responseId: string, status: 'accepted' | 'declined') => {
    const { error: updateError } = await updateTourResponseStatus(responseId, status);

    if (!updateError) {
      // Refresh responses and participants
      const [responseData, participantData] = await Promise.all([
        getTourResponses(postId),
        getTourParticipants(postId),
      ]);
      setResponses(responseData);
      setParticipants(participantData);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this tour post?')) {
      return;
    }

    const { error: deleteError } = await deleteTourPost(postId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      router.push('/partners');
    }
  };

  const handleStatusChange = async (newStatus: 'confirmed' | 'completed') => {
    const { error: statusError } = await updateTourStatus(postId, newStatus);

    if (statusError) {
      setError(statusError.message);
    } else {
      // Refresh post data
      const postData = await getTourPost(postId);
      setPost(postData);
      // Load contact info if now confirmed
      if (postData && (postData.status === 'confirmed' || postData.status === 'completed')) {
        const contactData = await getTourParticipantsWithContact(postId, postData.user_id);
        setParticipantsWithContact(contactData);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    setIsSendingMessage(true);
    const { data, error: msgError } = await createTourMessage(postId, user.id, newMessage.trim());

    if (msgError) {
      setError(msgError.message);
    } else if (data) {
      setMessages([...messages, data]);
      setNewMessage('');
    }
    setIsSendingMessage(false);
  };

  const handleSavePlanningNotes = async () => {
    setIsSavingNotes(true);
    const { error: notesError } = await updateTourPlanningNotes(postId, planningNotes);

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
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Tour not found</h1>
        <p className="text-gray-500 mb-4">This tour may have been deleted or doesn&apos;t exist.</p>
        <Link
          href="/partners"
          className="text-blue-600 hover:text-blue-800"
        >
          Browse other tours
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
        href="/partners"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        ← Back to tours
      </Link>

      {/* Main card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${ACTIVITY_COLORS[post.activity || 'ski_tour']}`}>
                <span>{ACTIVITY_ICONS[post.activity || 'ski_tour']}</span>
                {ACTIVITY_LABELS[post.activity || 'ski_tour']}
              </span>
              <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
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
        {user && participants.length > 0 && (
          <div className="py-4 border-t border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Who&apos;s Going ({participants.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {participants.map((participant) => (
                <Link
                  key={participant.user_id}
                  href={`/profile/${participant.user_id}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full hover:bg-green-100 transition-colors"
                >
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-sm font-medium text-green-800">
                    {participant.display_name || 'Anonymous'}
                  </span>
                  {participant.experience_level && (
                    <span className="text-xs text-green-600">
                      ({EXPERIENCE_LABELS[participant.experience_level]})
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
            {post.status === 'open' && participants.length > 0 && (
              <button
                onClick={() => handleStatusChange('confirmed')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Confirm Tour - It&apos;s On!
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
              Delete Tour
            </button>
          </div>
        )}
      </div>

      {/* You're In! (for accepted participants) */}
      {!isOwner && isAccepted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">✓</span>
            <h2 className="text-lg font-semibold text-green-800">You&apos;re In!</h2>
          </div>
          <p className="text-green-700">
            You&apos;ve been accepted to this tour. Check back for updates from the organizer.
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
              <p className="text-gray-600 mb-4">Sign in to express interest in this tour.</p>
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
                <div>
                  <span className="font-medium text-blue-900">
                    {p.display_name || 'Anonymous'}
                  </span>
                  {p.user_id === post.user_id && (
                    <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                      Organizer
                    </span>
                  )}
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
