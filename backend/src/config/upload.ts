import path from "path";
import multer from "multer";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/mpeg",
  "video/webm",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv"
];

export default {
  directory: publicFolder,

  storage: multer.diskStorage({
    destination: publicFolder,
    filename(req, file, cb) {
      // Extraer extensión del mimetype, igual que lo hace wbotMessageListener
      const ext = file.mimetype.split("/")[1].split(";")[0];
      const fileName = `${new Date().getTime()}.${ext}`;

      return cb(null, fileName);
    }
  }),

  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB límite por archivo
    files: 10 // Máximo 10 archivos por request
  },

  fileFilter: (
    req: any,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  }
};
