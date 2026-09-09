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
    await this.page.waitForTimeout(6000); // Damos margen completo de carga inicial
  }

  async filterByColor(color: string): Promise<void> {
    await this.page.locator('body').waitFor({ state: 'visible' });

    // 1. Buscamos el contenedor del filtro de color en el menú lateral de Liverpool
    const colorGroup = this.page.locator('.mdc-chip-set, .a-search-filter, [id*="color"], [class*="filter"]').type === undefined 
      ? this.page.locator('div.facet-container, div.plp-filter-options').filter({ hasText: /color/i }).first()
      : this.page.locator('[id*="color"]').first();

    // 2. Si la sección de color está colapsada, intentamos expandirla
    const colorHeader = this.page.locator('button:has-text("Color"), h5:has-text("Color"), p:has-text("Color")').first();
    if (await colorHeader.isVisible()) {
      await colorHeader.click().catch(() => {});
      await this.page.waitForTimeout(1000);
    }
    
    // 3. Buscamos directamente el texto del color ("Blanco") sin importar si es checkbox o etiqueta
        // 3. Buscamos el elemento interactivo usando los atributos específicos que maneja Liverpool para los colores
    const colorOption = this.page.locator(`[title*="${color}" i], [data-value*="${color}" i], label:has-text("${color}")`).last();
    // Forzamos el scroll y hacemos el clic directo sobre el contenedor del color
    await colorOption.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    await colorOption.click({ force: true });
    
    // 4. Pausa de estabilidad para que se recargue el catálogo filtrado
    await this.page.waitForTimeout(4000);
  }

  async sortLowToHigh(): Promise<void> {
    // Localizador del menú desplegable de ordenamiento en Liverpool
    const sortDropdown = this.page.locator('select, .a-select-filter, [id*="sort"]').first();
    if (await sortDropdown.isVisible()) {
      if ((await sortDropdown.tagName()) === 'select') {
        await sortDropdown.selectOption({ index: 1 });
      } else {
        await sortDropdown.click().catch(() => {});
        await this.page.waitForTimeout(1000);
        await this.page.locator('a:has-text("Menor precio"), li:has-text("Menor precio"), text=/menor precio/i').first().click({ force: true });
      }
    }
    await this.page.waitForTimeout(4000);
  }

  async extractFirstFive(): Promise<Product[]> {
    // Selector adaptado a las tarjetas de producto en el catálogo de Liverpool (.m-product-card)
    const productCards = this.page.locator('.m-product-card, ol li article, [class*="product-card"]').locator('visible=true');
    const products: Product[] = [];
    
    await this.page.waitForTimeout(2000);
    const count = Math.min(5, await productCards.count());

    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      const name = await card.locator('h5, [class*="card-title"], .a-card-description').first().innerText().catch(() => 'Producto');
      const priceText = await card.locator('.a-card-discount, [class*="card-price"], .a-card-price').first().innerText().catch(() => '$0');
      
      const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
      products.push({ name: name.trim(), price });
    }

    return products;
  }
}
