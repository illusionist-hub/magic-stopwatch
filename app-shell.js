// iOS Safari / standalone PWA: prevent accidental page zoom without interfering
// with the one-finger horizontal swipe used by the stopwatch.
(function () {
    'use strict';
    const cancel = event => event.preventDefault();
    document.addEventListener('gesturestart', cancel, { passive: false });
    document.addEventListener('gesturechange', cancel, { passive: false });
    document.addEventListener('gestureend', cancel, { passive: false });
    document.addEventListener('touchmove', event => {
        if (event.touches.length > 1) event.preventDefault();
    }, { passive: false });
    // Only register in secure contexts (GitHub Pages HTTPS).
    if ('serviceWorker' in navigator && window.isSecureContext) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js', { scope: './' })
                .catch(error => console.warn('Offline setup unavailable:', error));
        });
    }
})();
