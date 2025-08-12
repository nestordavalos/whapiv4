import openSocket from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import { getBackendUrl } from "../config";

let socket;

function connectToSocket() {
  if (socket && socket.connected) {
    return socket;
  }

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

  socket = openSocket(getBackendUrl(), {
    transports: ["websocket"],
    query: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    forceNew: false,
    timeout: 10000
  });

  socket.on("connect_error", error => {
    if (
      error.message.includes("jwt expired") ||
      error.message.includes("invalid token") ||
      error.message.includes("jwt malformed")
    ) {
      socket.disconnect();
      localStorage.removeItem("token");
      window.location.reload();
    }
  });

  return socket;
}

export default connectToSocket;