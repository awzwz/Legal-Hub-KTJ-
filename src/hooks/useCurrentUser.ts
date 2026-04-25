import { useState, useEffect, useCallback } from "react";
import { currentUser, setCurrentUser, availableUsers, type User } from "@/data/mockData";

const USER_STORAGE_KEY = "court_flow_current_user";
const USER_CHANGE_EVENT = "userchange";

// Get user from storage
const getStoredUser = (): User => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const user = availableUsers.find(u => u.id === parsed.id);
      if (user) return user;
    }
  }
  return availableUsers[0];
};

// Hook to manage current user with React state
export const useCurrentUser = () => {
  const [user, setUser] = useState<User>(getStoredUser);

  const switchUser = useCallback((userId: string) => {
    setCurrentUser(userId);
    setUser(getStoredUser());
    // Dispatch custom event to notify all components
    window.dispatchEvent(new CustomEvent(USER_CHANGE_EVENT, { detail: userId }));
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      setUser(getStoredUser());
    };

    const handleUserChange = () => {
      setUser(getStoredUser());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(USER_CHANGE_EVENT, handleUserChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(USER_CHANGE_EVENT, handleUserChange);
    };
  }, []);

  return { user, switchUser };
};
