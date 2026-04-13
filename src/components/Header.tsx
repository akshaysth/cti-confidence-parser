import { ShieldAlert, History, Settings } from 'lucide-react';
import { Button } from './ui/button';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export function Header({ onOpenSettings, onOpenHistory }: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-8 py-4 shrink-0"
      style={{
        background: 'linear-gradient(135deg, #041627 0%, #1a2b3c 100%)',
      }}
    >
      <div className="flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-secondary" />
        <div>
          <h1 className="font-sans font-bold text-base tracking-tight text-white">
            CTI Confidence Parser
          </h1>
          <p className="font-meta text-xs text-white/40 mt-0.5">
            Sherman Kent · Words of Estimative Language
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenHistory}
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          <History className="w-4 h-4" />
          History
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSettings}
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          <Settings className="w-4 h-4" />
          Model
        </Button>
      </div>
    </header>
  );
}
