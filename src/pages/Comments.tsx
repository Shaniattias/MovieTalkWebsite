import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { API_ORIGIN } from "../lib/api";
import { syncPostCommentsCount } from "../lib/posts";

type Comment = {
  id: string;
  author: { id: string; username: string; profileImage?: string };
  createdAt: string;
  text: string;
};

type BackendComment = {
  _id: string;
  author: { _id: string; username: string; profileImage?: string };
  text: string;
  createdAt: string;
};

function toAbsoluteProfileImage(profileImage?: string): string | undefined {
  if (!profileImage) return undefined;
  if (/^https?:\/\//i.test(profileImage) || profileImage.startsWith("data:")) {
    return profileImage;
  }
  return `${API_ORIGIN}${profileImage.startsWith("/") ? "" : "/"}${profileImage}`;
}

function mapComment(c: BackendComment): Comment {
  return {
    id: c._id,
    author: {
      id: c.author._id,
      username: c.author.username,
      profileImage: toAbsoluteProfileImage(c.author.profileImage),
    },
    text: c.text,
    createdAt: new Date(c.createdAt).toLocaleString(),
  };
}

export default function Comments() {
  const { id: postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    api
      .get(`/comments/${postId}`)
      .then((res) => setComments((res.data as BackendComment[]).map(mapComment)))
      .catch(() => setError("Failed to load comments."));
  }, [postId]);

  const onAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !postId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.post(`/comments/${postId}`, { text: newComment.trim() });
      const { comment, commentsCount } = res.data as { comment: BackendComment; commentsCount: number };
      setComments((prev) => [...prev, mapComment(comment)]);
      syncPostCommentsCount(postId, commentsCount);
      setNewComment("");
    } catch {
      setError("Failed to add comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDeleteComment = async (commentId: string) => {
    try {
      const res = await api.delete(`/comments/${commentId}`);
      const { commentsCount } = res.data as { commentsCount: number };
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (postId) syncPostCommentsCount(postId, commentsCount);
    } catch {
      setError("Failed to delete comment.");
    }
  };

  return (
    <div className="min-h-screen relative text-white">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/movie-collage-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/75" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),rgba(0,0,0,0.85))]" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Comments</h1>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Back
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Add comment */}
        <form
          onSubmit={onAddComment}
          className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 shadow-2xl"
        >
          <div className="text-sm font-semibold mb-3">Add a comment</div>

          <div className="flex gap-3">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write your comment…"
              className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-white/50 focus:ring-2 focus:ring-primary/60"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Sending…" : "Send"}
            </button>
          </div>
        </form>

        {/* Comments list */}
        <div className="mt-6 space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 shadow-xl shadow-black/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {c.author.profileImage ? (
                    <img
                      src={c.author.profileImage}
                      alt={`${c.author.username} avatar`}
                      className="h-8 w-8 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full border border-white/20 bg-black/25 flex items-center justify-center text-xs font-semibold text-white/80">
                      {c.author.username.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="font-semibold">{c.author.username}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-white/60">{c.createdAt}</div>
                  {user?.username === c.author.username && (
                    <button
                      onClick={() => onDeleteComment(c.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-400/30 bg-red-500/20 px-2 py-1 text-xs text-red-100 hover:bg-red-500/50 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm text-white/80 leading-6">{c.text}</p>
            </div>
          ))}

          {comments.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-8 text-center">
              <p className="text-white/60 text-sm">No comments yet. Be the first!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
