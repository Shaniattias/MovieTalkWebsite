import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Heart, MessageCircle } from "lucide-react";

type FeedPost = {
  id: string;
  author: string;
  createdAt: string;
  title: string;
  text: string;
  poster?: string;
  likesCount: number;
  commentsCount: number;
  liked?: boolean;
};

export default function PostDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

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

  const post = useMemo(() => posts.find((p) => p.id === id), [posts, id]);

  return (
    <div className="min-h-screen relative text-white">
      {/* Background like Home/Profile */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/movie-collage-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/75" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),rgba(0,0,0,0.85))]" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-white/60 text-sm">Post</div>
            <h1 className="text-2xl md:text-3xl font-bold">Post details</h1>
          </div>

          <button
            onClick={() => navigate("/home")}
            className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Back
          </button>
        </div>

        {!post ? (
          <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-8 shadow-2xl">
            <div className="text-xl font-semibold">Post not found</div>
            <div className="mt-2 text-white/70">
              We couldn’t find a post with id: <span className="font-mono">{id}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 md:p-8 shadow-2xl">
   
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-lg font-semibold">
                  {post.author.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{post.author}</div>
                  <div className="text-xs text-white/60">{post.createdAt}</div>
                </div>
              </div>

              <div className="text-xs text-white/60 font-mono">id: {post.id}</div>
            </div>

        
            <div className="mt-6">
              <div className="text-xl md:text-2xl font-bold">{post.title}</div>
              <p className="mt-3 text-white/80 leading-7">{post.text}</p>
            </div>

       
            {post.poster ? (
              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <img
                  src={post.poster}
                  alt=""
                  className="w-full max-h-[420px] object-cover opacity-90"
                />
              </div>
            ) : null}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm hover:bg-black/30">
                  <Heart
                    className={`h-4 w-4 ${post.liked ? "text-primary" : "text-white/80"}`}
                  />
                  <span className="text-white/90">{post.likesCount}</span>
                </button>

                <button
                  onClick={() => navigate(`/post/${post.id}/comments`)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm hover:bg-black/30"
                >
                  <MessageCircle className="h-4 w-4 text-white/80" />
                  <span className="text-white/90">{post.commentsCount}</span>
                  <span className="text-white/60 hidden sm:inline">Comments</span>
                </button>
              </div>

              <button
                onClick={() => navigate("/create")}
                className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
              >
                Create new post
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
