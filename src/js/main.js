// Interaktivní radiální světelná čočka (Radial Luminescence) na nadpisu
document.addEventListener('DOMContentLoaded', () => {
    const headlineContainer = document.getElementById('hero-headline-container');
    if (!headlineContainer) return;

    let isInside = false;

    headlineContainer.addEventListener('pointerenter', () => {
        isInside = true;
        headlineContainer.classList.add('has-pointer');
    });

    headlineContainer.addEventListener('pointermove', (e) => {
        const rect = headlineContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        headlineContainer.style.setProperty('--mouse-x', `${x}px`);
        headlineContainer.style.setProperty('--mouse-y', `${y}px`);
    });

    headlineContainer.addEventListener('pointerleave', () => {
        isInside = false;
        headlineContainer.classList.remove('has-pointer');
        setTimeout(() => {
            if (!isInside) {
                headlineContainer.style.setProperty('--mouse-x', '-999px');
                headlineContainer.style.setProperty('--mouse-y', '-999px');
            }
        }, 300);
    });
});
