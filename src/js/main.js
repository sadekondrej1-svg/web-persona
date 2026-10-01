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
        let gridStroke = 'rgba(255, 255, 255, 0.055)'; // vodicí linky
        let crossStroke = 'rgba(255, 255, 255, 0.20)'; // klidové CAD křížky
        const CROSS_ARM = 2.5; // délka ramene křížku 2.5px (celková velikost cca 5px)

        let width = 0;
        let height = 0;
        let spacing = 48;
        let cols = 0;
        let rows = 0;
        let grid = []; // 2D matice [r][c] pro plynulé propojení sousedních uzlů
        let nodes = []; // Plochý seznam všech uzlů
        let visibleNodes = []; // Uzly v bezpečné vnitřní zóně pro volbu epicentra

        // Stav seismických rázových vln
        let activeWaves = [];
        let rafId = null;
        let pulseTimer = null;
        let lastTime = 0;

        function resizeGrid() {
            width = Math.floor(window.innerWidth);
            height = Math.floor(window.innerHeight || document.documentElement.clientHeight || 800);

            if (width <= 0 || height <= 0) return;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Responzivní rozteč buněk a kontrast na mobilu:
            const isMobile = width < 768;
            spacing = isMobile ? 26 : 48;
            gridStroke = isMobile ? 'rgba(255, 255, 255, 0.075)' : 'rgba(255, 255, 255, 0.055)';
            crossStroke = isMobile ? 'rgba(255, 255, 255, 0.26)' : 'rgba(255, 255, 255, 0.20)';

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

            // Reset probíhajících vln a vykreslení klidové sítě
            activeWaves = [];
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            clearTimeout(pulseTimer);
            drawStaticCadGrid();

            // Přeplánování příštího seismického pulsu (pokud není zapnut reduced-motion)
            if (!motionQuery.matches) {
                scheduleNextPulse(1000); // První puls krátce po načtení / změně velikosti
            }
        }

        // Vykreslení klidové rovné CAD mřížky
        function drawStaticCadGrid() {
            ctx.clearRect(0, 0, width, height);

            if (!grid.length || !nodes.length) return;

            // 1. Rovné vodicí linky
            ctx.strokeStyle = gridStroke;
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
            ctx.strokeStyle = crossStroke;
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

        // Naplánování příštího seismického pulsu (každých cca 3 až 5 sekund)
        function scheduleNextPulse(delay) {
            clearTimeout(pulseTimer);
            if (motionQuery.matches) return;

            const waitTime = typeof delay === 'number' ? delay : (3000 + Math.random() * 2000);
            pulseTimer = setTimeout(triggerShockwave, waitTime);
        }

        // Odpálení autonomního seismického pulsu
        function triggerShockwave() {
            if (motionQuery.matches || visibleNodes.length === 0) return;

            const isMobile = width < 768;
            const epicenterNode = visibleNodes[Math.floor(Math.random() * visibleNodes.length)];
            const waveWidth = isMobile ? 44 : 64;

            // Dynamický výpočet maximálního poloměru k nejvzdálenějšímu rohu canvasu
            const maxCornerDist = Math.hypot(
                Math.max(epicenterNode.originX, width - epicenterNode.originX),
                Math.max(epicenterNode.originY, height - epicenterNode.originY)
            );

            // Maximálně 3 současné vlny pro zachování čistého inženýrského vyznění a stability
            if (activeWaves.length < 3) {
                activeWaves.push({
                    epicenterX: epicenterNode.originX,
                    epicenterY: epicenterNode.originY,
                    radius: 0,
                    maxRadius: maxCornerDist + waveWidth, // vlna pokračuje až do úplného opuštění rohů
                    speed: isMobile ? 420 : 580,          // rychlost přizpůsobená větší dráze
                    waveWidth: waveWidth,
                    energy: 1.0
                });

                // Ostrý LED svit v epicentru
                epicenterNode.highlight = 1.0;
            }

            // Probudit animační smyčku, pokud spí
            if (!rafId) {
                lastTime = performance.now();
                rafId = requestAnimationFrame(render);
            }

            // Automatické naplánování dalšího pulsu za 3–5 sekund
            scheduleNextPulse();
        }

        // Hlavní renderovací a fyzikální smyčka (probouzí se jen při pulsu a usíná v klidu)
        function render(timestamp) {
            const now = timestamp || performance.now();
            const dt = Math.min((now - lastTime) / 1000, 0.04) || 0.016;
            lastTime = now;

            const isMobile = width < 768;

            // 1. Aktualizace aktivních seismických vln
            for (let w = activeWaves.length - 1; w >= 0; w--) {
                const wave = activeWaves[w];
                wave.radius += wave.speed * dt;
                const progress = Math.min(1, wave.radius / wave.maxRadius);
                // Pozvolný útlum: vlna zůstává kineticky aktivní a zřetelná až k vnějším okrajům
                wave.energy = Math.max(0, 1 - progress * 0.72);

                if (wave.radius >= wave.maxRadius) {
                    activeWaves.splice(w, 1);
                }
            }

            // 2. Kinetické působení vln a mechanické tlumení (Spring Physics & Damping)
            let maxDisp = 0;
            let maxHl = 0;
            const waveCount = activeWaves.length;

            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];

                // Působení všech běžících vln na daný uzel
                if (waveCount > 0) {
                    for (let w = 0; w < waveCount; w++) {
                        const wave = activeWaves[w];
                        const dx = node.originX - wave.epicenterX;
                        const dy = node.originY - wave.epicenterY;
                        const dist = Math.hypot(dx, dy);
                        const diff = dist - wave.radius;

                        if (Math.abs(diff) < wave.waveWidth && dist > 2) {
                            const normDist = diff / wave.waveWidth; // -1 až 1
                            const waveIntensity = Math.cos(normDist * (Math.PI / 2)); // hladký kosinusový profil čela

                            if (waveIntensity > 0) {
                                // Radiální vytlačení od epicentra
                                const pushMagnitude = waveIntensity * wave.energy * (isMobile ? 2.8 : 4.4);
                                const nx = dx / dist;
                                const ny = dy / dist;

                                node.vx += nx * pushMagnitude;
                                node.vy += ny * pushMagnitude;

                                // Světelný náboj v čele vlny (rozsvěcuje POUZE křížek / mikrobod)
                                const lightIntensity = waveIntensity * wave.energy;
                                if (lightIntensity > node.highlight) {
                                    node.highlight = lightIntensity;
                                }
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

            // A) Neutrální monochromatické linky sítě (žádné barevné rozsvěcování linek)
            ctx.strokeStyle = gridStroke;
            ctx.lineWidth = 1;
            ctx.beginPath();

            // Horizontální křivky/linky v jedné dávce
            for (let r = 0; r < rows; r++) {
                ctx.moveTo(grid[r][0].x, grid[r][0].y);
                for (let c = 1; c < cols; c++) {
                    ctx.lineTo(grid[r][c].x, grid[r][c].y);
                }
            }

            // Vertikální křivky/linky v jedné dávce
            for (let c = 0; c < cols; c++) {
                ctx.moveTo(grid[0][c].x, grid[0][c].y);
                for (let r = 1; r < rows; r++) {
                    ctx.lineTo(grid[r][c].x, grid[r][c].y);
                }
            }

            ctx.stroke();

            // B) CAD zaměřovací křížky (+) na uzlech (efekt mikroskopických LED diod)
            // 1. Klidové křížky (tlumená monochromatická bílá, vykresleno v jedné dávce)
            ctx.strokeStyle = crossStroke;
            ctx.lineWidth = 1;
            ctx.beginPath();

            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                if (n.highlight <= 0.03) {
                    ctx.moveTo(n.x - CROSS_ARM, n.y);
                    ctx.lineTo(n.x + CROSS_ARM, n.y);
                    ctx.moveTo(n.x, n.y - CROSS_ARM);
                    ctx.lineTo(n.x, n.y + CROSS_ARM);
                }
            }

            ctx.stroke();

            // 2. Aktivní rozsvícené křížky (STRIKTNĚ v uzlech: sytá oranžová #FF5500 + 2px mikrobod)
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                if (n.highlight > 0.03) {
                    const hl = n.highlight;
                    const arm = CROSS_ARM + hl * 0.5; // subtilní expanze 2.5px -> 3.0px
                    const alpha = Math.min(1, 0.25 + hl * 0.75);

                    // Ostrý CAD křížek ve výrazném Safety Orange (#FF5500)
                    ctx.strokeStyle = `rgba(255, 85, 0, ${alpha.toFixed(3)})`;
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(n.x - arm, n.y);
                    ctx.lineTo(n.x + arm, n.y);
                    ctx.moveTo(n.x, n.y - arm);
                    ctx.lineTo(n.x, n.y + arm);
                    ctx.stroke();

                    // Centrální 2px LED mikrobod s intenzivním jádrem
                    const dotAlpha = Math.min(1, 0.4 + hl * 0.6).toFixed(3);
                    ctx.fillStyle = hl > 0.45 ? `rgba(255, 235, 215, ${dotAlpha})` : `rgba(255, 85, 0, ${dotAlpha})`;
                    ctx.fillRect(n.x - 1, n.y - 1, 2, 2);
                }
            }

            // C) Detekce návratu do absolutního geometrického klidu a uspání smyčky
            if (activeWaves.length === 0 && maxDisp < 0.05 && maxHl < 0.005) {
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
                return;
            }

            // Pokračování ve vykreslování aktivních vln / dojezdu pružin
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
                    activeWaves = [];
                    drawStaticCadGrid();
                } else {
                    scheduleNextPulse(1000);
                }
            });
        }

        // Responzivní přizpůsobení při změně velikosti okna
        window.addEventListener('resize', resizeGrid, { passive: true });
        window.addEventListener('orientationchange', resizeGrid, { passive: true });

        // Uspání animace, pokud je okno neaktivní (šetří GPU a baterii)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                clearTimeout(pulseTimer);
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
            } else if (!motionQuery.matches && activeWaves.length === 0 && !rafId) {
                scheduleNextPulse(1000);
            }
        });

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
                    requestAnimationFrame(() => {
                        entry.target.classList.add('is-revealed');
                    });
                    obs.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            rootMargin: '0px 0px -30px 0px',
            threshold: 0.05
        });

        revealElements.forEach((el) => observer.observe(el));
    }

    initSpatialReveal();

    // ----------------------------------------------------------------------
    // 6. Schematická hardwarová sběrnice (Data Bus) & CAD Telemetrie Pipeline
    // ----------------------------------------------------------------------
    let currentPipelineStep = 0;

    function setPipelineStep(stepIndex) {
        currentPipelineStep = stepIndex;
        const nodes = document.querySelectorAll('.pipeline-bus .bus-node');
        const progressBar = document.querySelector('.pipeline-bus .bus-progress');
        if (!nodes.length) return;

        const isMobile = window.innerWidth < 768;

        if (stepIndex === 0) {
            nodes.forEach(node => {
                node.classList.remove('is-active', 'is-done');
            });
            if (progressBar) {
                progressBar.style.width = '0%';
                progressBar.style.height = '0%';
            }
            return;
        }

        if (stepIndex === 'done' || stepIndex > 4) {
            nodes.forEach(node => {
                node.classList.remove('is-active');
                node.classList.add('is-done');
            });
            if (progressBar) {
                if (isMobile) {
                    progressBar.style.height = '100%';
                    progressBar.style.width = '100%';
                } else {
                    progressBar.style.width = '100%';
                    progressBar.style.height = '100%';
                }
            }
            return;
        }

        const numericStep = parseInt(stepIndex, 10);
        nodes.forEach(node => {
            const step = parseInt(node.getAttribute('data-step'), 10);
            if (step < numericStep) {
                node.classList.remove('is-active');
                node.classList.add('is-done');
            } else if (step === numericStep) {
                node.classList.remove('is-done');
                node.classList.add('is-active');
            } else {
                node.classList.remove('is-active', 'is-done');
            }
        });

        if (progressBar) {
            const pct = ((numericStep - 1) / 3) * 100;
            if (isMobile) {
                progressBar.style.height = `${pct}%`;
                progressBar.style.width = '100%';
            } else {
                progressBar.style.width = `${pct}%`;
                progressBar.style.height = '100%';
            }
        }
    }

    window.addEventListener('resize', () => {
        if (currentPipelineStep) {
            setPipelineStep(currentPipelineStep);
        }
    }, { passive: true });

    function initTerminalSimulation() {
        const simBtn = document.getElementById('run-terminal-sim');
        const terminalScreen = document.getElementById('terminal-screen');
        if (!simBtn || !terminalScreen) return;

        const DESKTOP_LOG_ROWS = [
            '<span class="text-[#d4d4d8] font-semibold">[INFO]</span> <span class="text-[#52525b]">Discovery:</span> ARES Search NACE 25110 | Nalezen: <span class="text-[#d4d4d8]">GELSO, s.r.o.</span> (IČO: 25321480)',
            '<span class="text-[#d4d4d8] font-semibold">[INFO]</span> <span class="text-[#52525b]">Financials:</span> Justice.cz staženo PDF -&gt; Gemini 2.5 Flash Lite extrahuje výkazy...',
            '<span class="text-[#ffffff] font-semibold">[OK]  </span> <span class="text-[#52525b]">Financials:</span> <span class="text-[#ffffff] font-semibold">QUALIFIED ✓</span> | Rev=<span class="text-[#ffffff]">31.6M</span> | Equity=<span class="text-[#ffffff]">39.2M</span> | VH=<span class="text-[#ffffff]">0.0M</span> (2024)',
            '<span class="text-[#fbbf24] font-semibold">[WARN]</span> <span class="text-[#52525b]">Financials:</span> TENTE s.r.o. -&gt; <span class="text-[#fbbf24] font-semibold">DISQUALIFIED</span> (tržby pod limitem 18 mil. Kč)',
            '<span class="text-[#d4d4d8] font-semibold">[INFO]</span> <span class="text-[#52525b]">Enrichment:</span> Doména gelso.cz ověřena shodou IČO -&gt; 1 jednatel, 1 tel, 1 email.',
            '<span class="text-[#ffffff] font-semibold">[DONE]</span> <span class="text-[#52525b]">Export:</span> M&amp;A Excel vygenerován: <span class="text-[#d4d4d8]">output/Export_MA_2026.xlsx</span> (4 leady)'
        ];

        const MOBILE_LOG_ROWS = [
            '<span class="text-[#d4d4d8] font-semibold">[INFO]</span> <span class="text-[#52525b]">Discovery:</span> ARES NACE 25110 -&gt; <span class="text-[#d4d4d8]">GELSO s.r.o.</span> (IČO 25321480)',
            '<span class="text-[#d4d4d8] font-semibold">[INFO]</span> <span class="text-[#52525b]">Justice.cz:</span> Staženo PDF -&gt; Gemini 2.5 extrakce',
            '<span class="text-[#ffffff] font-semibold">[OK]  </span> <span class="text-[#52525b]">Financials:</span> <span class="text-[#ffffff] font-semibold">QUALIFIED ✓</span> | Tržby <span class="text-[#ffffff]">31.6M</span> (2024)',
            '<span class="text-[#fbbf24] font-semibold">[WARN]</span> TENTE s.r.o. -&gt; <span class="text-[#fbbf24] font-semibold">DISQUALIFIED</span> (tržby &lt; 18M)',
            '<span class="text-[#d4d4d8] font-semibold">[INFO]</span> <span class="text-[#52525b]">Enrichment:</span> gelso.cz ověřeno -&gt; 1 jednatel, kontakt OK',
            '<span class="text-[#ffffff] font-semibold">[DONE]</span> <span class="text-[#52525b]">Export:</span> M&amp;A Excel vygenerován (4 leady)'
        ];

        let isRunning = false;

        simBtn.addEventListener('click', () => {
            if (isRunning) return;
            isRunning = true;

            const isMobile = window.innerWidth < 640;
            const logRows = isMobile ? MOBILE_LOG_ROWS : DESKTOP_LOG_ROWS;

            const labelEl = simBtn.querySelector('.sim-btn-label') || simBtn;
            labelEl.innerHTML = '<span class="sm:hidden">...</span><span class="hidden sm:inline">Zpracovávám...</span>';
            simBtn.disabled = true;

            // Ponechat inženýrský příkazový prompt
            const promptCmd = isMobile ? 'python main.py' : 'python main.py --config=mna_search.json';
            terminalScreen.innerHTML = `<div class="terminal-row"><span class="text-[#71717a]">ondrej@engine:~<span class="text-[#FF5500] font-semibold">$</span></span> <span class="text-[#d4d4d8]">${promptCmd}</span></div>`;

            // Reset a inicializace sběrnice na 1. krok
            setPipelineStep(0);
            setPipelineStep(1);

            let currentStep = 0;

            function outputNextLine() {
                if (currentStep < logRows.length) {
                    // Propojení s hardwarovou sběrnicí
                    if (currentStep === 0) {
                        setPipelineStep(1); // Sběr z rejstříků (ARES & ISIR)
                    } else if (currentStep === 1) {
                        setPipelineStep(2); // AI extrakce (Gemini)
                    } else if (currentStep === 4) {
                        setPipelineStep(3); // Validace kontaktů
                    } else if (currentStep === 5) {
                        setPipelineStep(4); // Export dat
                    }

                    const row = document.createElement('div');
                    row.className = 'terminal-row';
                    row.innerHTML = logRows[currentStep];
                    terminalScreen.appendChild(row);
                    terminalScreen.scrollTop = terminalScreen.scrollHeight;

                    currentStep++;
                    setTimeout(outputNextLine, 300);
                } else {
                    // Dokončení pipeline - signální oranžový stav
                    const finishRow = document.createElement('div');
                    finishRow.className = 'terminal-row pt-2 text-[#FF5500] font-semibold flex items-center gap-2 border-t border-white/[0.06]';
                    const finishText = isMobile ? '● Target reached (hotovo)' : '● Pipeline finished: Cílový počet leadů splněn.';
                    finishRow.innerHTML = `<span class="inline-block w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-pulse"></span>${finishText}`;
                    terminalScreen.appendChild(finishRow);
                    terminalScreen.scrollTop = terminalScreen.scrollHeight;

                    // Všechny uzly sběrnice do dokončeného stavu
                    setPipelineStep('done');

                    // Odblokovat tlačítko a nabídnout možnost znovu spustit
                    simBtn.disabled = false;
                    labelEl.innerHTML = '<span class="sm:hidden">↺ Znovu</span><span class="hidden sm:inline">Spustit znovu ↺</span>';
                    isRunning = false;
                }
            }

            setTimeout(outputNextLine, 300);
        });
    }

    initTerminalSimulation();
});


