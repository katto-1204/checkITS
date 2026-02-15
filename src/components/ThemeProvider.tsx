import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark", toggleTheme: () => { } });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("checkits-theme");
      // Migrate legacy "neon" to "dark" or just validate
      if (stored === "light" || stored === "dark") {
        return stored;
      }
      return "dark"; // Default
    }
    return "dark";
  });

  useEffect(() => {
    localStorage.setItem("checkits-theme", theme);
    document.documentElement.classList.remove("dark", "light", "neon"); // Clean up legacy
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
