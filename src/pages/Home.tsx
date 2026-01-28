import { useMemo, useState } from "react";
import { Search, Plus, Heart, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

type FeedPost = {
  id: string;
  author: string;
  authorAvatar?: string;
  createdAt: string;
  title: string;
  text: string;
  poster?: string;
  likesCount: number;
  commentsCount: number;
  liked?: boolean;
};

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const posts: FeedPost[] = useMemo(
    () => [
      {
        id: "1",
        author: "Sofie Miller",
        createdAt: "2h ago",
        title: "Best plot twists you didn’t see coming",
        text: "Drop your favorite twist-movie without spoilers 👀",
        poster: "/images/movie-collage-bg.jpg",
        likesCount: 128,
        commentsCount: 34,
        liked: true,
      },
      {
        id: "2",
        author: "Ruby Collins",
        createdAt: "Yesterday",
        title: "Underrated sci-fi movies (2000–2010)",
        text: "I’m building a watchlist—send recs!",
        likesCount: 57,
        commentsCount: 12,
        liked: false,
      },
      {
        id: "3",
        author: "Aiya Morgan",
        createdAt: "3 days ago",
        title: "Comfort movies for a rainy night",
        text: "My pick: About Time. Yours?",
        likesCount: 92,
        commentsCount: 19,
        liked: false,
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.text.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q)
    );
  }, [posts, query]);

  return (
    <div className="min-h-screen relative text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/movie-collage-bg.jpg')",
        }}
      />
      <div className="absolute inset-0 bg-black/75" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),rgba(0,0,0,0.85))]" />

      <div className="relative z-10">
    <header className="sticky top-0 z-20 h-16 border-b border-white/10 bg-black/35 backdrop-blur-xl">

         <div className="relative mx-auto max-w-6xl px-4 h-full flex items-center">

            <div className="flex items-center">
             <img
  src="/images/logo2.png"
  alt="MovieTalk"
  className="absolute left-4 top-1/2 h-20 w-auto -translate-y-1/2 object-contain"
/>

            </div>

            <div className="flex-1" />

            <div className="hidden md:flex w-[420px] max-w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
              <Search className="h-4 w-4 opacity-80" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts, users, topics…"
                className="w-full bg-transparent outline-none placeholder:text-white/60 text-sm"
              />
            </div>

            <button
              onClick={() => navigate("/create")}
              className="ml-1 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/30 hover:opacity-95 active:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Create
            </button>
          </div>

          <div className="md:hidden px-4 pb-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
              <Search className="h-4 w-4 opacity-80" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full bg-transparent outline-none placeholder:text-white/60 text-sm"
              />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            <section className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl px-5 py-4 shadow-xl shadow-black/20">
                <div className="text-lg font-semibold">Your Feed</div>
                <div className="text-sm text-white/70">
                  Explore posts, discussions and movie recommendations.
                </div>
              </div>

              {filtered.map((p) => (
                <article
                  key={p.id}
                  onClick={() => navigate(`/post/${p.id}`)}
                  className="cursor-pointer rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 shadow-xl shadow-black/20 hover:bg-white/15 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-sm font-semibold">
                        {p.author.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold leading-5">{p.author}</div>
                        <div className="text-xs text-white/60">{p.createdAt}</div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/profile");
                      }}
                      className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15"
                    >
                      My profile
                    </button>
                  </div>

                  <div className="mt-4">
                    <div className="text-base font-semibold">{p.title}</div>
                    <p className="mt-1 text-sm text-white/80 leading-6">{p.text}</p>
                  </div>

                  {p.poster ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                      <img
                        src={p.poster}
                        alt=""
                        className="h-48 w-full object-cover opacity-90"
                      />
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: like mock
                          console.log("like", p.id);
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm hover:bg-black/30"
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            p.liked ? "text-primary" : "text-white/80"
                          }`}
                        />
                        <span className="text-white/90">{p.likesCount}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: comments page later
                          console.log("comments", p.id);
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm hover:bg-black/30"
                      >
                        <MessageCircle className="h-4 w-4 text-white/80" />
                        <span className="text-white/90">{p.commentsCount}</span>
                        <span className="text-white/60 hidden sm:inline">
                          Comments
                        </span>
                      </button>
                    </div>

                    {/* הסרנו את Open post — כל הפוסט כבר לחיץ */}
                  </div>
                </article>
              ))}
            </section>

            <aside className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 shadow-xl shadow-black/20">
                <div className="font-semibold">Trending</div>
                <ul className="mt-3 space-y-2 text-sm text-white/80">
                  <li className="flex items-center justify-between">
                    <span>#SciFi</span>
                    <span className="text-white/60">1.2k</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>#PlotTwists</span>
                    <span className="text-white/60">860</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>#ComfortMovies</span>
                    <span className="text-white/60">640</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-5 shadow-xl shadow-black/20">
                <div className="font-semibold">Quick actions</div>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <button
                    onClick={() => navigate("/create")}
                    className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
                  >
                    Create a post
                  </button>

                  <button
                    onClick={() => navigate("/profile")}
                    className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15"
                  >
                    My profile
                  </button>

                  <button className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15">
                    Saved posts
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
