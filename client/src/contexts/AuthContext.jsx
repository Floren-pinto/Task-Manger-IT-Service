import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Mock initial state for learning and testing routing
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("it_service_user");
    return saved
      ? JSON.parse(saved)
      : {
          id: "user-1",
          name: "Sarah Jenkins",
          role: "manager",
          roleTitle: "Service Lead",
          email: "sarah.jenkins@itops.local",
          avatar:
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
        };
  });

  const login = () => {
    const newUser = {
      id: "user-1",
      name: "Sarah Jenkins",
      role: "manager",
      roleTitle: "Service Lead",
      email: "sarah.jenkins@itops.local",
      avatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
    };
    setUser(newUser);
    localStorage.setItem("it_service_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("it_service_user");
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, logout }}
    >
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
