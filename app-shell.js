// Prevent page zoom on iOS while preserving single-finger swipe, scroll and controls.
(function () {
    'use strict';
    function cancel(event) { if (event.cancelable) event.preventDefault(); }

    // WebKit's proprietary pinch gesture events.
    for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
        document.addEventListener(type, cancel, { passive: false, capture: true });
    }

    // Prevent pinch at its start; also handle browsers that emit only touchmove.
    document.addEventListener('touchstart', event => {
        if (event.touches.length > 1) cancel(event);
    }, { passive: false, capture: true });
    document.addEventListener('touchmove', event => {
        if (event.touches.length > 1) cancel(event);
    }, { passive: false, capture: true });

    // Prevent double-tap page zoom, without blocking ordinary single taps,
    // text inputs, accessibility controls, or long-press secret settings.
    document.addEventListener('dblclick', event => {
        if (!event.target.closest('input, textarea, select, [contenteditable="true"]')) cancel(event);
    }, { passive: false, capture: true });

    if ('serviceWorker' in navigator && window.isSecureContext) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
                .then(registration => registration.update())
                .catch(error => console.warn('Offline setup unavailable:', error));
        });
    }
})();
