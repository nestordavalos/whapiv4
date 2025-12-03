import axios from "axios";
import { writeFile } from "fs/promises";
import mime from "mime-types";
import { extname, join } from "path";

export const downloadFiles = async (url: string) => {
  try {
    const { data } = await axios.get(url, { responseType: "arraybuffer" });

    const type = url.split("?")[0].split(".").pop();
    const filename = `${new Date().getTime()}.${type}`;

    const filePath = join(__dirname, "..", "..", "public", filename);
    await writeFile(filePath, data, "base64");

    const mimeType = mime.lookup(filePath);
    const extension = extname(filePath);
    const originalname = url.split("/").pop();

    return {
      mimeType,
      extension,
      filename,
      data,
      originalname
    };
  } catch (error) {
    console.error("Erro ao processar a requisição:", error);
    throw error;
  }
};
