import axios from "axios";
import { getBackendUrl } from "../config";

const api = axios.create({
  baseURL: getBackendUrl(),
  withCredentials: true,
});

try {
  const storedToken = localStorage.getItem("token");
  if (storedToken) {
    api.defaults.headers.Authorization = `Bearer ${JSON.parse(storedToken)}`;
  }
} catch {
  localStorage.removeItem("token");
}

export default api;
