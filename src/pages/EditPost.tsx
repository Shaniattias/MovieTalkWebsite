import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Image as ImageIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getAllPosts, updatePostAsync } from "../lib/posts";

export default function EditPost() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    const posts = getAllPosts(user);
    const current = posts.find((post) => post.id === id);
    if (!current) return;
    if (current.author.email !== user.email) {
      navigate(`/post/${id}`);
      return;
    }

    setTitle(current.title);
    setDescription(current.text);
    setImageUrl(current.imageUrl);
  }, [user, id, navigate]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);

    setImageUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!id) return;
    setError(null);

    try {
      await updatePostAsync(
        id,
        {
          title: title.trim(),
          text: description.trim(),
          imageFile,
        },
        user ?? undefined
      );
      navigate(`/post/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update post.");
    }
  };

  return (
    <div className="min-h-screen relative text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/movie-collage-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/75" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),rgba(0,0,0,0.85))]" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Edit post</h1>

          <button
            type="button"
            onClick={() => navigate(`/post/${id}`)}
            className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Back
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 md:p-8 shadow-2xl">
          {error && (
            <div className="mb-4 p-2 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
              {error}
            </div>
          )}
          <label className="block text-sm font-semibold mb-2">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-white/50 focus:ring-2 focus:ring-primary/60"
          />

          <label className="block text-sm font-semibold mt-5 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Update your post description..."
            className="w-full min-h-[160px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-white/50 focus:ring-2 focus:ring-primary/60"
          />

          <div className="mt-5">
            <label className="block text-sm font-semibold mb-2">Image</label>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={handleImageChange}
                className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white hover:file:bg-white/15"
              />

              <div className="mt-4">
                {imageUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <img
                      src={imageUrl}
                      alt="Selected preview"
                      className="w-full max-h-[320px] object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <ImageIcon className="h-4 w-4" />
                    No image selected
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(`/post/${id}`)}
              className="rounded-2xl bg-white/10 border border-white/10 px-5 py-2 text-sm hover:bg-white/15"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="rounded-2xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
