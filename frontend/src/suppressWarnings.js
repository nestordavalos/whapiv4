// Suppress non-critical console warnings (MUI/DOM noise only)
const originalWarn = console.warn;

console.warn = (...args) => {
  const message = args[0]?.toString() || '';
  
  // Only suppress known non-actionable MUI/DOM warnings
  const suppressedWarnings = [
    'aria-hidden',
    'Blocked aria-hidden',
    'Forced reflow',
    '[Violation]',
    'MUI: You have provided an out-of-range value',
    '[DOM] Input elements should have autocomplete'
  ];
  
  if (suppressedWarnings.some(warning => message.includes(warning))) {
    return;
  }
  
  originalWarn.apply(console, args);
};

// NOTE: console.error is NOT suppressed — real errors must always be visible
// for debugging, security monitoring, and production issue detection.

// Suppress image loading errors from WhatsApp CDN (expected 403s for expired media)
window.addEventListener('error', function(e) {
  if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'IMAGE')) {
    const src = e.target.src || e.target.href?.baseVal;
    if (src && (src.includes('whatsapp.net') || src.includes('pps.whatsapp'))) {
      e.stopPropagation();
      e.preventDefault();
      return false;
    }
  }
}, true);
