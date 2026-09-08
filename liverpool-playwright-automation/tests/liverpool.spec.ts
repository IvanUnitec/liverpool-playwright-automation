import { test, expect } from '@playwright/test';
import { SearchResultsPage, Product } from '../pages/search-results.page';
import { NetworkProductsCollector, compareUiWithNetwork } from '../utils/network-products';

test.describe('Liverpool - Playwright e-commerce automation', () => {
  test('search, filter, sort and cross-validate UI vs network', async ({ page }) => {
    const network = new NetworkProductsCollector();
    network.start(page);

    const searchPage = new SearchResultsPage(page);

    await test.step('Navigate to Liverpool', async () => {
      await searchPage.open();
    });

    await test.step('Search for playstation 5', async () => {
      await searchPage.search('playstation 5');
    });

    await test.step('Filter by color Blanco', async () => {
      await searchPage.filterByColor('Blanco');
    });

    await test.step('Sort by price ascending', async () => {
      await searchPage.sortLowToHigh();
    });

    const uiProducts = await test.step('Extract first five UI products', async () => {
      const products = await searchPage.extractFirstFive();
      console.table(products);
      return products;
    });

    const networkProducts = await test.step('Parse intercepted product responses', async () => {
      const products = await network.collectProducts();
      console.log(`Network products collected: ${products.length}`);
      return products;
    });

    const validation = await test.step('Cross-validate UI and network', async () => {
      const result = compareUiWithNetwork(uiProducts, networkProducts);

      if (result.discrepancies.length) {
        console.warn('UI vs network discrepancies:');
        result.discrepancies.forEach(item => console.warn(`- ${item}`));
      }

      return result;
    });

    await test.step('Assert at least 3 of 5 UI products exist in network response', async () => {
      expect(
        validation.matches,
        `Expected at least 3 matching UI/network products. Discrepancies: ${validation.discrepancies.join(' | ')}`
      ).toBeGreaterThanOrEqual(3);
    });

    await test.step('Assert UI prices are sorted ascending', async () => {
      const prices = uiProducts.map((p: Product) => p.price);
      const sorted = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sorted);
    });
  });
});
