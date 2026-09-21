import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const { theme, toggle } = useThemeStore();

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
      title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-text-muted" />
      ) : (
        <Moon className="w-4 h-4 text-text-muted" />
      )}
    </motion.button>
  );
}
