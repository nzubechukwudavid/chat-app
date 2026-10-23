import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Locks body scroll while an overlay is open, restoring the previous
 * overflow value on unmount. Reference counted so nested overlays (a dialog
 * inside a drawer) do not unlock early.
 */
let lockCount = 0;
let previousOverflow = '';

const useScrollLock = (active) => {
  const locked = useRef(false);

  useEffect(() => {
    if (!active || locked.current) return undefined;

    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;
    locked.current = true;

    return () => {
      locked.current = false;
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) document.body.style.overflow = previousOverflow;
    };
  }, [active]);
};

/**
 * Accessible dialog behaviour: Escape to close, focus trapped inside,
 * focus returned to the trigger on close.
 *
 * Dialogs can nest (a confirm on top of a channel-settings modal), so the
 * handlers only act when their dialog is the top of the stack - otherwise one
 * Escape press would close both layers at once.
 */
const dialogStack = [];

export const useDialog = (open, onClose) => {
  const containerRef = useRef(null);
  const previouslyFocused = useRef(null);
  const onCloseRef = useRef(onClose);

  onCloseRef.current = onClose;

  useScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;

    const token = {};
    dialogStack.push(token);
    previouslyFocused.current = document.activeElement;

    const container = containerRef.current;
    // Prefer an explicit opt-in, then a field (opening a form should land the
    // caret in the first thing the user needs to fill in), then any control.
    const focusTarget =
      container?.querySelector('[data-autofocus]') ||
      container?.querySelector('input:not([disabled]):not([type="hidden"]), textarea, select') ||
      container?.querySelector(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
    focusTarget?.focus();

    const onKeyDown = (event) => {
      if (dialogStack[dialogStack.length - 1] !== token) return;

      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab' || !container) return;

      const nodes = Array.from(
        container.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => node.offsetParent !== null);

      if (!nodes.length) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);

      const index = dialogStack.indexOf(token);
      if (index >= 0) dialogStack.splice(index, 1);

      const trigger = previouslyFocused.current;
      if (trigger && typeof trigger.focus === 'function') trigger.focus();
    };
  }, [open]);

  return containerRef;
};

/** Boolean media-query hook. */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);

    setMatches(media.matches);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, [query]);

  return matches;
};

/**
 * Copies text to the clipboard with a graceful fallback for insecure
 * contexts (where `navigator.clipboard` is unavailable).
 */
export const useCopyToClipboard = () => {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async (value) => {
    const text = String(value ?? '');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }

      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { copied, copy };
};

export default useDialog;
