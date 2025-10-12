/**
 * Capture a DOM element (chart container) as a PNG data URL
 * Works best with SVG-based charts like Recharts
 */
export const captureElementToDataURL = async (
  element: HTMLElement,
  options: { scale?: number; backgroundColor?: string } = {}
): Promise<string> => {
  const { scale = 2, backgroundColor = '#ffffff' } = options;
  
  return new Promise((resolve, reject) => {
    try {
      // Find SVG element
      const svg = element.querySelector('svg');
      
      if (svg) {
        // Clone the SVG to avoid modifying the original
        const clonedSvg = svg.cloneNode(true) as SVGElement;
        
        // Get computed styles and inline them
        inlineStyles(svg, clonedSvg);
        
        // Get dimensions
        const bbox = svg.getBoundingClientRect();
        const width = bbox.width;
        const height = bbox.height;
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Fill background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Scale context
        ctx.scale(scale, scale);
        
        // Convert SVG to data URL
        const svgData = new XMLSerializer().serializeToString(clonedSvg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        // Load image and draw to canvas
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load SVG image'));
        };
        img.src = url;
      } else {
        // Fallback: use html2canvas if available
        reject(new Error('No SVG found in element'));
      }
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Inline computed styles from source to target SVG
 */
const inlineStyles = (source: SVGElement, target: SVGElement) => {
  const sourceElements = source.querySelectorAll('*');
  const targetElements = target.querySelectorAll('*');
  
  sourceElements.forEach((sourceEl, index) => {
    const targetEl = targetElements[index];
    if (!targetEl) return;
    
    const computedStyle = window.getComputedStyle(sourceEl);
    const styleString = Array.from(computedStyle)
      .map(key => `${key}:${computedStyle.getPropertyValue(key)}`)
      .join(';');
    
    targetEl.setAttribute('style', styleString);
  });
};

/**
 * Wait for a chart to fully render
 */
export const waitForChartRender = (delay: number = 300): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, delay));
};
