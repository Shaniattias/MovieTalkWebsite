import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, Plus, UserPen } from "lucide-react";
import { fetchFeedPosts, type Post } from "../lib/posts";


export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchFeedPosts().then(setPosts).catch(console.error);
  }, [user]);

  const userPosts = useMemo(() => {
    if (!user) return [];
    return posts.filter((post) => post.author.email === user.email);
  }, [posts, user]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
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

     
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center justify-end mb-6">

      <button
            onClick={() => navigate("/home")}
            className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Back
        </button>
      </div>

        
        <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
      
            <div className="h-32 w-32 overflow-hidden rounded-full bg-white/20 border border-white/20 flex items-center justify-center text-4xl font-bold">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold">
                {user?.name || user?.email?.split("@")[0] || "My Profile"}
              </h1>
              <p className="mt-2 text-white/70">{user?.email}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/profile/edit")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gray-500/30 border border-gray-300/30 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-500/40"
                >
                  <UserPen className="h-4 w-4" />
                  Edit profile
                </button>

                 <button
                  onClick={() => navigate("/create")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gray-500/30 border border-gray-300/30 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-500/40"
                >
                  <Plus className="h-4 w-4" />
                  Create post
                </button>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-600 border border-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">My posts</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {userPosts.length > 0 ? (
              userPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => navigate(`/post/${post.id}`)}
                  className="cursor-pointer rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-4 shadow-xl hover:bg-white/15 transition"
                >
                  {post.imageUrl ? (
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="h-36 w-full rounded-xl object-cover mb-3"
                    />
                  ) : (
                    <div className="h-36 rounded-xl bg-black/30 mb-3" />
                  )}
                  <div className="font-semibold text-sm">{post.title}</div>
                  <p className="text-xs text-white/70 mt-1 line-clamp-2">{post.text}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 text-sm text-white/70 col-span-full">
                No posts yet for this user.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
