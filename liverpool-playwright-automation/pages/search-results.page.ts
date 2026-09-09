import { expect, Locator, Page } from '@playwright/test';

export interface Product {
  name: string;
  price: number;
}

export class SearchResultsPage {
  private readonly page: Page;
  private readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder(/Buscar por producto, categoría y más/i).first();
  }

  async open(): Promise<void> {
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    await this.page.goto('/', { waitUntil: 'commit' }); 
    await this.page.waitForTimeout(3000);
    await expect(this.searchInput).toBeVisible();
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
    await this.page.waitForURL(/s=/i, { timeout: 15_000 }).catch(() => {});
    await this.page.waitForTimeout(5000); // Aumentamos a 5 segundos el colchón de carga
  }

  async filterByColor(color: string): Promise<void> {
    await this.page.locator('body').waitFor({ state: 'visible' });

    // 1. Localizador mejorado por CSS para la sección/botón de Color
    const colorSection = this.page.locator('[id*="color"], [class*="color"], text=/color/i').first();
    if (await colorSection.isVisible()) {
      await colorSection.click();
      await this.page.waitForTimeout(1000);
    }
    
    // 2. Buscamos de forma robusta la opción del color (ej. Blanco)
    const colorOption = this.page.locator(`label:has-text("${color}"), [id*="${color.toLowerCase()}"], text=/^${color}$/i`).last();
    await colorOption.scrollIntoViewIfNeeded().catch(() => {});
    await colorOption.click({ force: true }); // Usamos force:true por si hay un div encima encimado
    
    // 3. Espera breve para verificar que el filtro se procese
    await this.page.waitForTimeout(3000);
  }

  async sortLowToHigh(): Promise<void> {
    const sortDropdown = this.page.locator('select, [id*="sort"], button:has-text("Ordenar")').first();
    if (await sortDropdown.isVisible()) {
      if ((await sortDropdown.tagName()) === 'select') {
        await sortDropdown.selectOption({ index: 1 });
      } else {
        await sortDropdown.click();
        await this.page.waitForTimeout(1000);
        await this.page.getByText(/menor precio|precio de menor a mayor/i).first().click();
      }
    }
    await this.page.waitForTimeout(3000);
  }

  async extractFirstFive(): Promise<Product[]> {
    const productCards = this.page.locator('ol li, card, [class*="m-product-card"]').locator('visible=true');
    const products: Product[] = [];
    
    await this.page.waitForTimeout(2000);
    const count = Math.min(5, await productCards.count());

    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      const name = await card.locator('h5, [class*="card-title"]').first().innerText().catch(() => 'Producto sin nombre');
      const priceText = await card.locator('[class*="card-price"], p.a-card-discount').first().innerText().catch(() => '$0');
      
      const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
      products.push({ name: name.trim(), price });
    }

    return products;
  }
}
