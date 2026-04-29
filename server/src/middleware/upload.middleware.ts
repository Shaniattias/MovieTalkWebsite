import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOADS_ROOT = path.join(__dirname, "../../uploads");
const PROFILE_UPLOADS_DIR = path.join(UPLOADS_ROOT, "profile-images");
const POST_UPLOADS_DIR = path.join(UPLOADS_ROOT, "post-images");

for (const dir of [UPLOADS_ROOT, PROFILE_UPLOADS_DIR, POST_UPLOADS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function makeDiskStorage(targetDir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, targetDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
      const unique = `${Date.now()}-${safeName}${ext}`;
      cb(null, unique);
    },
  });
}

const imageStorageProfile = makeDiskStorage(PROFILE_UPLOADS_DIR);
const imageStoragePost = makeDiskStorage(POST_UPLOADS_DIR);

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = (file.mimetype || "").toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIME_TYPES.has(mimeType)) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpg, .jpeg, and .png images are allowed"));
  }
};

// File size limit set to 10MB for safe, scalable uploads
const UPLOAD_LIMITS = { 
  fileSize: 10 * 1024 * 1024, // 10MB
  files: 1, // Only allow single file upload per request
};

export const uploadProfileImage = multer({
  storage: imageStorageProfile,
  fileFilter,
  limits: UPLOAD_LIMITS,
});

export const uploadPostImage = multer({
  storage: imageStoragePost,
  fileFilter,
  limits: UPLOAD_LIMITS,
});
