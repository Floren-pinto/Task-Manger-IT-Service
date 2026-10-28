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

const EMPTY_PROFILE_LOAD = { userId: null, promise: null };

function profileErrorMessage(error) {
  const status = error?.response?.status;
  if (status === 403) return "Akun Anda tidak aktif. Hubungi administrator.";
  if (status === 404) {
    return "Profil akun tidak ditemukan. Hubungi administrator.";
  }
  return "Gagal memuat profil pengguna. Silakan coba lagi.";
}

// 403 (akun nonaktif) dan 404 (profil tidak ada) berarti server menolak akun ini.
function isRejectedProfile(error) {
  const status = error?.response?.status;
  return status === 403 || status === 404;
}

function signInErrorMessage(error) {
  if (error?.code === "invalid_credentials" || error?.status === 400) {
    return "Email atau password salah.";
  }
  return "Gagal masuk. Silakan coba lagi.";
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  // true sampai sesi awal DAN profilnya selesai dimuat.
  const [loading, setLoading] = useState(true);
  // Profil yang sedang/sudah dimuat, agar /auth/me tidak dipanggil berulang
  // untuk user yang sama (init, event SIGNED_IN, TOKEN_REFRESHED, dst.).
  const profileLoad = useRef(EMPTY_PROFILE_LOAD);

  // Mengembalikan { profile, error }. Bila server menolak akun (403/404), sesi
  // Supabase ikut diakhiri agar user tidak terjebak di dashboard tanpa profil.
  const loadProfile = useCallback((currentSession) => {
    const userId = currentSession?.user?.id ?? null;

    if (!userId) {
      profileLoad.current = EMPTY_PROFILE_LOAD;
      setUserProfile(null);
      return Promise.resolve({ profile: null, error: null });
    }

    if (profileLoad.current.userId === userId && profileLoad.current.promise) {
      return profileLoad.current.promise;
    }

    const promise = (async () => {
      try {
        const profile = await getUserProfile();
        if (profileLoad.current.promise === promise) setUserProfile(profile);
        return { profile, error: null };
      } catch (error) {
        if (profileLoad.current.promise === promise) {
          console.error("User profile fetch error:", error);
          profileLoad.current = EMPTY_PROFILE_LOAD;
          setUserProfile(null);
        }
        if (isRejectedProfile(error)) {
          await signOutService();
          setSession(null);
        }
        return { profile: null, error: profileErrorMessage(error) };
      }
    })();

    profileLoad.current = { userId, promise };
    return promise;
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const { data, error } = await getSession();
      if (!mounted) return;

      if (error) console.error("Session verification error:", error);
      const currentSession = error ? null : data.session;

      setSession(currentSession);
      await loadProfile(currentSession);
      if (mounted) setLoading(false);
    };

    initializeAuth();

    const { data } = onAuthStateChange((event, newSession) => {
      // INITIAL_SESSION sudah ditangani initializeAuth.
      if (!mounted || event === "INITIAL_SESSION") return;

      setSession(newSession);

      if (!newSession) {
        profileLoad.current = EMPTY_PROFILE_LOAD;
        setUserProfile(null);
        return;
      }

      // Supabase menyarankan tidak memanggil API-nya langsung di dalam callback
      // ini (bisa deadlock); request /auth/me memakai getSession() di interceptor.
      setTimeout(() => {
        if (mounted) void loadProfile(newSession);
      }, 0);
    });

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (email, password) => {
      try {
        const { data, error } = await signInService(email, password);
        if (error) {
          return { success: false, error: { message: signInErrorMessage(error) } };
        }

        setSession(data.session);
        const { error: profileError } = await loadProfile(data.session);
        if (profileError) {
          return { success: false, error: { message: profileError } };
        }

        return { success: true, data };
      } catch (error) {
        console.error("Sign in error:", error);
        return { success: false, error: { message: signInErrorMessage(error) } };
      }
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    try {
      const { error } = await signOutService();
      if (error) throw error;
      profileLoad.current = EMPTY_PROFILE_LOAD;
      setSession(null);
      setUserProfile(null);
      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
      return { success: false, error };
    }
  }, []);

  const value = {
    user: session?.user ?? null,
    userProfile,
    role:
      typeof userProfile?.role === "string"
        ? userProfile.role.toUpperCase()
        : "",
    session,
    loading,
    // Dianggap masuk hanya bila sesi Supabase ada DAN profil diterima server.
    isAuthenticated: Boolean(session && userProfile),
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
