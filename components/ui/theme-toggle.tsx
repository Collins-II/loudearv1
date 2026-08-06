"use client";

import { useEffect, useState } from "react";
import { TbSunMoon } from "react-icons/tb";

export default function ThemeToggle({
  scrolled,
}: {
  scrolled: boolean;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Load saved theme
  useEffect(() => {
    const savedTheme =
      (localStorage.getItem("theme") as "light" | "dark") || "light";

    setTheme(savedTheme);

    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";

    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <button
      aria-label="toggle-theme"
      onClick={toggleTheme}
      className={`p-2 rounded-full transition ${
        scrolled
          ? "bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-white"
          : "bg-white/20 text-white"
      } hover:scale-105`}
    >
      <TbSunMoon size={18} />
    </button>
  );
}