// Lightweight HTML5 History API router navigation helper

export function navigate(to, options = {}) {
  const replace = typeof options === 'boolean' ? options : !!options.replace;
  const current = window.location.pathname + window.location.search;

  if (to !== current) {
    if (replace) {
      window.history.replaceState({}, '', to);
    } else {
      window.history.pushState({}, '', to);
    }
  }

  // Dispatch popstate event so all routing listeners update synchronously
  window.dispatchEvent(new PopStateEvent('popstate'));

  if (!options.preventScroll) {
    window.scrollTo(0, 0);
  }
}
