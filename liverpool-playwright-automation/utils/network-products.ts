import { Page, Response } from '@playwright/test';
import type { Product } from '../pages/search-results.page';

export class NetworkProductsCollector {
  private readonly responses: Response[] = [];

  start(page: Page): void {
    page.on('response', response => {
      const type = response.request().resourceType();
      const contentType = response.headers()['content-type'] ?? '';

      if (type === 'fetch' || type === 'xhr' || contentType.includes('application/json')) {
        this.responses.push(response);
      }
    });
  }

  async collectProducts(): Promise<Product[]> {
    const all: Product[] = [];

    for (const response of this.responses) {
      try {
        const contentType = response.headers()['content-type'] ?? '';
        if (!contentType.includes('json')) continue;

        const body = await response.json();
        const candidates = this.findProducts(body);

        for (const product of candidates) {
          if (!all.some(p => this.sameProduct(p, product))) {
            all.push(product);
          }
        }
      } catch {
        // Some XHR responses are not readable JSON or expire; ignore them.
      }
    }

    return all;
  }

  private findProducts(value: unknown): Product[] {
    if (!value || typeof value !== 'object') return [];

    const result: Product[] = [];
    const walk = (node: any): void => {
      if (!node || typeof node !== 'object') return;

      if (Array.isArray(node)) {
        for (const item of node) walk(item);
        return;
      }

      const name = this.pickString(node, ['name', 'productName', 'displayName', 'productTitle']);
      const price = this.pickNumber(node, ['price', 'salePrice', 'sellingPrice', 'currentPrice']);

      if (name && price !== undefined && this.looksLikeProduct(node)) {
        result.push({ name: name.trim(), price });
      }

      for (const value of Object.values(node)) walk(value);
    };

    walk(value);
    return result;
  }

  private looksLikeProduct(node: Record<string, unknown>): boolean {
    const keys = Object.keys(node).map(k => k.toLowerCase());
    return keys.some(k =>
      k.includes('product') ||
      k.includes('sku') ||
      k.includes('price') ||
      k.includes('brand')
    );
  }

  private pickString(node: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = node[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
    return undefined;
  }

  private pickNumber(node: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
      const value = node[key];

      if (typeof value === 'number' && Number.isFinite(value)) return value;

      if (typeof value === 'string') {
        const normalized = value.replace(/[$,\s]/g, '');
        const parsed = Number(normalized);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    return undefined;
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private sameProduct(a: Product, b: Product): boolean {
    return this.normalizeName(a.name) === this.normalizeName(b.name)
      && Math.abs(a.price - b.price) < 0.01;
  }
}

export function compareUiWithNetwork(
  uiProducts: Product[],
  networkProducts: Product[]
): { matches: number; discrepancies: string[] } {
  const discrepancies: string[] = [];

  const normalize = (value: string) =>
    value.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  for (const ui of uiProducts) {
    const byName = networkProducts.find(n => normalize(n.name) === normalize(ui.name));

    if (!byName) {
      discrepancies.push(
        `UI product not found in network: "${ui.name}" | UI price: ${ui.price}`
      );
      continue;
    }

    if (Math.abs(byName.price - ui.price) >= 0.01) {
      discrepancies.push(
        `Price mismatch: "${ui.name}" | UI: ${ui.price} | Network: ${byName.price}`
      );
      continue;
    }
  }

  const matches = uiProducts.filter(ui => {
    const found = networkProducts.find(n => normalize(n.name) === normalize(ui.name));
    return !!found && Math.abs(found.price - ui.price) < 0.01;
  }).length;

  return { matches, discrepancies };
}
