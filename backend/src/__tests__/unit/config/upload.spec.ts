import path from "path";

/**
 * Upload config tests – verifies MIME whitelist, fileFilter and filename
 * generation logic without actually writing to disk.
 */
import uploadConfig from "../../../config/upload";

describe("upload config", () => {
  describe("filename generation", () => {
    const storage = uploadConfig.storage as any;
    // multer diskStorage stores _handleFile + getFilename internally
    // but the public API gives us a way to call the filename function
    const getFilename = (
      originalname: string,
      mimetype: string
    ): Promise<string> =>
      new Promise((resolve, reject) => {
        storage.getFilename(
          {} as any,
          { originalname, mimetype } as any,
          (err: Error | null, name: string) => {
            if (err) return reject(err);
            resolve(name);
          }
        );
      });

    it("should use the original file extension for .docx", async () => {
      const name = await getFilename(
        "report.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      expect(name).toMatch(/^\d+\.docx$/);
    });

    it("should use the original file extension for .png", async () => {
      const name = await getFilename("photo.png", "image/png");
      expect(name).toMatch(/^\d+\.png$/);
    });

    it("should use the original file extension for .xlsx", async () => {
      const name = await getFilename(
        "data.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      expect(name).toMatch(/^\d+\.xlsx$/);
    });

    it("should fall back to mimetype when no extension in original name", async () => {
      const name = await getFilename("noextfile", "image/jpeg");
      expect(name).toMatch(/^\d+\.jpeg$/);
    });

    it("should produce a timestamp-based filename", async () => {
      const before = Date.now();
      const name = await getFilename("file.pdf", "application/pdf");
      const after = Date.now();
      const ts = parseInt(name.split(".")[0], 10);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });

  describe("fileFilter", () => {
    const fileFilter = uploadConfig.fileFilter as any;

    const callFilter = (mimetype: string): Promise<boolean> =>
      new Promise((resolve, reject) => {
        fileFilter(
          {} as any,
          { mimetype } as any,
          (err: Error | null, accepted: boolean) => {
            if (err) return reject(err);
            resolve(accepted);
          }
        );
      });

    it("should accept image/jpeg", async () => {
      const accepted = await callFilter("image/jpeg");
      expect(accepted).toBe(true);
    });

    it("should accept application/pdf", async () => {
      const accepted = await callFilter("application/pdf");
      expect(accepted).toBe(true);
    });

    it("should accept text/csv", async () => {
      const accepted = await callFilter("text/csv");
      expect(accepted).toBe(true);
    });

    it("should reject application/javascript", async () => {
      await expect(callFilter("application/javascript")).rejects.toThrow(
        /not allowed/
      );
    });

    it("should reject text/html", async () => {
      await expect(callFilter("text/html")).rejects.toThrow(/not allowed/);
    });
  });

  describe("limits", () => {
    it("should set fileSize limit to 50MB", () => {
      expect(uploadConfig.limits?.fileSize).toBe(50 * 1024 * 1024);
    });

    it("should allow max 10 files per request", () => {
      expect(uploadConfig.limits?.files).toBe(10);
    });
  });

  describe("directory", () => {
    it("should resolve to the public folder", () => {
      expect(uploadConfig.directory).toContain("public");
      expect(path.isAbsolute(uploadConfig.directory)).toBe(true);
    });
  });
});
