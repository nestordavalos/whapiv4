import path from "path";
import multer from "multer";

const publicFolder = path.resolve(__dirname, "..", "..", "public");
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
  })
};
