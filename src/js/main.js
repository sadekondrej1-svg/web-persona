// ==========================================================================
// Hlavní klientský skript: Precision Craft Pass
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const hero = document.getElementById('hero');
    if (!hero) return;

    // Interaktivní reflektor na kurzor: pouze pro zařízení s jemným ukazatelem (myš)
    // Na dotykových zařízeních zůstává světlo staticky uprostřed bez JS posluchače
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (hasFinePointer) {
        let rafId = null;

        hero.addEventListener('mousemove', (e) => {
            const rect = hero.getBoundingClientRect();
            const x = Math.round(e.clientX - rect.left);
            const y = Math.round(e.clientY - rect.top);

            if (!rafId) {
                rafId = requestAnimationFrame(() => {
                    hero.style.setProperty('--mouse-x', `${x}px`);
                    hero.style.setProperty('--mouse-y', `${y}px`);
                    rafId = null;
                });
            }
        });

        hero.addEventListener('mouseleave', () => {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            // Návrat do klidového výchozího stavu
            hero.style.removeProperty('--mouse-x');
            hero.style.removeProperty('--mouse-y');
        });
    }
});

