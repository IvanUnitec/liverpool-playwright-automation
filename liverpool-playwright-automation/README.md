# Liverpool Playwright Automation Exercise

Automatización de un flujo de e-commerce de Liverpool usando **Playwright + TypeScript**.

## Objetivo

1. Abrir Liverpool.
2. Buscar `playstation 5`.
3. Filtrar por color `Blanco`.
4. Ordenar por precio ascendente.
5. Extraer nombre y precio de los primeros 5 productos.
6. Imprimirlos en consola.
7. Interceptar respuestas JSON de la aplicación.
8. Comparar UI vs datos de red y exigir al menos 3 coincidencias de 5.
9. Generar reporte HTML y evidencia automática ante fallos.

## Requisitos

- Node.js 22+
- npm
- No utiliza Selenium.
- No utiliza Python.

## Instalación

```bash
npm ci
npx playwright install --with-deps chromium
```

Si no existe `package-lock.json` porque el proyecto fue creado desde cero:

```bash
npm install
npx playwright install chromium
```

## Ejecución

Headless por defecto:

```bash
npm test
```

Con navegador visible:

```bash
npm run test:headed
```

Ver reporte:

```bash
npm run report
```

Validar TypeScript:

```bash
npm run typecheck
```

## Decisiones de diseño

- Page Object Model para separar interacción de la prueba.
- Configuración centralizada en `playwright.config.ts`.
- `HEADLESS=false` como opción explícita para modo headed.
- `screenshot: only-on-failure`, `trace: retain-on-failure` y video en fallos.
- Captura de respuestas `fetch/xhr` con contenido JSON.
- Comparación normalizada de nombres y precios.
- Sin precios/nombres hard-coded.
- El catálogo real es dinámico; por eso la validación de red exige 3/5 coincidencias, tal como solicita el ejercicio.

## Estructura

```text
.
├── .github/workflows/test.yml
├── pages/search-results.page.ts
├── tests/liverpool.spec.ts
├── utils/network-products.ts
├── playwright.config.ts
├── TEST_STRATEGY.md
├── package.json
├── tsconfig.json
└── README.md
```

## Nota sobre el sitio real

Liverpool puede cambiar selectores, experimentos A/B, estructura DOM, filtros o endpoints. Los localizadores están concentrados en Page Objects para reducir el costo de mantenimiento. Si el sitio cambia, la primera modificación debería hacerse en `pages/search-results.page.ts`, no en la lógica de negocio de la prueba.
