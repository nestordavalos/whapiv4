import openSocket from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import { getBackendUrl } from "../config";

function connectToSocket() {
  const stored = localStorage.getItem("token");
  if (!stored) return null;

  let token = stored;
  try {
    token = JSON.parse(stored);
  } catch (err) {
    // token may already be a plain string; keep as-is
  }

  try {
    const { exp } = jwtDecode(token);
    if (Date.now() >= exp * 1000) {
      localStorage.removeItem("token");
      return null;
    }
  } catch (err) {
    console.error("Invalid token", err);
    localStorage.removeItem("token");
    return null;
  }

  const socket = openSocket(getBackendUrl(), {
    transports: ["websocket", "polling"],
    query: { token },
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    forceNew: true
  });

  socket.on("connect_error", err => {
    if (err.message === "ERR_SESSION_EXPIRED") {
      localStorage.removeItem("token");
    }
  });

  return socket;
}

export default connectToSocket;