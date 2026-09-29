// ==========================================================================
// Autonomní laserová sonda: Inženýrská kinetika, SVG Paprsek & Absorpce
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const interactiveZone = document.getElementById('hero-interactive-zone');
    const svgCanvas = document.getElementById('scanner-beam-canvas');
    const lineGlow = document.getElementById('laser-line-glow');
    const lineCore = document.getElementById('laser-line-core');
    const impactSpark = document.getElementById('laser-impact-spark');
    const headlineContainer = document.getElementById('hero-headline-container');
    const overlay = headlineContainer ? headlineContainer.querySelector('.headline-luminescence-overlay') : null;
    const track = document.getElementById('scanner-track');
    const carriage = document.getElementById('scanner-carriage');
    const lens = document.getElementById('scanner-lens');

    if (!interactiveZone || !svgCanvas || !headlineContainer || !overlay || !track || !carriage || !lens) return;

    let isDestroyed = false;
    let currentTimeout = null;

    function wait(ms) {
        return new Promise(resolve => {
            currentTimeout = setTimeout(resolve, ms);
        });
    }

    // Výpočet cílů, pozic jezdce a dynamických úhlů paprsku
    function getScanTargets() {
        const trackRect = track.getBoundingClientRect();
        const carriageWidth = 24;
        const minX = 4;
        const maxX = Math.max(minX, trackRect.width - carriageWidth - 4);

        const targetElements = Array.from(headlineContainer.querySelectorAll('.scan-target'));

        let targetData = targetElements.map(el => {
            const line = parseInt(el.getAttribute('data-line') || '1', 10);
            const rect = el.getBoundingClientRect();
            const targetCenterX = rect.left + rect.width * 0.45;

            // Offset jezdce pro vytvoření přirozeného dynamického úhlu paprsku (-12° až +14°):
            let angleOffset = 0;
            if (line === 3) angleOffset = -5;
            else if (line === 2) angleOffset = -16;
            else if (line === 1) angleOffset = 22;

            let carriageX = targetCenterX - trackRect.left - (carriageWidth / 2) + angleOffset;
            carriageX = Math.max(minX, Math.min(carriageX, maxX));

            return {
                element: el,
                carriageX,
                center: targetCenterX
            };
        });

        // Seřadíme zleva doprava pro přirozený sekvenční průjezd
        targetData.sort((a, b) => a.center - b.center);

        return { targets: targetData, minX, maxX };
    }

    // Zaměření a nastavení souřadnic pro SVG linku [x1, y1] -> [x2, y2]
    function updateBeamCoordinates(targetElement) {
        const zoneRect = interactiveZone.getBoundingClientRect();
        const lensRect = lens.getBoundingClientRect();
        const wordRect = targetElement.getBoundingClientRect();
        const headlineRect = headlineContainer.getBoundingClientRect();

        // Bod A (střed mikro-čočky)
        const x1 = (lensRect.left - zoneRect.left) + lensRect.width / 2;
        const y1 = (lensRect.top - zoneRect.top) + lensRect.height / 2;

        // Bod B (přesně na spodní hraně zasaženého slova)
        const x2 = (wordRect.left - zoneRect.left) + wordRect.width * 0.45;
        const y2 = (wordRect.bottom - zoneRect.top) - 2;

        // Souřadnice dopadu uvnitř textového překryvu
        const impactX = (wordRect.left - headlineRect.left) + wordRect.width * 0.45;
        const impactY = (wordRect.bottom - headlineRect.top) - 2;

        // Vypočteme optický úhel paprsku z čočky k cíli a předáme do CSS proměnné
        const angleRad = Math.atan2(x2 - x1, y1 - y2);
        const angleDeg = (angleRad * 180 / Math.PI).toFixed(1);
        carriage.style.setProperty('--beam-angle', `${angleDeg}deg`);

        // Nastavíme linky v SVG
        lineGlow.setAttribute('x1', x1.toFixed(1));
        lineGlow.setAttribute('y1', y1.toFixed(1));
        lineGlow.setAttribute('x2', x2.toFixed(1));
        lineGlow.setAttribute('y2', y2.toFixed(1));

        lineCore.setAttribute('x1', x1.toFixed(1));
        lineCore.setAttribute('y1', y1.toFixed(1));
        lineCore.setAttribute('x2', x2.toFixed(1));
        lineCore.setAttribute('y2', y2.toFixed(1));

        impactSpark.setAttribute('cx', x2.toFixed(1));
        impactSpark.setAttribute('cy', y2.toFixed(1));

        // Nastavíme ohnisko pro luminiscenční masku textu na kontejneru i překryvu
        headlineContainer.style.setProperty('--impact-x', `${impactX.toFixed(1)}px`);
        headlineContainer.style.setProperty('--impact-y', `${impactY.toFixed(1)}px`);
        overlay.style.setProperty('--impact-x', `${impactX.toFixed(1)}px`);
        overlay.style.setProperty('--impact-y', `${impactY.toFixed(1)}px`);
    }

    // Hlavní klidný inženýrský cyklus skeneru
    async function runLaserCycle() {
        while (!isDestroyed) {
            const { targets, minX, maxX } = getScanTargets();

            // 0. Výchozí poloha: levý doraz
            carriage.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
            carriage.style.transform = `translateX(${minX.toFixed(1)}px)`;
            await wait(850);

            // Průjezd cílovými slovy
            for (let i = 0; i < targets.length; i++) {
                if (isDestroyed) return;
                const target = targets[i];

                // Fáze 1: Plynulý přejezd s mechanickým zpomalením (1.3s)
                carriage.style.transition = 'transform 1.3s cubic-bezier(0.16, 1, 0.3, 1)';
                carriage.style.transform = `translateX(${target.carriageX.toFixed(1)}px)`;
                await wait(1350);
                if (isDestroyed) return;

                // Fáze 2: Aretace a zaměření (250 ms)
                // Čočka se zaměří na cíl, zintenzivní jas a zkoordinuje paprsek
                updateBeamCoordinates(target.element);
                carriage.classList.add('is-locked');
                await wait(250);
                if (isDestroyed) return;

                // Fáze 3: Výstřel laseru pod úhlem k bodu [hitX, hitY] (260 ms)
                svgCanvas.classList.add('laser-active');
                await wait(260);
                if (isDestroyed) return;

                // Spodní paprsek zhasne a čočka opustí aretaci
                svgCanvas.classList.remove('laser-active');
                carriage.classList.remove('is-locked');

                // Fáze 4: Šíření světla z bodu dopadu (rázová vlna 0-250ms) a GPU sametové dohasnutí (900ms)
                overlay.classList.remove('is-dispersing');
                void overlay.offsetWidth; // Reflow pro restart animace
                overlay.classList.add('is-dispersing');

                // Čekání na dokončení dohasnutí (událost animationend/transitionend nebo timeout)
                await new Promise(resolve => {
                    let finished = false;
                    const cleanup = () => {
                        if (finished) return;
                        finished = true;
                        overlay.removeEventListener('animationend', cleanup);
                        overlay.removeEventListener('transitionend', cleanup);
                        resolve();
                    };
                    overlay.addEventListener('animationend', cleanup, { once: true });
                    overlay.addEventListener('transitionend', cleanup, { once: true });
                    setTimeout(cleanup, 1200); // Fail-safe timeout
                });

                overlay.classList.remove('is-dispersing');
                if (isDestroyed) return;

                // Fáze 5: Klidový stav před dalším přesunem (400 ms)
                await wait(400);
            }

            // Dojezd k pravému dorazu (0.9s)
            carriage.style.transition = 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
            carriage.style.transform = `translateX(${maxX.toFixed(1)}px)`;
            await wait(950);
            if (isDestroyed) return;

            // Krátká pauza na dorazu (300 ms)
            await wait(300);

            // Návratový tah zpět na start (1.5s)
            carriage.style.transition = 'transform 1.5s cubic-bezier(0.25, 1, 0.4, 1)';
            carriage.style.transform = `translateX(${minX.toFixed(1)}px)`;
            await wait(1600);

            // Interval před novým cyklem (500 ms)
            await wait(500);
        }
    }

    // Recalculate on window resize
    window.addEventListener('resize', () => {
        // Koordináty se přizpůsobí v dalším cyklu
    }, { passive: true });

    // Spuštění po ustálení rozvržení
    setTimeout(() => {
        runLaserCycle();
    }, 250);
});



