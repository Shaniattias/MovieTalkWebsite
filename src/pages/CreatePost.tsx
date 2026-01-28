import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Image as ImageIcon } from "lucide-react";

export default function CreatePost() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const previewUrl = useMemo(() => {
    if (!imageFile) return null;
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  const canPublish = title.trim().length > 0 && text.trim().length > 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("CREATE POST (mock)", { title, text, imageFile });
    navigate("/home");
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
          <h1 className="text-2xl md:text-3xl font-bold">Create a post</h1>

          <button
            onClick={() => navigate("/home")}
            className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Back
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 md:p-8 shadow-2xl"
        >
          <label className="block text-sm font-semibold mb-2">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="E.g. Underrated sci-fi movies…"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-white/50 focus:ring-2 focus:ring-primary/60"
          />

          <label className="block text-sm font-semibold mt-5 mb-2">
            Content
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your post…"
            className="w-full min-h-[140px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none placeholder:text-white/50 focus:ring-2 focus:ring-primary/60"
          />

          <div className="mt-5">
            <label className="block text-sm font-semibold mb-2">
              Image (optional)
            </label>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white hover:file:bg-white/15"
              />

              <div className="mt-4">
                {previewUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <img
                      src={previewUrl}
                      alt="preview"
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
              onClick={() => {
                setTitle("");
                setText("");
                setImageFile(null);
              }}
              className="rounded-2xl bg-white/10 border border-white/10 px-5 py-2 text-sm hover:bg-white/15"
            >
              Clear
            </button>

            <button
              type="submit"
              disabled={!canPublish}
              className="rounded-2xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Publish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
