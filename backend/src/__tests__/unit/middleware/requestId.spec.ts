import express, { Request, Response } from "express";
import request from "supertest";

jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-uuid-1234")
}));

import requestId from "../../../middleware/requestId";

const makeApp = () => {
  const app = express();
  app.use(requestId);
  app.get("/", (req: Request, res: Response) =>
    res.json({ id: req.id })
  );
  return app;
};

describe("requestId middleware", () => {
  it("should generate a UUID when no X-Request-Id header is sent", async () => {
    const app = makeApp();
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("test-uuid-1234");
    expect(res.headers["x-request-id"]).toBe("test-uuid-1234");
  });

  it("should reuse X-Request-Id header from the client", async () => {
    const app = makeApp();
    const res = await request(app)
      .get("/")
      .set("X-Request-Id", "client-req-abc");
    expect(res.body.id).toBe("client-req-abc");
    expect(res.headers["x-request-id"]).toBe("client-req-abc");
  });

  it("should set req.id on the request object", async () => {
    const app = makeApp();
    const res = await request(app).get("/");
    expect(res.body.id).toBeDefined();
    expect(typeof res.body.id).toBe("string");
  });
});
