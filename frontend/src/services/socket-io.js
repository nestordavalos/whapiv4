import openSocket from "socket.io-client";
import jwtDecode from "jwt-decode";
import { getBackendUrl } from "../config";

function connectToSocket() {
  const stored = localStorage.getItem("token");
  if (!stored) return null;

  let token;
  try {
    token = JSON.parse(stored);
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
    transports: ["websocket", "polling", "flashsocket"],
    query: { token },
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  socket.on("connect_error", err => {
    if (err.message === "ERR_SESSION_EXPIRED") {
      localStorage.removeItem("token");
    }
  });

  return socket;
}

export default connectToSocket;