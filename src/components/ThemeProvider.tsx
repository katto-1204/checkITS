import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "neon";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark", toggleTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("checkits-theme") as Theme) || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    localStorage.setItem("checkits-theme", theme);
    document.documentElement.classList.remove("dark", "neon");
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "neon" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
