import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Heart, MessageCircle, Trash2, Pencil } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getAllPosts, deletePost, toggleLike, type Post } from "../lib/posts";

export default function PostDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!user) return;
    setPosts(getAllPosts(user));
  }, [user]);

  const post = useMemo(() => posts.find((p) => p.id === id), [posts, id]);

  const handleDelete = () => {
    if (!post) return;
    deletePost(post.id);
    navigate("/home");
  };

  const handleToggleLike = () => {
    if (!post) return;
    const updated = toggleLike(post.id);
    if (!updated) return;
    setPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));
  };

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
            <h1 className="text-2xl md:text-3xl font-bold">Post details</h1>
          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={() => navigate("/home")}
              className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              Back
            </button>
          </div>
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
                  {post.author.username.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{post.author.username}</div>
                  <div className="text-xs text-white/60">{post.createdAt}</div>
                </div>
              </div>

      {user?.email === post.author.email ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/post/${post.id}/edit`);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-black/25 px-2.5 py-1.5 text-xs hover:bg-white/15 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete();
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-400/30 bg-red-500/20 px-2.5 py-1.5 text-xs text-red-100 hover:bg-red-500/50 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    ) : null}            
                    </div>

        
            <div className="mt-6">
              <div className="text-xl md:text-2xl font-bold">{post.title}</div>
              <p className="mt-3 text-white/80 leading-7">{post.text}</p>
            </div>

       
            {post.imageUrl ? (
              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <img
                  src={post.imageUrl}
                  alt=""
                  className="w-full max-h-[420px] object-cover opacity-90"
                />
              </div>
            ) : null}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleLike}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm hover:bg-black/30"
                >
                  <Heart
                    className={`h-4 w-4 ${
                      post.liked ? "fill-current text-primary" : "text-white/80"
                    }`}
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

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
