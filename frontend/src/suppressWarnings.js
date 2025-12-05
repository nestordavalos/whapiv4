// Suppress non-critical console warnings
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  const message = args[0]?.toString() || '';
  
  // Suppress specific warnings
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

console.error = (...args) => {
  const message = args[0]?.toString() || '';
  
  // Suppress specific errors that are actually warnings
  const suppressedErrors = [
    'aria-hidden',
    'Blocked aria-hidden',
    'pps.whatsapp.net',
    '403 (Forbidden)',
    'Failed to load resource'
  ];
  
  if (suppressedErrors.some(error => message.includes(error))) {
    return;
  }
  
  originalError.apply(console, args);
};

// Suppress image loading errors from WhatsApp CDN
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
