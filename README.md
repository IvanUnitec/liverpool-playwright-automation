# Liverpool - Playwright E-Commerce Automation

Este repositorio contiene una suite de pruebas de automatización robusta utilizando **Playwright** y **TypeScript** para validar flujos de búsqueda, filtrado y ordenamiento en la plataforma de comercio electrónico de Liverpool.

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
* [Node.js](https://nodejs.org) (Versión LTS recomendada)
* [Git](https://git-scm.com)

## Cómo instalar y ejecutar localmente

1. Clona este repositorio en tu máquina local:
   ```bash
   git clone https://github.com
   ```
2. Navega a la carpeta raíz interna del proyecto (donde se encuentra el archivo `package.json` real):
   ```bash
   cd liverpool-playwright-automation/liverpool-playwright-automation
   ```
3. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```
4. Instala los navegadores e infraestructura necesarios para Playwright:
   ```bash
   npx playwright install --with-deps chromium
   ```

## Cómo correr en modo cabeza frente a sin cabeza

El proyecto está configurado para alternar su visualización mediante variables de entorno o banderas de consola nativas.

### Correr en Modo Sin Cabeza (Headless Mode)
Ideal para ejecuciones rápidas en segundo plano sin levantar ventanas gráficas:
```bash
npx playwright test
```

### Correr en Modo Cabeza (Headed Mode)
Útil para depurar o ver el navegador interactuando visualmente en tiempo real en tu pantalla:
```bash
npx playwright test --headed
```

### Correr con Interfaz Gráfica Avanzada (UI Mode)
Para explorar el árbol de pasos interactivamente, inspeccionar selectores y trazas:
```bash
npx playwright test --ui
```

## Ejecución de acciones en GitHub (CI)

Puedes consultar el historial de ejecuciones en la nube y el estado de salud de la compilación directamente en nuestra sección de [GitHub Actions](https://github.com).
