import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  getSession,
  onAuthStateChange,
  signInService,
  signOutService,
} from "../services/authService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      setLoading(true);
      const { data, error } = await getSession();

      if (!mounted) return;

      if (error) {
        console.error("Session verification error:", error);
        setSession(null);
        setUser(null);
      } else {
        setSession(data.session);
        setUser(data.session?.user || null);
      }

      setLoading(false);
    };

    initializeAuth();

    const { data } = onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user || null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      const { data, error } = await signInService(email, password);
      if (error) throw error;
      setSession(data.session);
      setUser(data.session?.user || null);
      return { success: true, data };
    } catch (error) {
      console.error("Sign in error:", error);
      return { success: false, error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await signOutService();
      if (error) throw error;
      setSession(null);
      setUser(null);
      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    user,
    session,
    loading,
    setLoading,
    isAuthenticated: !!session,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
