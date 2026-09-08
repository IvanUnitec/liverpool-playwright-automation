import { expect, Locator, Page } from '@playwright/test';

export type Product = {
  name: string;
  price: number;
};

export class SearchResultsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private get searchInput(): Locator {
    return this.page.getByPlaceholder(/Buscar por producto, categoría y más/i).first();
  }

  async open(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(this.searchInput).toBeVisible();
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page).toHaveURL(/\/tienda/i);
    await this.page.waitForTimeout(1200);
  }

  async filterByColor(color: string): Promise<void> {
    const filterButton = this.page.getByText(/Filtrar/i).first();
    await filterButton.click();

    const colorSection = this.page.getByText(/^Color$/i).first();
    if (await colorSection.count()) {
      await colorSection.click();
    }

    const colorOption = this.page.getByText(new RegExp(`^${color}$`, 'i')).last();
    await expect(colorOption).toBeVisible({ timeout: 15_000 });
    await colorOption.click();

    const apply = this.page.getByRole('button', { name: /aplicar|mostrar resultados|ver resultados/i }).last();
    if (await apply.count()) {
      await apply.click();
    }

    await this.page.waitForTimeout(1500);
  }

  async sortLowToHigh(): Promise<void> {
    const sortButton = this.page.getByText(/Ordenar/i).first();
    await sortButton.click();

    const option = this.page.getByText(/Precio.*menor.*mayor|menor.*mayor.*precio/i).last();
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click();

    await this.page.waitForTimeout(1500);
  }

  async extractFirstFive(): Promise<Product[]> {
    const cards = this.page.locator('a[href*="/tienda/pdp/"]');
    await expect(cards.first()).toBeVisible({ timeout: 20_000 });

    const products = await cards.evaluateAll((elements) => {
      const normalize = (value: string) =>
        value.replace(/\s+/g, ' ').replace(/\$/g, '').trim();

      const parsed: Product[] = [];
      const seen = new Set<string>();

      for (const el of elements) {
        const text = normalize(el.textContent ?? '');
        const priceMatches = [...text.matchAll(/\$?\s*([\d,]+(?:\.\d{2})?)/g)];
        if (!priceMatches.length) continue;

        const price = Number(priceMatches[0][1].replace(/,/g, ''));
        const lines = (el.textContent ?? '')
          .split(/\n+/)
          .map(x => normalize(x))
          .filter(Boolean);

        const name = lines.find(x => !/^\$?\s*[\d,]+(?:\.\d{2})?$/.test(x)) ?? '';
        if (!name || !Number.isFinite(price)) continue;

        const key = `${name}|${price}`;
        if (!seen.has(key)) {
          seen.add(key);
          parsed.push({ name, price });
        }
        if (parsed.length === 5) break;
      }
      return parsed;
    });

    if (products.length < 5) {
      throw new Error(`Expected at least 5 products, but extracted ${products.length}.`);
    }

    return products.slice(0, 5);
  }
}
