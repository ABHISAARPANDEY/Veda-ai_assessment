import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const UPLOAD_URL_PREFIX = "/uploads";

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 8) || "";
    const rand = crypto.randomBytes(8).toString("hex");
    cb(null, `${Date.now()}-${rand}${ext.toLowerCase()}`);
  },
});

function imageFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("only image files allowed"));
    return;
  }
  cb(null, true);
}

export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const inMemoryStorage = multer.memoryStorage();

function sourceFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const ok =
    file.mimetype === "application/pdf" ||
    file.mimetype === "text/plain" ||
    file.mimetype === "text/markdown";
  if (!ok) {
    cb(new Error("only PDF or text files allowed"));
    return;
  }
  cb(null, true);
}

export const uploadSourceFile = multer({
  storage: inMemoryStorage,
  fileFilter: sourceFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});
