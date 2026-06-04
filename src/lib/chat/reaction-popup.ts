export function isOutsideReactionPopup(container: HTMLElement | null, target: EventTarget | null) {
  if (!container || !target) return false;

  return !container.contains(target as Node);
}
