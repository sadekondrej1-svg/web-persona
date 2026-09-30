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
    // 2. Autonomní hybridní seismický puls v CAD síti (Kinetics & Luminescence Shockwave)
    // ----------------------------------------------------------------------
    function initCadSeismicPulseGrid() {
        const canvas = document.getElementById('hero-warp-canvas');
        const heroSection = document.getElementById('hero');
        if (!canvas || !heroSection) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        // Vizuální parametry CAD mřížky
        const GRID_STROKE = 'rgba(255, 255, 255, 0.055)'; // vodicí linky s nízkou opacitou (0.05–0.07)
        const CROSS_STROKE = 'rgba(255, 255, 255, 0.20)'; // klidové CAD křížky (cca 0.2)
        const CROSS_ARM = 2.5; // délka ramene křížku 2.5px (celková velikost cca 5px)

        let width = 0;
        let height = 0;
        let spacing = 48;
        let cols = 0;
        let rows = 0;
        let grid = []; // 2D matice [r][c] pro plynulé propojení sousedních uzlů
        let nodes = []; // Plochý seznam všech uzlů
        let visibleNodes = []; // Uzly v bezpečné vnitřní zóně pro volbu epicentra

        // Stav seismické rázové vlny
        let activeWave = null;
        let rafId = null;
        let pulseTimer = null;
        let lastTime = 0;

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

            // Responzivní rozteč buněk: na mobilech (<768px) cca 26px, na desktopu cca 48px
            const isMobile = width < 768;
            spacing = isMobile ? 26 : 48;

            cols = Math.ceil(width / spacing) + 2;
            rows = Math.ceil(height / spacing) + 2;

            const offsetX = (width - (cols - 1) * spacing) / 2;
            const offsetY = (height - (rows - 1) * spacing) / 2;

            grid = [];
            nodes = [];
            visibleNodes = [];

            for (let r = 0; r < rows; r++) {
                const row = [];
                const y = offsetY + r * spacing;
                for (let c = 0; c < cols; c++) {
                    const x = offsetX + c * spacing;
                    const node = {
                        originX: x,
                        originY: y,
                        x: x,
                        y: y,
                        vx: 0,
                        vy: 0,
                        highlight: 0,
                        r: r,
                        c: c
                    };
                    row.push(node);
                    nodes.push(node);

                    // Uzly pro výběr epicentra (s bezpečným odsazením od okrajů zobrazení)
                    if (x >= 40 && x <= width - 40 && y >= 40 && y <= height - 40) {
                        visibleNodes.push(node);
                    }
                }
                grid.push(row);
            }

            if (!visibleNodes.length) {
                visibleNodes = nodes;
            }

            // Reset probíhající vlny a vykreslení klidové sítě
            activeWave = null;
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            drawStaticCadGrid();

            // Přeplánování příštího seismického pulsu (pokud není zapnut reduced-motion)
            if (!motionQuery.matches) {
                scheduleNextPulse(1400); // První puls krátce po načtení / změně velikosti
            }
        }

        // Vykreslení klidové rovné CAD mřížky
        function drawStaticCadGrid() {
            ctx.clearRect(0, 0, width, height);

            if (!grid.length || !nodes.length) return;

            // 1. Rovné vodicí linky
            ctx.strokeStyle = GRID_STROKE;
            ctx.lineWidth = 1;
            ctx.beginPath();

            for (let r = 0; r < rows; r++) {
                ctx.moveTo(grid[r][0].originX, grid[r][0].originY);
                ctx.lineTo(grid[r][cols - 1].originX, grid[r][cols - 1].originY);
            }

            for (let c = 0; c < cols; c++) {
                ctx.moveTo(grid[0][c].originX, grid[0][c].originY);
                ctx.lineTo(grid[rows - 1][c].originX, grid[rows - 1][c].originY);
            }

            ctx.stroke();

            // 2. Tenké CAD křížky (+) na průsečících
            ctx.strokeStyle = CROSS_STROKE;
            ctx.lineWidth = 1;
            ctx.beginPath();

            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                ctx.moveTo(n.originX - CROSS_ARM, n.originY);
                ctx.lineTo(n.originX + CROSS_ARM, n.originY);
                ctx.moveTo(n.originX, n.originY - CROSS_ARM);
                ctx.lineTo(n.originX, n.originY + CROSS_ARM);
            }

            ctx.stroke();
        }

        // Naplánování příštího seismického pulsu (každých cca 6 až 10 sekund)
        function scheduleNextPulse(delay) {
            clearTimeout(pulseTimer);
            if (motionQuery.matches) return;

            const waitTime = typeof delay === 'number' ? delay : (6000 + Math.random() * 4000);
            pulseTimer = setTimeout(triggerShockwave, waitTime);
        }

        // Odpálení autonomního seismického pulsu
        function triggerShockwave() {
            if (motionQuery.matches || visibleNodes.length === 0) return;

            const isMobile = width < 768;
            const epicenterNode = visibleNodes[Math.floor(Math.random() * visibleNodes.length)];

            activeWave = {
                epicenterX: epicenterNode.originX,
                epicenterY: epicenterNode.originY,
                radius: 0,
                maxRadius: isMobile ? 260 : 320, // poloměr dosahu cca 260–340 px
                speed: isMobile ? 210 : 250,      // rychlost šíření čela v px/s
                waveWidth: isMobile ? 42 : 54,    // šířka energetického čela
                energy: 1.0
            };

            // Počáteční energetický akcent v epicentru
            epicenterNode.highlight = 1.0;

            if (!rafId) {
                lastTime = performance.now();
                rafId = requestAnimationFrame(render);
            }
        }

        // Hlavní renderovací a fyzikální smyčka (probouzí se jen při pulsu a usíná v klidu)
        function render(timestamp) {
            const now = timestamp || performance.now();
            const dt = Math.min((now - lastTime) / 1000, 0.04) || 0.016;
            lastTime = now;

            const isMobile = width < 768;

            // 1. Aktualizace seismické vlny
            if (activeWave) {
                activeWave.radius += activeWave.speed * dt;
                // Exponenciálně tlumený pokles energie od 1 k 0
                activeWave.energy = Math.pow(Math.max(0, 1 - activeWave.radius / activeWave.maxRadius), 1.25);

                if (activeWave.radius >= activeWave.maxRadius || activeWave.energy <= 0.005) {
                    activeWave = null;
                }
            }

            // 2. Kinetické působení vlny a mechanické tlumení (Spring Physics & Damping)
            let maxDisp = 0;
            let maxHl = 0;

            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];

                // Působení čela rázové vlny
                if (activeWave && activeWave.energy > 0.008) {
                    const dx = node.originX - activeWave.epicenterX;
                    const dy = node.originY - activeWave.epicenterY;
                    const dist = Math.hypot(dx, dy);
                    const diff = dist - activeWave.radius;

                    if (Math.abs(diff) < activeWave.waveWidth && dist > 2) {
                        const normDist = diff / activeWave.waveWidth; // -1 až 1
                        const waveIntensity = Math.cos(normDist * (Math.PI / 2)); // hladký kosinusový profil čela

                        if (waveIntensity > 0) {
                            // Radiální vytlačení od epicentra
                            const pushMagnitude = waveIntensity * activeWave.energy * (isMobile ? 2.6 : 3.4);
                            const nx = dx / dist;
                            const ny = dy / dist;

                            node.vx += nx * pushMagnitude;
                            node.vy += ny * pushMagnitude;

                            // Světelný náboj v čele vlny
                            const lightIntensity = waveIntensity * activeWave.energy;
                            if (lightIntensity > node.highlight) {
                                node.highlight = lightIntensity;
                            }
                        }
                    }
                }

                // Pružinové tlumení zpět do klidového bodu (Hooke's Spring + Damping)
                const springForceX = (node.originX - node.x) * 0.12;
                const springForceY = (node.originY - node.y) * 0.12;

                node.vx = (node.vx + springForceX) * 0.84;
                node.vy = (node.vy + springForceY) * 0.84;

                node.x += node.vx;
                node.y += node.vy;

                // Sametové odeznívání světelného akcentu
                node.highlight *= 0.88;
                if (node.highlight < 0.003) node.highlight = 0;

                const disp = Math.hypot(node.x - node.originX, node.y - node.originY);
                if (disp > maxDisp) maxDisp = disp;
                if (node.highlight > maxHl) maxHl = node.highlight;
            }

            // 3. Vykreslení rámu
            ctx.clearRect(0, 0, width, height);

            // A) Linky sítě spojené skrze reálné (kineticky deformované) pozice uzlů
            ctx.strokeStyle = GRID_STROKE;
            ctx.lineWidth = 1;

            // Horizontální křivky/linky
            for (let r = 0; r < rows; r++) {
                ctx.beginPath();
                ctx.moveTo(grid[r][0].x, grid[r][0].y);
                for (let c = 1; c < cols; c++) {
                    ctx.lineTo(grid[r][c].x, grid[r][c].y);
                }
                ctx.stroke();
            }

            // Vertikální křivky/linky
            for (let c = 0; c < cols; c++) {
                ctx.beginPath();
                ctx.moveTo(grid[0][c].x, grid[0][c].y);
                for (let r = 1; r < rows; r++) {
                    ctx.lineTo(grid[r][c].x, grid[r][c].y);
                }
                ctx.stroke();
            }

            // B) Světelný akcent na linkách v zóně čela vlny (oranžové prosvitnutí linky)
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols - 1; c++) {
                    const n1 = grid[r][c];
                    const n2 = grid[r][c + 1];
                    const segHl = (n1.highlight + n2.highlight) * 0.5;
                    if (segHl > 0.04) {
                        ctx.strokeStyle = `rgba(255, 85, 0, ${(segHl * 0.45).toFixed(3)})`;
                        ctx.lineWidth = 1.2;
                        ctx.beginPath();
                        ctx.moveTo(n1.x, n1.y);
                        ctx.lineTo(n2.x, n2.y);
                        ctx.stroke();
                    }
                }
            }

            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows - 1; r++) {
                    const n1 = grid[r][c];
                    const n2 = grid[r + 1][c];
                    const segHl = (n1.highlight + n2.highlight) * 0.5;
                    if (segHl > 0.04) {
                        ctx.strokeStyle = `rgba(255, 85, 0, ${(segHl * 0.45).toFixed(3)})`;
                        ctx.lineWidth = 1.2;
                        ctx.beginPath();
                        ctx.moveTo(n1.x, n1.y);
                        ctx.lineTo(n2.x, n2.y);
                        ctx.stroke();
                    }
                }
            }

            // C) CAD zaměřovací křížky (+) na uzlech
            // 1. Běžné křížky s nízkou/nulovou luminiscencí (jedna dávka pro maximální výkon)
            ctx.strokeStyle = CROSS_STROKE;
            ctx.lineWidth = 1;
            ctx.beginPath();

            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                if (n.highlight <= 0.04) {
                    ctx.moveTo(n.x - CROSS_ARM, n.y);
                    ctx.lineTo(n.x + CROSS_ARM, n.y);
                    ctx.moveTo(n.x, n.y - CROSS_ARM);
                    ctx.lineTo(n.x, n.y + CROSS_ARM);
                }
            }
            ctx.stroke();

            // 2. Zvýrazněné křížky na čele vlny s oranžovým/bílým technickým svitem
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                if (n.highlight > 0.04) {
                    const arm = CROSS_ARM + n.highlight * 0.8;
                    const crossAlpha = Math.min(1, 0.2 + n.highlight * 0.8);
                    ctx.strokeStyle = `rgba(255, 120, 50, ${crossAlpha.toFixed(3)})`;
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(n.x - arm, n.y);
                    ctx.lineTo(n.x + arm, n.y);
                    ctx.moveTo(n.x, n.y - arm);
                    ctx.lineTo(n.x, n.y + arm);
                    ctx.stroke();

                    // Miniaturní zářivý středový bod v uzlu
                    ctx.fillStyle = `rgba(255, 255, 255, ${(n.highlight * 0.85).toFixed(3)})`;
                    ctx.fillRect(n.x - 0.75, n.y - 0.75, 1.5, 1.5);
                }
            }

            // D) Světelné efekty čela vlny: Počáteční výboj v epicentru a postupující prstenec
            if (activeWave) {
                // Energetický záblesk v epicentru (plynule dohasíná při expanzi do 75 px)
                if (activeWave.radius < 75) {
                    const burstRatio = activeWave.radius / 75;
                    const burstAlpha = (1 - burstRatio) * 0.55;
                    const burstGrad = ctx.createRadialGradient(
                        activeWave.epicenterX, activeWave.epicenterY, 0,
                        activeWave.epicenterX, activeWave.epicenterY, 26
                    );
                    burstGrad.addColorStop(0, `rgba(255, 85, 0, ${burstAlpha.toFixed(3)})`);
                    burstGrad.addColorStop(0.35, `rgba(255, 85, 0, ${(burstAlpha * 0.4).toFixed(3)})`);
                    burstGrad.addColorStop(1, 'rgba(255, 85, 0, 0)');

                    ctx.fillStyle = burstGrad;
                    ctx.beginPath();
                    ctx.arc(activeWave.epicenterX, activeWave.epicenterY, 26, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Jemný světelný prstenec na čele seismické rázové vlny
                if (activeWave.radius > 6 && activeWave.energy > 0.01) {
                    ctx.beginPath();
                    ctx.arc(activeWave.epicenterX, activeWave.epicenterY, activeWave.radius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255, 85, 0, ${(activeWave.energy * 0.22).toFixed(3)})`;
                    ctx.lineWidth = Math.max(1, activeWave.waveWidth * 0.22 * activeWave.energy);
                    ctx.stroke();
                }
            }

            // 4. Detekce návratu do absolutního geometrického klidu a uspání smyčky
            if (!activeWave && maxDisp < 0.05 && maxHl < 0.005) {
                // Přesné ukotvení na původní souřadnice
                for (let i = 0; i < nodes.length; i++) {
                    const n = nodes[i];
                    n.x = n.originX;
                    n.y = n.originY;
                    n.vx = 0;
                    n.vy = 0;
                    n.highlight = 0;
                }

                // Finální precizní vykreslení statické mřížky a uspání smyčky
                drawStaticCadGrid();
                cancelAnimationFrame(rafId);
                rafId = null;

                // Naplánování příštího seismického pulsu (šetří CPU i GPU)
                scheduleNextPulse();
                return;
            }

            // Pokračování ve vykreslování aktivního pulsu / dojezdu pružin
            rafId = requestAnimationFrame(render);
        }

        // Listener pro prefers-reduced-motion
        if (motionQuery.addEventListener) {
            motionQuery.addEventListener('change', (e) => {
                if (e.matches) {
                    clearTimeout(pulseTimer);
                    if (rafId) {
                        cancelAnimationFrame(rafId);
                        rafId = null;
                    }
                    activeWave = null;
                    drawStaticCadGrid();
                } else {
                    scheduleNextPulse(2000);
                }
            });
        }

        // Responzivní přizpůsobení při změně velikosti okna
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

    initCadSeismicPulseGrid();

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

