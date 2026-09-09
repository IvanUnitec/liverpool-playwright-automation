import { Page, Response } from '@playwright/test';

export interface NetworkProduct {
  name: string;
  price: number;
}

export class NetworkProductsCollector {
  private products: NetworkProduct[] = [];

  start(page: Page): void {
    page.on('response', async (response: Response) => {
      const url = response.url();
      
      // Filtramos las respuestas que provienen del backend de búsqueda o catálogo de Liverpool
      if (url.includes('/plp') || url.includes('/v1/search') || url.includes('/catalogs') || response.request().resourceType() === 'fetch') {
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            const json = await response.json();
            
            // Navegamos de manera segura en la estructura JSON típica de Liverpool (records o contents)
            const records = json.plpResults?.records || json.records || json.contents?.[0]?.records || [];
            
            for (const record of records) {
              const name = record.productDisplayName || record.title || '';
              // Extraemos el precio preferente o de venta
              const price = record.skuPrice || record.listPrice || record.promoPrice || 0;
              
              if (name) {
                this.products.push({
                  name: name.trim(),
                  price: typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : price
                });
              }
            }
          }
        } catch (e) {
          // Ignora respuestas vacías o fallas de parseo menores
        }
      }
    });
  }

  async collectProducts(): Promise<NetworkProduct[]> {
    return this.products;
  }
}

export function compareUiWithNetwork(uiProducts: any[], networkProducts: any[]) {
  let matches = 0;
  const discrepancies: string[] = [];

  uiProducts.forEach(ui => {
    // Buscamos coincidencia parcial en el nombre por si la API trae textos más largos
    const match = networkProducts.find(net => 
      net.name.toLowerCase().includes(ui.name.toLowerCase()) || 
      ui.name.toLowerCase().includes(net.name.toLowerCase())
    );

    if (match) {
      matches++;
    } else {
      discrepancies.push(`No network match found for UI product: ${ui.name} ($${ui.price})`);
    }
  });

  return { matches, discrepancies };
}
