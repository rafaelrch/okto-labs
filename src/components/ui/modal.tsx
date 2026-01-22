import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  autoHeight?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
  '3xl': 'max-w-6xl',
  'full': 'max-w-[90vw]',
};

export function Modal({ isOpen, onClose, title, children, size = 'md', autoHeight = false }: ModalProps) {
  // Bloquear scroll do body quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full bg-card rounded-xl shadow-xl border border-border animate-scale-in flex flex-col',
          autoHeight ? "max-h-[calc(100vh-32px)]" : "max-h-[calc(100vh-32px)]",
          sizeClasses[size]
        )}
      >
        {/* Header fixo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0 gap-4">
          <div className="flex-1 min-w-0">
            {typeof title === 'string' ? (
              <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
            ) : (
              title
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        {/* Conteúdo scrollável */}
        <div className={cn(
          "p-6 overflow-y-auto flex-1",
          autoHeight ? "" : ""
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}
