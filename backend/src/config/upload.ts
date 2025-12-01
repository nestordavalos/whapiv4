import path from "path";
import multer from "multer";
import crypto from "crypto";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

// Tipos MIME permitidos
const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/mpeg",
  "video/webm",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/plain"
];

export default {
  directory: publicFolder,

  storage: multer.diskStorage({
    destination: publicFolder,
    filename(req, file, cb) {
      // Extraer extensión del mimetype de forma segura
      const mimeTypeParts = file.mimetype.split("/");
      const ext = mimeTypeParts[1] ? mimeTypeParts[1].split(";")[0] : "bin";

      // Generar nombre único usando timestamp + hash aleatorio para evitar colisiones
      const timestamp = new Date().getTime();
      const randomHash = crypto.randomBytes(8).toString("hex");
      const fileName = `${timestamp}-${randomHash}.${ext}`;

      return cb(null, fileName);
    }
  }),

  // Límite de tamaño: 20MB por archivo
  limits: {
    fileSize: 20 * 1024 * 1024
  },

  // Filtro de tipos de archivo permitidos
  fileFilter: (
    req: any,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
    }
  }
};
