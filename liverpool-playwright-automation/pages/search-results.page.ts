import { expect, Locator, Page } from '@playwright/test';

export type Product = {
  name: string;  // Nombre del artículo
  price: number;  // Precio convertido a valor numérico flotante
};

export class SearchResultsPage {
  readonly page: Page;  // Instancia de la página del navegador proveída por Playwright

  constructor(page: Page) {
    this.page = page;
  }
  /**
   * @private Elemento de la interfaz de usuario
   * @description Localiza el cuadro de búsqueda principal usando una expresión regular (Regex) 
   */
  private get searchInput(): Locator {
    return this.page.getByPlaceholder(/Buscar por producto, categoría y más/i).first();
  }
  /**
   * @method open
   * @description Navega a la URL raíz (configurada en playwright.config) y espera a que el DOM básico cargue.
   */
  async open(): Promise<void> {
  // 1. Modifica la propiedad webdriver antes de que carguen los scripts de la página
  await this.page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  // 2. Cambia 'domcontentloaded' por 'commit' para interceptar la página antes
  await this.page.goto('/', { waitUntil: 'commit' }); 
  // 3. Agrega una pausa breve que simule el tiempo de reacción humano
  await this.page.waitForTimeout(3000);
  await expect(this.searchInput).toBeVisible();
  }
  /**
   * @method search
   * @description Simula la escritura de un producto y presiona Enter para ejecutar la consulta.
   * Valida que la URL cambie al entorno de la tienda.
   */
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page).toHaveURL(/\/tienda/i);
    await this.page.waitForTimeout(1200);
  }
  /**
   * @method filterByColor
   * @description Interactúa de forma dinámica con los modales laterales de filtrado. 
   * Expande la sección de colores, selecciona el color especificado y aplica los resultados.
   */
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
  /**
   * @method sortLowToHigh
   * @description Accede al menú desplegable de ordenamiento y selecciona ordenar de menor a mayor precio.
   */
  async sortLowToHigh(): Promise<void> {
    const sortButton = this.page.getByText(/Ordenar/i).first();
    await sortButton.click();

    const option = this.page.getByText(/Precio.*menor.*mayor|menor.*mayor.*precio/i).last();
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click();

    await this.page.waitForTimeout(1500);
  }
  /**
   * @method extractFirstFive
   * @description Ejecuta un script del lado del navegador (Evaluate) muy eficiente para extraer, 
   * limpiar, estructurar y de-duplicar los datos de las primeras 5 tarjetas de productos visibles.
   */
  async extractFirstFive(): Promise<Product[]> {
    const cards = this.page.locator('a[href*="/tienda/pdp/"]');
    await expect(cards.first()).toBeVisible({ timeout: 20_000 });

    const products = await cards.evaluateAll((elements) => {
      const normalize = (value: string) =>
        value.replace(/\s+/g, ' ').replace(/\$/g, '').trim();

      const parsed: Product[] = [];
      const seen = new Set<string>(); // Evita registrar productos duplicados en el listado final

      for (const el of elements) {
        const text = normalize(el.textContent ?? '');
        // Extrae el precio aislando los números mediante expresiones regulares
        const priceMatches = [...text.matchAll(/\$?\s*([\d,]+(?:\.\d{2})?)/g)];
        if (!priceMatches.length) continue;
        // Convierte el string del precio en numerico
        const price = Number(priceMatches[0][1].replace(/,/g, ''));
        const lines = (el.textContent ?? '')
          .split(/\n+/)
          .map(x => normalize(x))
          .filter(Boolean);
         // Separa el bloque de texto por saltos de línea para buscar el nombre real del producto
        const name = lines.find(x => !/^\$?\s*[\d,]+(?:\.\d{2})?$/.test(x)) ?? '';
        if (!name || !Number.isFinite(price)) continue;
        // Clave única compuesta para control de duplicados
        const key = `${name}|${price}`;
        if (!seen.has(key)) {
          seen.add(key);
          parsed.push({ name, price });
        }
        // Limita la recolección estricta a los primeros 5 artículos requeridos
        if (parsed.length === 5) break;
      }
      return parsed;
    });
     // Control de calidad: Lanza una excepción controlada si el catálogo web renderizó menos de 5 productos
    if (products.length < 5) {
      throw new Error(`Expected at least 5 products, but extracted ${products.length}.`);
    }

    return products.slice(0, 5);
  }
}
