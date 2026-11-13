import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("vantage_access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;

      try {
        refreshing ??= api.post("/auth/refresh");

        const response = await refreshing;
        const token = response.data.data.accessToken;

        sessionStorage.setItem("vantage_access_token", token);
        originalRequest.headers.Authorization = `Bearer ${token}`;

        return api(originalRequest);
      } catch (refreshError) {
        sessionStorage.removeItem("vantage_access_token");
        window.dispatchEvent(new Event("vantage:unauthorized"));
        return Promise.reject(refreshError);
      } finally {
        refreshing = null;
      }
    }

    return Promise.reject(error);
  }
);

export default api;