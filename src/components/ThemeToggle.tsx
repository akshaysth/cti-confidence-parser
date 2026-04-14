import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface ThemeToggleProps {
  variant?: 'select' | 'nav';
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ variant = 'select', className, showLabel = true }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  if (variant === 'nav') {
    // Compact navigation variant - icon-only buttons in a horizontal row
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <button
          onClick={() => setTheme('light')}
          className={cn(
            'p-2 rounded-md transition-all',
            theme === 'light'
              ? 'bg-sidebar-active text-sidebar-text'
              : 'text-sidebar-text-dim hover:text-sidebar-text hover:bg-sidebar-hover'
          )}
          title={`Light theme${theme === 'light' ? ' (active)' : ''}`}
        >
          <Sun className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={cn(
            'p-2 rounded-md transition-all',
            theme === 'dark'
              ? 'bg-sidebar-active text-sidebar-text'
              : 'text-sidebar-text-dim hover:text-sidebar-text hover:bg-sidebar-hover'
          )}
          title={`Dark theme${theme === 'dark' ? ' (active)' : ''}`}
        >
          <Moon className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTheme('system')}
          className={cn(
            'p-2 rounded-md transition-all',
            theme === 'system'
              ? 'bg-sidebar-active text-sidebar-text'
              : 'text-sidebar-text-dim hover:text-sidebar-text hover:bg-sidebar-hover'
          )}
          title={`System theme${theme === 'system' ? ' (active)' : ''}`}
        >
          <Monitor className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Default 'select' variant - buttons with text labels
  return (
    <div className={cn('space-y-2.5', className)}>
      {showLabel && <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Theme</label>}
      <div className="flex gap-2">
        <Button
          variant={theme === 'light' ? 'default' : 'subtle'}
          size="sm"
          onClick={() => setTheme('light')}
          className="flex-1 gap-2 transition-all"
        >
          <Sun className="w-4 h-4" />
          Light
        </Button>
        <Button
          variant={theme === 'dark' ? 'default' : 'subtle'}
          size="sm"
          onClick={() => setTheme('dark')}
          className="flex-1 gap-2 transition-all"
        >
          <Moon className="w-4 h-4" />
          Dark
        </Button>
        <Button
          variant={theme === 'system' ? 'default' : 'subtle'}
          size="sm"
          onClick={() => setTheme('system')}
          className="flex-1 gap-2 transition-all"
        >
          <Monitor className="w-4 h-4" />
          System
        </Button>
      </div>
      <p className="text-xs text-muted-foreground font-meta">
        Active: <span className="font-medium text-foreground capitalize">{resolvedTheme}</span> mode
      </p>
    </div>
  );
}