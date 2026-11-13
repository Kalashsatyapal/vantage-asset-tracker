import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
    }

    sessionStorage.removeItem("vantage_access_token");
    setUser(null);
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password
    });

    const data = response.data.data;

    sessionStorage.setItem("vantage_access_token", data.accessToken);
    setUser(data.employee);

    return data.employee;
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        let token = sessionStorage.getItem("vantage_access_token");

        if (!token) {
          const response = await api.post("/auth/refresh");
          token = response.data.data.accessToken;
          sessionStorage.setItem("vantage_access_token", token);
        }

        const response = await api.get("/profile/me");
        setUser(response.data.data.employee);
      } catch {
        sessionStorage.removeItem("vantage_access_token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    const handleUnauthorized = () => {
      sessionStorage.removeItem("vantage_access_token");
      setUser(null);
    };

    window.addEventListener("vantage:unauthorized", handleUnauthorized);
    initialize();

    return () => {
      window.removeEventListener("vantage:unauthorized", handleUnauthorized);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}