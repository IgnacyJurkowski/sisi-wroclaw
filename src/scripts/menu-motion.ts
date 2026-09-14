// Enhance native details without changing summary's keyboard/click behavior.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const openCategories = new Map<string, () => void>();

// Homepage category links should arrive with that part of the card readable.
const openLinkedCategory = () => {
  const target = document.getElementById(location.hash.slice(1));
  if (target instanceof HTMLDetailsElement && target.matches('[data-menu-fold]')) {
    openCategories.get(target.id)?.();
    target.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
};
window.addEventListener('hashchange', openLinkedCategory);

document.querySelectorAll<HTMLDetailsElement>('[data-menu-fold]').forEach((fold) => {
  const summary = fold.querySelector<HTMLElement>('summary');
  const body = fold.querySelector<HTMLElement>('.menu-fold-body');
  if (!summary || !body) return;

  let animation: Animation | undefined;
  let expanded = fold.open;

  const settle = () => {
    animation?.cancel();
    animation = undefined;
    fold.open = expanded;
    fold.style.removeProperty('height');
    delete fold.dataset.foldMoving;
    delete fold.dataset.foldExpanded;
    summary.removeAttribute('aria-expanded');
    // A closed native details already removes its contents from focus order.
    body.inert = false;
  };

  if (fold.id) openCategories.set(fold.id, () => {
    expanded = true;
    settle();
  });

  summary.addEventListener('click', (event) => {
    if (event.defaultPrevented) return;
    event.preventDefault();
    const wasMoving = Boolean(animation);
    expanded = wasMoving ? !expanded : !fold.open;
    if (reducedMotion.matches || typeof fold.animate !== 'function') {
      settle();
      return;
    }

    // Capture the rendered height before canceling so a quick second click
    // reverses from the current frame instead of jumping to an endpoint.
    const startHeight = fold.getBoundingClientRect().height;
    animation?.cancel();
    fold.style.height = `${startHeight}px`;
    fold.open = true;
    fold.dataset.foldMoving = '';
    fold.dataset.foldExpanded = String(expanded);
    summary.setAttribute('aria-expanded', String(expanded));
    if (!expanded && body.contains(document.activeElement)) summary.focus();
    body.inert = !expanded;

    const styles = getComputedStyle(fold);
    const borders = parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);
    const closedHeight = summary.getBoundingClientRect().height + borders;
    const endHeight = closedHeight + (expanded ? body.getBoundingClientRect().height : 0);
    const duration = Math.min(240, Math.max(180, Math.abs(endHeight - startHeight) * 0.4));
    const nextAnimation = fold.animate(
      [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
      { duration, easing: 'ease-in-out', fill: 'forwards' },
    );
    animation = nextAnimation;
    nextAnimation.onfinish = () => {
      if (animation === nextAnimation) settle();
    };
  });

  const onMotionChange = () => {
    if (reducedMotion.matches && animation) settle();
  };
  if (typeof reducedMotion.addEventListener === 'function') {
    reducedMotion.addEventListener('change', onMotionChange);
  } else {
    reducedMotion.addListener(onMotionChange);
  }
});

openLinkedCategory();
