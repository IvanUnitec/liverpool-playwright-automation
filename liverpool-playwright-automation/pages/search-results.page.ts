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
    await this.page.waitForLoadState('networkidle');
  }

  async filterByColor(color: string): Promise<void> {
    const filterButton = this.page.locator('button:has-text("Filtrar"), [data-testid="filter-button"], text=/Filtrar/i').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
    }
    
    const colorSection = this.page.getByText(/color/i).first();
    if (await colorSection.isVisible()) {
      await colorSection.click();
    }
    
    const colorOption = this.page.getByText(new RegExp(`^${color}$`, 'i')).last();
    await expect(colorOption).toBeVisible({ timeout: 15_000 });
    await colorOption.click();
    
    const apply = this.page.getByRole('button', { name: /aplicar|mostrar resultados|ver resultados/i }).last();
    if (await apply.count()) {
      await apply.click();
    }
    await this.page.waitForLoadState('networkidle');
  }

  async sortLowToHigh(): Promise<void> {
    const sortDropdown = this.page.locator('select, [id*="sort"], button:has-text("Ordenar")').first();
    if (await sortDropdown.isVisible()) {
      if ((await sortDropdown.tagName()) === 'select') {
        await sortDropdown.selectOption({ index: 1 });
      } else {
        await sortDropdown.click();
        await this.page.getByText(/menor precio|precio de menor a mayor/i).first().click();
      }
    }
    await this.page.waitForLoadState('networkidle');
  }

  async extractFirstFive(): Promise<Product[]> {
    const productCards = this.page.locator('ol li, card, [class*="m-product-card"]').locator('visible=true');
    const products: Product[] = [];
    const count = Math.min(5, await productCards.count());

    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      const name = await card.locator('h5, [class*="card-title"]').first().innerText();
      const priceText = await card.locator('[class*="card-price"], p.a-card-discount').first().innerText();
      
      const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      products.push({ name: name.trim(), price });
    }

    return products;
  }
}
