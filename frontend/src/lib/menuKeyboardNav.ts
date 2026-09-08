// Shared by every header dropdown popover (UserMenu, Header's account menu,
// Wishlist/Compare/Cart dropdowns) — each already has its own click-outside
// useEffect; call this from a second effect (guarded the same way, `if
// (!open) return`) to also get Escape-to-close, since a dismissible popover
// (WAI-ARIA "Dismissible" pattern) is expected to close on Escape regardless
// of whether it has full menu semantics. `arrowNav: true` additionally wires
// ArrowUp/ArrowDown/Home/End across the container's `[role="menuitem"]`
// children and moves focus there on open — only correct for UserMenu/
// Header's account menu, which are genuine command lists with real
// role="menuitem" items; the three preview-style dropdowns (Wishlist/
// Compare/Cart) mix links, images, and a remove button under one
// role="menu" with no role="menuitem" children, so forcing menu-item
// keyboard semantics onto them would be the wrong fit — they pass
// `arrowNav: false` and get Escape-only handling instead.
export function attachMenuKeyboardNav(
  container: HTMLElement,
  onClose: () => void,
  options?: { triggerEl?: HTMLElement | null; arrowNav?: boolean },
): () => void {
  const arrowNav = options?.arrowNav ?? true;

  function menuItems(): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter(
      (el) => !el.hasAttribute("disabled"),
    );
  }

  if (arrowNav) {
    menuItems()[0]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      options?.triggerEl?.focus();
      return;
    }

    if (!arrowNav) return;
    const items = menuItems();
    if (items.length === 0) return;
    const activeIndex = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[activeIndex === -1 ? 0 : (activeIndex + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[activeIndex === -1 ? items.length - 1 : (activeIndex - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  }

  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}
