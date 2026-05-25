import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
}

export default function ThemeToggle({ isDarkMode, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      id="theme-toggle-control"
      type="button"
      className="relative flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-full w-16 h-9 transition-colors cursor-pointer select-none focus:outline-none"
      aria-label="Toggle visual theme"
    >
      {/* Moving Pill highlight */}
      <div
        className={`absolute bg-white dark:bg-indigo-600 w-7 h-7 rounded-full shadow-md transform transition-all duration-300 ease-out flex items-center justify-center ${
          isDarkMode ? 'translate-x-7' : 'translate-x-0'
        }`}
      >
        {isDarkMode ? (
          <Moon size={13} className="text-white" />
        ) : (
          <Sun size={13} className="text-amber-500" />
        )}
      </div>

      <div className="flex justify-between w-full px-2 text-slate-400 pointer-events-none">
        <Sun size={12} className={!isDarkMode ? 'opacity-0' : 'opacity-100'} />
        <Moon size={12} className={isDarkMode ? 'opacity-0' : 'opacity-100'} />
      </div>
    </button>
  );
}
