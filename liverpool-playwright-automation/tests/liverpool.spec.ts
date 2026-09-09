import { test as baseTest, expect } from '@playwright/test';
import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { SearchResultsPage, Product } from '../pages/search-results.page';
import { NetworkProductsCollector, compareUiWithNetwork } from '../utils/network-products';

// Configura el plugin de ocultación avanzado antes de iniciar las pruebas
chromium.use(stealthPlugin());

// Sobrescribimos el fixture "page" nativo para usar la instancia camuflada con Stealth
const test = baseTest.extend<{ page: any }>({
  page: async ({}, use) => {
    // 1. Lanzamos Chromium aplicando el argumento para ocultar la automatización
    const browser = await chromium.launch({
      args: ['--disable-blink-features=AutomationControlled']
    });
    
    // 2. Creamos el contexto con el tamaño de pantalla grande y el User-Agent real
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    await use(page);
    await browser.close();
  },
});

test.describe('Liverpool - Playwright e-commerce automation', () => {
  test('search, filter, sort and cross-validate UI vs network', async ({ page }) => {
    const network = new NetworkProductsCollector();
    network.start(page);

    const searchPage = new SearchResultsPage(page);
    
    // Abre el sitio web principal de Liverpool
    await test.step('Navigate to Liverpool', async () => {
      await searchPage.open();
    });

    // Escribe 'playstation 5' en la barra de búsqueda y presiona Enter
    await test.step('Search for playstation 5', async () => {
      await searchPage.search('playstation 5');
    });

    // Aplica el filtro lateral izquierdo seleccionando el color 'Blanco'
    await test.step('Filter by color Blanco', async () => {
      await searchPage.filterByColor('Blanco');
    });

    // Cambia el ordenamiento del catálogo para mostrar los productos de menor a mayor precio
    await test.step('Sort by price ascending', async () => {
      await searchPage.sortLowToHigh();
    });

    // Extrae de la pantalla (HTML) la información visible de los primeros 5 productos (Nombre y Precio)
    const uiProducts = await test.step('Extract first five UI products', async () => {
      const products = await searchPage.extractFirstFive();
      console.table(products);
      return products;
    });

    // Obtiene la lista completa de productos que Liverpool a través de sus respuestas JSON (API)
    const networkProducts = await test.step('Parse intercepted product responses', async () => {
      const products = await network.collectProducts();
      console.log(`Network products collected: ${products.length}`);
      return products;
    });

    // Compara la información extraída de la interfaz gráfica contra los datos reales de la red (API)
    const validation = await test.step('Cross-validate UI and network', async () => {
      const result = compareUiWithNetwork(uiProducts, networkProducts);
      // Si se encuentran inconsistencias entre lo que ve el usuario y lo que manda el servidor, imprime advertencia
      if (result.discrepancies.length) {
        console.warn('UI vs network discrepancies:');
        result.discrepancies.forEach(item => console.warn(`- ${item}`));
      }

      return result;
    });

    // Verifica que al menos 3 de los 5 productos pintados en la pantalla existan en la respuesta del backend
    await test.step('Assert at least 3 of 5 UI products exist in network response', async () => {
      expect(
        validation.matches,
        `Expected at least 3 matching UI/network products. Discrepancies: ${validation.discrepancies.join(' | ')}`
      ).toBeGreaterThanOrEqual(3);
    });

    // Valida numérica de los precios de la interfaz de usuario ordenados de menor a mayor
    await test.step('Assert UI prices are sorted ascending', async () => {
      const prices = uiProducts.map((p: Product) => p.price);
      const sorted = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sorted);
    });
  });
});
