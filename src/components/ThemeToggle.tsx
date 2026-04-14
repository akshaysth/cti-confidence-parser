import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface ThemeToggleProps {
  variant?: 'select';
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ variant = 'select', className, showLabel = true }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && <label className="text-sm font-medium text-foreground">Theme</label>}
      <div className="flex gap-2">
        <Button
          variant={theme === 'light' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTheme('light')}
          className="flex-1 gap-2"
        >
          <Sun className="w-4 h-4" />
          Light
        </Button>
        <Button
          variant={theme === 'dark' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTheme('dark')}
          className="flex-1 gap-2"
        >
          <Moon className="w-4 h-4" />
          Dark
        </Button>
        <Button
          variant={theme === 'system' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTheme('system')}
          className="flex-1 gap-2"
        >
          <Monitor className="w-4 h-4" />
          System
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Current: {resolvedTheme} mode
      </p>
    </div>
  );
}
