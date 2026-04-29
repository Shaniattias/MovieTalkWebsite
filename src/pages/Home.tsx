import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Heart, MessageCircle, UserRound, Sparkles, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchFeedPosts, toggleLike, searchPostsWithAI, type Post } from "../lib/posts";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [aiResults, setAiResults] = useState<Post[] | null>(null);
  const [aiSearching, setAiSearching] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchFeedPosts().then(setPosts).catch(console.error);
  }, [user]);

  const handleToggleLike = async (postId: string) => {
    try {
      const updated = await toggleLike(postId);
      if (!updated) return;
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    } catch {
      // keep existing UI state on failure
    }
  };

  const handleAiSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setAiSearching(true);
    try {
      const { results } = await searchPostsWithAI(q);
      setAiResults(results);
    } catch {
      // silently fall back to local filter
    } finally {
      setAiSearching(false);
    }
  };

  const clearAiSearch = () => {
    setAiResults(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.text.toLowerCase().includes(q) ||
        p.author.username.toLowerCase().includes(q)
    );
  }, [posts, query]);

  return (
    <div className="min-h-screen relative text-white">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/movie-collage-bg.jpg')",
          backgroundAttachment: "fixed",
        }}
      />
      <div className="fixed inset-0 bg-black/75" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),rgba(0,0,0,0.85))]" />

      <div className="relative z-10">
        <header className="sticky top-0 z-20 h-16 border-b border-white/10 bg-black/35 backdrop-blur-xl">
          <div className="relative mx-auto flex h-full max-w-6xl items-center justify-between px-4">
            <div className="z-10 flex items-center gap-2">
              <img
                src="/images/logo.png"
                alt="MovieTalk"
                className="h-10 w-10 object-contain" />
               <span className="text-white text-xl font-semibold"> MovieTalk </span>
            </div>

            <div className="absolute left-1/2 top-1/2 z-0 flex w-[min(44vw,420px)] min-w-[170px] -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
              {aiResults !== null
                ? <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
                : <Search className="h-4 w-4 opacity-80 shrink-0" />}
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); if (aiResults) clearAiSearch(); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAiSearch(); }}
                placeholder="Search with AI… press Enter"
                className="w-full bg-transparent outline-none placeholder:text-white/60 text-sm"
              />
              {aiSearching && <Loader2 className="h-4 w-4 animate-spin opacity-60 shrink-0" />}
              {aiResults !== null && !aiSearching && (
                <button onClick={clearAiSearch} aria-label="Clear AI search">
                  <X className="h-4 w-4 opacity-60 hover:opacity-100 shrink-0" />
                </button>
              )}
            </div>

            <div className="z-10 flex items-center justify-end gap-2">
              <button
                onClick={() => navigate("/create")}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-600 hover:bg-red-800 px-3 sm:px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/30 active:opacity-90"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create</span>
              </button>

              <button
                onClick={() => navigate("/profile")}
                aria-label="Go to profile"
                className="inline-flex h-10 w-10 items-center justify-center rounded-3xl border border-white/10 bg-white/10 hover:bg-white/20 transition"
              >
                <UserRound className="h-5 w-5 text-white/90" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="mx-auto w-full">
            <section className="space-y-6">


              {(aiResults ?? filtered).map((p) => (
                <article
                  key={p.id}
                  onClick={() => navigate(`/post/${p.id}`)}
                  className="group cursor-pointer overflow-hidden rounded-[28px] border border-white/15 bg-[linear-gradient(160deg,rgba(255,255,255,0.18),rgba(255,255,255,0.06))] p-5 sm:p-6 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:shadow-[0_28px_70px_rgba(0,0,0,0.45)]"
                >
                  <div className="pointer-events-none absolute" />

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-3xl border border-white/20 bg-black/20 flex items-center justify-center text-sm font-semibold shadow-inner shadow-black/25">
                        {p.author.avatarUrl ? (
                          <img
                            src={p.author.avatarUrl}
                            alt={`${p.author.username} avatar`}
                            className="h-full w-full object-cover rounded-3xl"
                          />
                        ) : (
                          p.author.username.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-semibold leading-5 text-white/95">
                          {p.author.username}
                        </div>
                        <div className="text-xs text-white/60">{p.createdAt}</div>
                      </div>
                    </div>

                  </div>

                  <div className="mt-5">
                    <div className="text-lg font-semibold leading-7 text-white">{p.title}</div>
                    <p className="mt-2 text-sm text-white/80 leading-7">{p.text}</p>
                  </div>

                  {p.imageUrl ? (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-white/20">
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="h-56 w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : null}

                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLike(p.id);
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition"
                      >
                        <Heart
                          className={`h-6 w-6 ${
                            p.liked ? "fill-current text-primary" : "text-white/80"
                          }`}
                        />
                        <span className="text-white/90">{p.likesCount}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/post/${p.id}/comments`);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm"
                      >
                        <MessageCircle className="h-6 w-6 text-white/80" />
                        <span className="text-white/90">{p.commentsCount}</span>
                      </button>
                    </div>


                  </div>
                </article>
              ))}
              {(aiResults ?? filtered).length === 0 ? (
                <div className="rounded-3xl border border-white/15 bg-white/10 p-10 text-center backdrop-blur-xl">
                  <p className="text-lg font-semibold">No posts found</p>
                  <p className="mt-2 text-sm text-white/70">
                    Try a different search term or create a new discussion.
                  </p>
                </div>
              ) : null}
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}
