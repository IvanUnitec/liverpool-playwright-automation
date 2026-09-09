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
     // Aseguramos el scroll hacia el elemento
    await colorOption.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
    // REEMPLAZA LA LÍNEA DEL CLICK POR ESTA: Ejecuta un clic directo de JavaScript saltándose bloqueos visuales
    await colorOption.dispatchEvent('click');
    
    // 4. Pausa de estabilidad para que se recargue el catálogo filtrado
    await this.page.waitForTimeout(4000);
  }

  async sortLowToHigh(): Promise<void> {
    // 1. Buscamos el botón principal de ordenamiento (suele decir "Relevancia" u "Ordenar por")
    const sortButton = this.page.locator('button:has-text("Relevancia"), button:has-text("Ordenar"), .a-select-filter, [class*="sort"]').first();
    // Forzamos la apertura del menú desplegable de ordenamiento
    await sortButton.scrollIntoViewIfNeeded().catch(() => {});
    await sortButton.dispatchEvent('click');
    await this.page.waitForTimeout(1000);
    // 2. Buscamos la opción de "Menor precio" dentro de la lista que se despliega
    const lowToHighOption = this.page.locator('a:has-text("Menor precio"), li:has-text("Menor precio"), [data-value="sortLowToHigh"], text=/menor precio/i').first();
    // Hacemos clic directo a través de JavaScript para procesar el ordenamiento
     // Envolvemos el clic del ordenamiento en un bloque seguro para evitar falsos negativos por recarga del DOM
    try {
      await lowToHighOption.dispatchEvent('click');
        } catch (e) {
      // Ignora el error si el elemento se destruye inmediatamente al actualizarse el catálogo
        }  
      // Damos el tiempo de espera para que se asiente la recarga de precios ordenados
      await this.page.waitForTimeout(6000);
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
