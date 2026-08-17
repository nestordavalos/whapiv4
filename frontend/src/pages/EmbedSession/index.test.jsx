import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmbedSession from ".";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";

vi.mock("../../services/api", () => ({
  default: { post: vi.fn() }
}));

vi.mock("../../config", () => ({
  getBackendUrl: () => "https://api.example.com"
}));

describe("EmbedSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exchanges credentials only when they come from the backend shell", async () => {
    const handleEmbedLogin = vi.fn();
    api.post.mockResolvedValue({
      data: { token: "access-token", user: { id: 7 }, next: "/tickets/12" }
    });

    render(
      <AuthContext.Provider value={{ handleEmbedLogin }}>
        <MemoryRouter initialEntries={["/embed/session/public-id"]}>
          <Route path="/embed/session/:publicId">
            <EmbedSession />
          </Route>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent(
      window,
      new MessageEvent("message", {
        origin: "https://untrusted.example.com",
        source: window,
        data: { type: "WHAPI_EMBED_AUTH", token: "bad" }
      })
    );
    expect(api.post).not.toHaveBeenCalled();

    fireEvent(
      window,
      new MessageEvent("message", {
        origin: "https://api.example.com",
        source: window,
        data: {
          type: "WHAPI_EMBED_AUTH",
          token: "embed-token",
          parentOrigin: "https://portal.example.com",
          next: "/tickets/12"
        }
      })
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/embed-integrations/public-id/exchange",
        {
          token: "embed-token",
          parentOrigin: "https://portal.example.com",
          next: "/tickets/12"
        }
      );
      expect(handleEmbedLogin).toHaveBeenCalledWith({
        token: "access-token",
        user: { id: 7 },
        next: "/tickets/12"
      });
    });
  });
});
