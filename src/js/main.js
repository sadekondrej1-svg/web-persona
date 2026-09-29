// ==========================================================================
// Hlavní klientský skript: Lenis Smooth Scroll & Precision Craft
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // 1. Inicializace Lenis smooth scroll
    // ----------------------------------------------------------------------
    let lenis = null;
    if (typeof Lenis !== 'undefined') {
        lenis = new Lenis({
            duration: 1.15,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // exponenciální plynulé dobrzdění
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 0.95, // citlivost kolečka (ideální vyváženost rychlosti a kontroly)
            touchMultiplier: 1.5,
            smoothTouch: false, // na mobilech zachovat nativní rychlý HW scroll
        });
        window.lenis = lenis;

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        // Plynulý scroll pro kotevní odkazy
        document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (!targetId || targetId === '#' || targetId.length <= 1) return;
                if (targetId === '#hero' || targetId === '#top') {
                    e.preventDefault();
                    lenis.scrollTo(0, {
                        duration: 1.2,
                        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                    });
                    return;
                }
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    lenis.scrollTo(targetElement, {
                        offset: 0,
                        duration: 1.2,
                        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                    });
                }
            });
        });
    }

    // ----------------------------------------------------------------------
    // 2. Interaktivní reflektor na kurzor (Hero ambient spotlight)
    // ----------------------------------------------------------------------
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

    // ----------------------------------------------------------------------
    // 3. Živý hardware status (Děčín lokální čas CET/CEST)
    // ----------------------------------------------------------------------
    function updateLiveTime() {
        const el = document.getElementById('live-time');
        if (!el) return;
        try {
            const now = new Date();
            const timeStr = new Intl.DateTimeFormat('cs-CZ', {
                timeZone: 'Europe/Prague',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(now);
            el.textContent = timeStr;
        } catch (e) {
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            el.textContent = `${hh}:${mm}`;
        }
    }
    updateLiveTime();
    setInterval(updateLiveTime, 60000);

    // ----------------------------------------------------------------------
    // 4. Interaktivní kopírování e-mailové adresy do schránky
    // ----------------------------------------------------------------------
    const copyEmailBtn = document.getElementById('copy-email-btn');
    if (copyEmailBtn) {
        let copyTimeout = null;
        copyEmailBtn.addEventListener('click', async () => {
            const email = copyEmailBtn.getAttribute('data-email') || 'automatizace.sadek@gmail.com';
            let copied = false;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(email);
                    copied = true;
                }
            } catch (e) {
                // Clipboard API denied or not focused, fallback
            }

            if (!copied) {
                try {
                    const textarea = document.createElement('textarea');
                    textarea.value = email;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    copied = true;
                } catch (err) {
                    console.error('Nepodařilo se zkopírovat e-mail do schránky:', err);
                }
            }

            const defaultEl = copyEmailBtn.querySelector('.copy-default');
            const successEl = copyEmailBtn.querySelector('.copy-success');

            if (defaultEl && successEl) {
                defaultEl.classList.add('hidden');
                defaultEl.classList.remove('flex');
                successEl.classList.remove('hidden');
                successEl.classList.add('flex');
                copyEmailBtn.classList.add('copied');

                if (copyTimeout) clearTimeout(copyTimeout);
                copyTimeout = setTimeout(() => {
                    successEl.classList.add('hidden');
                    successEl.classList.remove('flex');
                    defaultEl.classList.remove('hidden');
                    defaultEl.classList.add('flex');
                    copyEmailBtn.classList.remove('copied');
                    copyTimeout = null;
                }, 1500);
            }
        });
    }
});

