import openSocket from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import { getBackendUrl } from "../config";

let socket;

function connectToSocket() {
  // Keep one socket for the whole application, including while its initial
  // WebSocket handshake/reconnection is in progress. Replacing a connecting
  // socket makes room subscriptions (joinChatBox/joinTickets) race and drops
  // real-time appMessage events.
  if (socket) {
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
    localStorage.removeItem("token");
    return null;
  }

  socket = openSocket(getBackendUrl(), {
    transports: ["websocket"],
    query: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
    reconnectionAttempts: Infinity,
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

  socket.on("session:expired", () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  });

  return socket;
}

export default connectToSocket;
