# Pravidla pro vývoj webu (Project Guidelines)

## Stack
- Sémantické HTML5
- Tailwind CSS (přes CDN nebo utility třídy)
- Čistý JavaScript (ES6+, žádné zbytečné knihovny)
- Žádný inline CSS v HTML atributech `style=""`

## Vizuální styl (Anti-slop)
- Pozadí: matná černá/uhlová (#09090b, zinc-950)
- Akcent: smaragdově zelená (#10b981) pouze pro CTA a aktivní stavy
- Rámečky: jemné 1px linky s nízkou opacitou (border-white/[0.08])
- Typografie: Sans-serif (Plus Jakarta Sans) na text, Monospace (JetBrains Mono) na štítky, kód a čísla
- ZÁKAZ: fialové/modré zářící gradienty, blur koule v pozadí, generická marketingová klišé ("revolutionary", "seamless")

## Pravidla pro generování kódu
- Nikdy nepřepisuj celý soubor, pokud se upravuje jen jedna sekce.
- Udržuj čisté sémantické bloky (<nav>, <header>, <section>, <footer>).
- Veškeré vlastní CSS třídy piš výhradně do `src/css/style.css`.
- Veškerou logiku a skripty piš výhradně do `src/js/main.js`.