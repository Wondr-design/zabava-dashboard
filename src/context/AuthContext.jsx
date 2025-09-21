import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { API_BASE_URL, AUTH_STORAGE_KEY } from "@/lib/config";

const AuthContext = createContext({
  loading: true,
  user: null,
  token: null,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
});

function base64Decode(value) {
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    return window.atob(value);
  }
  if (
    typeof globalThis !== "undefined" &&
    globalThis.Buffer &&
    typeof globalThis.Buffer.from === "function"
  ) {
    return globalThis.Buffer.from(value, "base64").toString("binary");
  }
  throw new Error("No base64 decoder available");
}

function decodeJwt(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      base64Decode(normalized)
        .split("")
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join("")
    );
    return JSON.parse(json);
  } catch (err) {
    console.error("Failed to decode JWT", err);
    return null;
  }
}

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.token) return null;

    const payload = decodeJwt(parsed.token);
    if (!payload?.exp) {
      return parsed;
    }

    const expiresAt = payload.exp * 1000;
    if (Date.now() >= expiresAt) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return { ...parsed, expiresAt };
  } catch (err) {
    console.warn("Failed to parse stored auth", err);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function persistAuth(authState) {
  try {
    if (!authState) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
    }
  } catch (err) {
    console.warn("Unable to persist auth state", err);
  }
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    if (typeof window === "undefined") {
      return { loading: false, token: null, user: null };
    }
    const stored = readStoredAuth();
    if (stored) {
      return { loading: false, token: stored.token, user: stored.user };
    }
    return { loading: false, token: null, user: null };
  });
  const [checkingProfile, setCheckingProfile] = useState(true);

  const setAuthenticatedState = useCallback((payload) => {
    if (!payload || !payload.token || !payload.user) {
      throw new Error("Invalid authentication payload");
    }
    persistAuth({ token: payload.token, user: payload.user });
    setAuthState({ loading: false, token: payload.token, user: payload.user });
    return payload;
  }, []);

  useEffect(() => {
    async function hydrateFromProfile() {
      if (typeof window === "undefined") {
        setCheckingProfile(false);
        return;
      }
      const stored = readStoredAuth();
      if (!stored?.token) {
        setCheckingProfile(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${stored.token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Profile request failed: ${response.status}`);
        }

        const data = await response.json();
        setAuthenticatedState({ token: stored.token, user: data.user });
      } catch (err) {
        console.warn("Failed to hydrate profile", err);
        persistAuth(null);
        setAuthState({ loading: false, token: null, user: null });
      } finally {
        setCheckingProfile(false);
      }
    }

    hydrateFromProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    persistAuth(null);
    setAuthState({ loading: false, token: null, user: null });
  };

  const login = useCallback(
    async ({ email, password }) => {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let message = "Unable to sign in";
        try {
          const errorPayload = await response.json();
          message = errorPayload.error || message;
        } catch (err) {
          console.warn("login error payload", err);
        }
        throw new Error(message);
      }

      const payload = await response.json();
      return setAuthenticatedState(payload);
    },
    [setAuthenticatedState]
  );

  const signup = useCallback(
    async ({ email, password, token, name }) => {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, token, name }),
      });

      if (!response.ok) {
        let message = "Unable to complete signup";
        try {
          const errorPayload = await response.json();
          message = errorPayload.error || message;
        } catch (err) {
          console.warn("signup error payload", err);
        }
        throw new Error(message);
      }

      const payload = await response.json();
      return setAuthenticatedState(payload);
    },
    [setAuthenticatedState]
  );

  const value = useMemo(
    () => ({
      loading: authState.loading || checkingProfile,
      user: authState.user,
      token: authState.token,
      login,
      signup,
      logout,
      isAuthenticated: Boolean(authState.token && authState.user),
    }),
    [
      authState.loading,
      authState.token,
      authState.user,
      checkingProfile,
      login,
      signup,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
