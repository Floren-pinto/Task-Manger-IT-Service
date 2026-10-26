import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useUnreadNotificationCount } from "../../hooks/useUnreadNotificationCount";
import { NotificationMenu } from "./NotificationMenu";

const bellVariants = {
  sidebar:
    "text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:ring-sky-400/60",
  header: "text-slate-500 hover:bg-slate-100 focus-visible:ring-sky-100",
};

function formatBadge(count) {
  return count > 99 ? "99+" : String(count);
}

export function NotificationBell({ variant = "sidebar" }) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const { unreadCount, setUnreadCount } = useUnreadNotificationCount();

  const closeMenu = useCallback(({ restoreFocus = true } = {}) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    menuRef.current?.focus();

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        closeMenu({ restoreFocus: false });
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, open]);

  const handleUnreadDelta = useCallback(
    (delta) => setUnreadCount((count) => Math.max(0, count + delta)),
    [setUnreadCount],
  );

  const handleMarkedAllRead = useCallback(
    () => setUnreadCount(0),
    [setUnreadCount],
  );

  const ariaLabel =
    unreadCount > 0
      ? `Notifikasi, ${unreadCount} belum dibaca`
      : "Notifikasi, tidak ada yang belum dibaca";

  return (
    <div
      ref={containerRef}
      className={variant === "sidebar" ? "relative" : undefined}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? closeMenu() : setOpen(true))}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={`relative rounded-lg p-2 transition focus:outline-none focus-visible:ring-2 ${bellVariants[variant]}`}
      >
        <Bell className={variant === "sidebar" ? "h-4 w-4" : "h-5 w-5"} />
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white"
            aria-hidden="true"
          >
            {formatBadge(unreadCount)}
          </span>
        )}
      </button>

      {open && (
        <NotificationMenu
          id={menuId}
          menuRef={menuRef}
          placement={variant}
          unreadCount={unreadCount}
          onUnreadDelta={handleUnreadDelta}
          onMarkedAllRead={handleMarkedAllRead}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
