import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOADS_ROOT = path.join(__dirname, "../../uploads");
const PROFILE_UPLOADS_DIR = path.join(UPLOADS_ROOT, "profile");
const POST_UPLOADS_DIR = path.join(UPLOADS_ROOT, "posts");

for (const dir of [UPLOADS_ROOT, PROFILE_UPLOADS_DIR, POST_UPLOADS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const destination = req.baseUrl.includes("/auth") ? PROFILE_UPLOADS_DIR : POST_UPLOADS_DIR;
    cb(null, destination);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
    const unique = `${Date.now()}-${safeName}${ext}`;
    cb(null, unique);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
