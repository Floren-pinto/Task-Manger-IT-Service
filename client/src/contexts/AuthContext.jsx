import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  getSession,
  getUserProfile,
  onAuthStateChange,
  signInService,
  signOutService,
} from "../services/authService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileRequestId = useRef(0);

  const loadUserProfile = useCallback(async (currentSession) => {
    const requestId = ++profileRequestId.current;
    if (!currentSession) {
      setUserProfile(null);
      return null;
    }

    try {
      const profile = await getUserProfile();
      if (profileRequestId.current === requestId) {
        setUserProfile(profile);
      }
      return profile;
    } catch (error) {
      if (profileRequestId.current === requestId) {
        console.error("User profile fetch error:", error);
        setUserProfile(null);
      }
      return null;
    }
  }, []);

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
        setUserProfile(null);
      } else {
        setSession(data.session);
        setUser(data.session?.user || null);
        await loadUserProfile(data.session);
      }

      setLoading(false);
    };

    initializeAuth();

    const { data } = onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user || null);
      void loadUserProfile(newSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      profileRequestId.current += 1;
      data?.subscription?.unsubscribe();
    };
  }, [loadUserProfile]);

  const signIn = useCallback(
    async (email, password) => {
      try {
        const { data, error } = await signInService(email, password);
        if (error) throw error;
        setSession(data.session);
        setUser(data.session?.user || null);
        await loadUserProfile(data.session);
        return { success: true, data };
      } catch (error) {
        console.error("Sign in error:", error);
        return { success: false, error };
      }
    },
    [loadUserProfile],
  );

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await signOutService();
      if (error) throw error;
      setSession(null);
      setUser(null);
      profileRequestId.current += 1;
      setUserProfile(null);
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
    userProfile,
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
