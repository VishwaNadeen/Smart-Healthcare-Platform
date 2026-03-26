import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentUser,
  loginAdmin,
  type AuthUser,
} from "../services/authApi";

const AUTH_STORAGE_KEY = "admin_auth";

type AuthState = {
  token: string;
  user: AuthUser;
};

type AuthContextValue = {
  auth: AuthState | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredAuth(): AuthState | null {
  const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedAuth) {
    return null;
  }

  try {
    return JSON.parse(storedAuth) as AuthState;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const storedAuth = readStoredAuth();

      if (!storedAuth?.token) {
        setIsLoading(false);
        return;
      }

      try {
        const user = await getCurrentUser(storedAuth.token);
        const nextAuth = { token: storedAuth.token, user };
        setAuth(nextAuth);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setAuth(null);
      } finally {
        setIsLoading(false);
      }
    }

    void restoreSession();
  }, []);

  async function login(email: string, password: string) {
    const result = await loginAdmin(email, password);
    const nextAuth = {
      token: result.token,
      user: {
        id: result.id,
        username: result.username,
        email: result.email,
        role: result.role,
      },
    };

    setAuth(nextAuth);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth(null);
  }

  return (
    <AuthContext.Provider value={{ auth, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
