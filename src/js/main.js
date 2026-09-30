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
    // 3. Interaktivní topologická deformace mřížky (Hero Mesh / Warp Grid)
    // ----------------------------------------------------------------------
    function initHeroWarpGrid() {
        const canvas = document.getElementById('hero-warp-canvas');
        const heroSection = document.getElementById('hero');
        if (!canvas || !heroSection) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        // Fyzikální a geometrické parametry mřížky (dynamicky kalibrované dle viewportu)
        let spacing = 48; // dynamická rozteč: 26px pod 768px, 48px od 768px výše
        let influenceRadius = 320; // velkorysý poloměr gravitační deformace (280–340 px)
        let influenceRadiusSq = influenceRadius * influenceRadius;
        let maxDisplacement = 19; // plynulá špičková výchylka rozprostřená do šířky
        let baseLineWidth = 1.35; // stabilní tloušťka linky pro ostrost na Retina/HiDPI
        const SPRING_TENSION = 0.11; // tuhost elastické sítě pro táhlé zakřivení
        const DAMPING = 0.85; // plynulé tlumení oscilací
        const BASE_STROKE = 'rgba(255, 255, 255, 0.15)'; // zvýšený kontrast linek

        let width = 0;
        let height = 0;
        let cols = 0;
        let rows = 0;
        let offsetX = 0;
        let offsetY = 0;
        let nodes = [];

        let mouseX = -9999;
        let mouseY = -9999;
        let isMouseInside = false;
        let isLoopRunning = false;
        let rafId = null;

        function resizeGrid() {
            const rect = heroSection.getBoundingClientRect();
            width = Math.floor(rect.width);
            height = Math.floor(rect.height);

            if (width <= 0 || height <= 0) return;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Dynamická rozteč: na mobilech (<768px) jemnější a hustší rastr (26px), na desktopu 48px
            const isMobile = width < 768;
            spacing = isMobile ? 26 : 48;
            baseLineWidth = isMobile ? 1.05 : 1.35;
            influenceRadius = isMobile ? 220 : 320; // velkorysý dosah (cca 7 buněk v poloměru)
            influenceRadiusSq = influenceRadius * influenceRadius;
            maxDisplacement = isMobile ? 13 : 19; // mírnější špičková síla rozprostřená do šířky

            // Generování uzlů s přesahy přes okraje plátna
            cols = Math.ceil(width / spacing) + 2;
            rows = Math.ceil(height / spacing) + 2;

            offsetX = (width - (cols - 1) * spacing) / 2;
            offsetY = (height - (rows - 1) * spacing) / 2;

            nodes = new Array(cols * rows);
            for (let r = 0; r < rows; r++) {
                const rowY = offsetY + r * spacing;
                const rowOffset = r * cols;
                for (let c = 0; c < cols; c++) {
                    const colX = offsetX + c * spacing;
                    nodes[rowOffset + c] = {
                        originX: colX,
                        originY: rowY,
                        x: colX,
                        y: rowY,
                        vx: 0,
                        vy: 0
                    };
                }
            }

            renderStatic();
            if (isMouseInside && isFinePointer) {
                startLoop();
            }
        }

        function renderStatic() {
            ctx.clearRect(0, 0, width, height);
            ctx.strokeStyle = BASE_STROKE;
            ctx.lineWidth = baseLineWidth;
            ctx.beginPath();

            // Horizontální linie
            for (let r = 0; r < rows; r++) {
                const rowOffset = r * cols;
                ctx.moveTo(nodes[rowOffset].x, nodes[rowOffset].y);
                for (let c = 1; c < cols; c++) {
                    const node = nodes[rowOffset + c];
                    ctx.lineTo(node.x, node.y);
                }
            }

            // Vertikální linie
            for (let c = 0; c < cols; c++) {
                ctx.moveTo(nodes[c].x, nodes[c].y);
                for (let r = 1; r < rows; r++) {
                    const node = nodes[r * cols + c];
                    ctx.lineTo(node.x, node.y);
                }
            }

            ctx.stroke();
        }

        function updateAndRender() {
            ctx.clearRect(0, 0, width, height);

            let hasMovement = false;

            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];

                let targetX = node.originX;
                let targetY = node.originY;

                if (isMouseInside) {
                    const dx = node.originX - mouseX;
                    const dy = node.originY - mouseY;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < influenceRadiusSq && distSq > 0.01) {
                        const dist = Math.sqrt(distSq);
                        // Hladký kosinový útlum: sametový, táhlý přechod s nulovou derivací na okraji
                        const norm = dist / influenceRadius;
                        const factor = 0.5 * (1 + Math.cos(Math.PI * norm));
                        const displacement = factor * maxDisplacement;
                        targetX += (dx / dist) * displacement;
                        targetY += (dy / dist) * displacement;
                    }
                }

                // Spring & damping dynamika
                const fx = (targetX - node.x) * SPRING_TENSION;
                const fy = (targetY - node.y) * SPRING_TENSION;
                node.vx = (node.vx + fx) * DAMPING;
                node.vy = (node.vy + fy) * DAMPING;
                node.x += node.vx;
                node.y += node.vy;

                // Kontrola klidového stavu (thresholding)
                const diffX = node.x - node.originX;
                const diffY = node.y - node.originY;
                if (
                    Math.abs(node.vx) > 0.01 ||
                    Math.abs(node.vy) > 0.01 ||
                    Math.abs(diffX) > 0.05 ||
                    Math.abs(diffY) > 0.05
                ) {
                    hasMovement = true;
                } else if (!isMouseInside) {
                    // Dokonalé ustálení do geometrické nuly
                    node.x = node.originX;
                    node.y = node.originY;
                    node.vx = 0;
                    node.vy = 0;
                }
            }

            // 1. Základní vykreslení mřížky se zvýšeným kontrastem
            ctx.strokeStyle = BASE_STROKE;
            ctx.lineWidth = baseLineWidth;
            ctx.beginPath();

            for (let r = 0; r < rows; r++) {
                const rowOffset = r * cols;
                ctx.moveTo(nodes[rowOffset].x, nodes[rowOffset].y);
                for (let c = 1; c < cols; c++) {
                    const node = nodes[rowOffset + c];
                    ctx.lineTo(node.x, node.y);
                }
            }

            for (let c = 0; c < cols; c++) {
                ctx.moveTo(nodes[c].x, nodes[c].y);
                for (let r = 1; r < rows; r++) {
                    const node = nodes[r * cols + c];
                    ctx.lineTo(node.x, node.y);
                }
            }

            ctx.stroke();

            // 2. Dynamické prosvětlení linek a uzlů v zóně deformace
            if (isMouseInside) {
                const minC = Math.max(0, Math.floor((mouseX - influenceRadius - offsetX) / spacing) - 1);
                const maxC = Math.min(cols - 1, Math.ceil((mouseX + influenceRadius - offsetX) / spacing) + 1);
                const minR = Math.max(0, Math.floor((mouseY - influenceRadius - offsetY) / spacing) - 1);
                const maxR = Math.min(rows - 1, Math.ceil((mouseY + influenceRadius - offsetY) / spacing) + 1);

                const glow = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, influenceRadius);
                glow.addColorStop(0, 'rgba(255, 255, 255, 0.30)');
                glow.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
                glow.addColorStop(1, 'rgba(255, 255, 255, 0)');

                ctx.strokeStyle = glow;
                ctx.lineWidth = baseLineWidth + 0.3;
                ctx.beginPath();

                for (let r = minR; r <= maxR; r++) {
                    const rowOffset = r * cols;
                    ctx.moveTo(nodes[rowOffset + minC].x, nodes[rowOffset + minC].y);
                    for (let c = minC + 1; c <= maxC; c++) {
                        const node = nodes[rowOffset + c];
                        ctx.lineTo(node.x, node.y);
                    }
                }

                for (let c = minC; c <= maxC; c++) {
                    ctx.moveTo(nodes[minR * cols + c].x, nodes[minR * cols + c].y);
                    for (let r = minR + 1; r <= maxR; r++) {
                        const node = nodes[r * cols + c];
                        ctx.lineTo(node.x, node.y);
                    }
                }

                ctx.stroke();

                // Prosvětlené uzlové body v zóně dotyku (CAD junction points s plynulým útlumem)
                for (let r = minR; r <= maxR; r++) {
                    const rowOffset = r * cols;
                    for (let c = minC; c <= maxC; c++) {
                        const node = nodes[rowOffset + c];
                        const dx = node.x - mouseX;
                        const dy = node.y - mouseY;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < influenceRadiusSq) {
                            const dist = Math.sqrt(distSq);
                            const norm = dist / influenceRadius;
                            const pointFactor = 0.5 * (1 + Math.cos(Math.PI * norm));
                            const pointAlpha = pointFactor * 0.38;
                            ctx.fillStyle = `rgba(255, 255, 255, ${pointAlpha.toFixed(3)})`;
                            ctx.fillRect(node.x - 1, node.y - 1, 2, 2);
                        }
                    }
                }
            }

            // Automatické uspání smyčky, pokud myš opustila Hero a mřížka se ustálila
            if (isMouseInside || hasMovement) {
                rafId = requestAnimationFrame(updateAndRender);
            } else {
                isLoopRunning = false;
                rafId = null;
            }
        }

        function startLoop() {
            if (!isLoopRunning) {
                isLoopRunning = true;
                rafId = requestAnimationFrame(updateAndRender);
            }
        }

        // Posluchače událostí výhradně pro jemný desktopový ukazatel
        if (isFinePointer) {
            heroSection.addEventListener('mousemove', (e) => {
                const rect = heroSection.getBoundingClientRect();
                mouseX = e.clientX - rect.left;
                mouseY = e.clientY - rect.top;
                isMouseInside = true;
                startLoop();
            }, { passive: true });

            heroSection.addEventListener('mouseenter', (e) => {
                const rect = heroSection.getBoundingClientRect();
                mouseX = e.clientX - rect.left;
                mouseY = e.clientY - rect.top;
                isMouseInside = true;
                startLoop();
            }, { passive: true });

            heroSection.addEventListener('mouseleave', () => {
                isMouseInside = false;
                mouseX = -9999;
                mouseY = -9999;
                startLoop(); // pokračuje do plného ustálení pružin
            }, { passive: true });
        }

        // Responzivní přizpůsobení geometrie
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(() => {
                resizeGrid();
            });
            resizeObserver.observe(heroSection);
        } else {
            window.addEventListener('resize', resizeGrid, { passive: true });
        }

        // Inicializace
        resizeGrid();
    }

    initHeroWarpGrid();

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

    // ----------------------------------------------------------------------
    // 5. Prostorový scroll reveal efekt (Spatial Depth & Optics Reveal)
    // ----------------------------------------------------------------------
    function initSpatialReveal() {
        const revealElements = document.querySelectorAll('.reveal-spatial');
        if (!revealElements.length) return;

        if (!('IntersectionObserver' in window)) {
            // Okamžité odhalení pro prohlížeče bez podpory IntersectionObserver
            revealElements.forEach((el) => el.classList.add('is-revealed'));
            return;
        }

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-revealed');
                    obs.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            rootMargin: '0px 0px -50px 0px',
            threshold: 0.15
        });

        revealElements.forEach((el) => observer.observe(el));
    }

    initSpatialReveal();
});

