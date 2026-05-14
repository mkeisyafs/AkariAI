import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  testId?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  testId,
  children,
  size = 'md',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const el = dialogRef.current?.querySelector<HTMLElement>(
        'input, textarea, select, button:not([data-modal-close])',
      );
      el?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        data-testid={testId}
        className={`w-full ${SIZE_CLASSES[size]} surface-card overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] rounded-b-none sm:rounded-b-2xl animate-in-up`}
        style={{
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line-subtle bg-surface-2/80">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-base md:text-lg font-semibold text-white">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs md:text-sm text-ink-secondary">{description}</p>
            )}
          </div>
          <button
            type="button"
            data-modal-close
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-3 hover:text-white transition focus-ring"
            aria-label="Close"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
