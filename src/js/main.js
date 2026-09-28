// Interaktivní radiální světelná čočka (Radial Luminescence) s Intro Scanem a Ambientním Driftem
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('hero-headline-container');
    if (!container) return;

    let isUserActive = false;
    let idleTimer = null;
    let activeAnimId = null;
    let driftStartTime = null;

    function setLens(x, y, opacity = 1) {
        container.style.setProperty('--mouse-x', `${x.toFixed(1)}px`);
        container.style.setProperty('--mouse-y', `${y.toFixed(1)}px`);
        container.style.setProperty('--lens-opacity', opacity.toString());
        if (opacity > 0) {
            container.classList.add('has-active-lens');
        } else {
            container.classList.remove('has-active-lens');
        }
    }

    function stopActiveAnimation() {
        if (activeAnimId) {
            cancelAnimationFrame(activeAnimId);
            activeAnimId = null;
        }
    }

    // 1. Vstupní probuzení (Intro Scan) po načtení
    function runIntroScan() {
        stopActiveAnimation();
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const duration = 1400; // 1.4s scan
        const startX = -60;
        const startY = -30;
        const targetX = rect.width + 60;
        const targetY = rect.height + 30;
        const startTime = performance.now();

        function step(now) {
            if (isUserActive) return; // Uživatel převzal kontrolu

            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing: jemný sinusový náběh a doběh
            const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);
            const currentX = startX + (targetX - startX) * ease;
            const currentY = startY + (targetY - startY) * ease;

            // Opacita: plynulý fade-in a fade-out ke konci
            let opacity = 0.85;
            if (progress < 0.15) {
                opacity = (progress / 0.15) * 0.85;
            } else if (progress > 0.8) {
                opacity = ((1 - progress) / 0.2) * 0.85;
            }

            setLens(currentX, currentY, opacity);

            if (progress < 1) {
                activeAnimId = requestAnimationFrame(step);
            } else {
                setLens(-999, -999, 0);
                activeAnimId = null;
                scheduleIdleDrift(2000);
            }
        }

        activeAnimId = requestAnimationFrame(step);
    }

    // 2. Plynulý ambientní drift (Idle animace po 2s neaktivity)
    function startAmbientDrift() {
        if (isUserActive) return;
        stopActiveAnimation();

        driftStartTime = performance.now();

        function driftStep(now) {
            if (isUserActive) return;

            const rect = container.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                const elapsed = (now - driftStartTime) * 0.001; // v sekundách
                // 8sekundová táhlá sinusová smyčka pokrývající všechny 3 řádky
                const t1 = (elapsed * 2 * Math.PI) / 8.0;
                const t2 = (elapsed * 2 * Math.PI) / 6.0;

                const normX = 0.5 + 0.38 * Math.sin(t1);
                const normY = 0.5 + 0.32 * Math.sin(t2);

                const x = normX * rect.width;
                const y = normY * rect.height;

                // Jemný ambientní jas (cca 0.65)
                setLens(x, y, 0.65);
            }

            activeAnimId = requestAnimationFrame(driftStep);
        }

        activeAnimId = requestAnimationFrame(driftStep);
    }

    function scheduleIdleDrift(delay = 2000) {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            if (!isUserActive) {
                startAmbientDrift();
            }
        }, delay);
    }

    // 3. Obsluha interakcí (kurzor i mobilní dotyky)
    function handlePointerInteraction(clientX, clientY) {
        isUserActive = true;
        stopActiveAnimation();
        if (idleTimer) clearTimeout(idleTimer);

        const rect = container.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        setLens(x, y, 1.0);
    }

    function handlePointerRelease() {
        isUserActive = false;
        scheduleIdleDrift(2000);
    }

    // Pointer events (Desktop myš & stylus)
    container.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'touch') {
            handlePointerInteraction(e.clientX, e.clientY);
        }
    });

    container.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'touch') {
            handlePointerInteraction(e.clientX, e.clientY);
        }
    });

    container.addEventListener('pointerleave', () => {
        handlePointerRelease();
    });

    // Touch events (Explicitní podpora dotykových displejů a telefonů)
    container.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) {
            handlePointerInteraction(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches.length > 0) {
            handlePointerInteraction(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    container.addEventListener('touchend', () => {
        handlePointerRelease();
    }, { passive: true });

    container.addEventListener('touchcancel', () => {
        handlePointerRelease();
    }, { passive: true });

    // Spuštění Intro Scanu krátce po načtení (300ms prodleva pro ustálení layoutu)
    setTimeout(() => {
        runIntroScan();
    }, 300);
});
