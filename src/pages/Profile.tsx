import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, logout } = useAuth();

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
        
        <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
      
            <div className="h-32 w-32 rounded-full bg-white/20 border border-white/20 flex items-center justify-center text-4xl font-bold">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold">My Profile</h1>
              <p className="mt-2 text-white/70">{user?.email}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95">
                  Edit profile
                </button>

                <button className="rounded-2xl bg-white/10 border border-white/10 px-5 py-2 text-sm hover:bg-white/15">
                  Change avatar
                </button>

                <button
                  onClick={logout}
                  className="rounded-2xl bg-destructive/20 border border-destructive/40 px-5 py-2 text-sm text-destructive hover:bg-destructive/30"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">My posts</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-4 shadow-xl"
              >
                <div className="h-36 rounded-xl bg-black/30 mb-3" />
                <div className="font-semibold text-sm">
                  My movie post #{i}
                </div>
                <p className="text-xs text-white/70 mt-1">
                  This is a placeholder for user content.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
