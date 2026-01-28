import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send } from "lucide-react";

type Comment = {
  id: string;
  author: string;
  createdAt: string;
  text: string;
};

export default function Comments() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [newComment, setNewComment] = useState("");

  // MOCK comments (בהמשך יגיע מהשרת)
  const comments: Comment[] = useMemo(
    () => [
      { id: "c1", author: "Sofie Miller", createdAt: "10m ago", text: "Love this topic 🔥" },
      { id: "c2", author: "Ruby Collins", createdAt: "1h ago", text: "My pick: Shutter Island 😅" },
      { id: "c3", author: "Aiya Morgan", createdAt: "Yesterday", text: "So many good twists!!" },
    ],
    []
  );

  const onAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    // Mock action
    console.log("ADD COMMENT (mock)", { postId: id, text: newComment });

    setNewComment("");
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
            onClick={() => navigate(`/post/${id}`)}
            className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Back
          </button>
        </div>

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
              disabled={!newComment.trim()}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              Send
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
                <div className="font-semibold">{c.author}</div>
                <div className="text-xs text-white/60">{c.createdAt}</div>
              </div>
              <p className="mt-2 text-sm text-white/80 leading-6">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
