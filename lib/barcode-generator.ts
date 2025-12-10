import JsBarcode from 'jsbarcode';

/**
 * Generate barcode as base64 data URL
 */
export function generateBarcodeBase64(text: string, options?: any): string {
  const canvas = document.createElement('canvas');
  
  JsBarcode(canvas, text, {
    format: 'CODE128',
    width: 2,
    height: 50,
    displayValue: true,
    fontSize: 14,
    margin: 10,
    ...options,
  });

  return canvas.toDataURL('image/png');
}

/**
 * Generate barcode for order (server-side compatible)
 * Returns SVG string
 */
export function generateBarcodeSVG(text: string, options?: any): string {
  // Create a temporary SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  
  JsBarcode(svg, text, {
    format: 'CODE128',
    width: 2,
    height: 50,
    displayValue: true,
    fontSize: 14,
    margin: 10,
    xmlDocument: document,
    ...options,
  });

  return svg.outerHTML;
}

/**
 * Generate barcode as data URL (for use in PDFs)
 */
export function generateBarcodeDataURL(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      
      JsBarcode(canvas, text, {
        format: 'CODE128',
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 14,
        margin: 10,
      });

      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    } catch (error) {
      reject(error);
    }
  });
}

