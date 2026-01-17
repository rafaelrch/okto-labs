import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Check, CheckCircle2, Circle, Clock } from "lucide-react";

export type TaskStatus = "pending" | "in_progress" | "completed";

interface TaskStatusMenuProps {
  open: boolean;
  anchorRect: DOMRect | null;
  currentStatus: TaskStatus;
  onSelect: (status: TaskStatus) => void;
  onClose: () => void;
}

export function TaskStatusMenu({
  open,
  anchorRect,
  currentStatus,
  onSelect,
  onClose,
}: TaskStatusMenuProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    // Close on scroll/resize to avoid mispositioning
    const onAnyScroll = () => onClose();
    const onResize = () => onClose();

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onAnyScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onAnyScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, onClose]);

  const position = useMemo(() => {
    if (!anchorRect) return null;
    const menuWidth = 208; // ~w-52
    const padding = 8;
    const maxLeft = Math.max(padding, window.innerWidth - menuWidth - padding);

    const left = Math.min(Math.max(anchorRect.left, padding), maxLeft);
    const top = anchorRect.bottom + 8;

    return { left, top, width: menuWidth };
  }, [anchorRect]);

  if (!open || !anchorRect || !position) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        className="fixed z-[9999] bg-popover border border-border rounded-lg shadow-xl py-1"
        style={{ left: position.left, top: position.top, width: position.width }}
        role="menu"
      >
        <button
          onClick={() => onSelect("pending")}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-popover-foreground hover:bg-muted transition-colors"
          role="menuitem"
        >
          <div className="flex items-center gap-2">
            <Circle className="w-4 h-4 text-muted-foreground" />
            A FAZER
          </div>
          {currentStatus === "pending" && <Check className="w-4 h-4 text-primary" />}
        </button>

        <button
          onClick={() => onSelect("in_progress")}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-popover-foreground hover:bg-muted transition-colors"
          role="menuitem"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            EM ANDAMENTO
          </div>
          {currentStatus === "in_progress" && <Check className="w-4 h-4 text-primary" />}
        </button>

        <button
          onClick={() => onSelect("completed")}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-popover-foreground hover:bg-muted transition-colors"
          role="menuitem"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            CONCLUÍDA
          </div>
          {currentStatus === "completed" && <Check className="w-4 h-4 text-primary" />}
        </button>
      </div>
    </>,
    document.body
  );
}
