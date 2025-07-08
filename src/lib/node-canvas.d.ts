// Definisi tipe untuk node-canvas pada TypeScript
declare module 'canvas' {
  export class Canvas {
    constructor(width: number, height: number);
    getContext(contextId: '2d'): CanvasRenderingContext2D;
    toBuffer(): Buffer;
    width: number;
    height: number;
  }
  
  export class Image {
    src: string;
    onload: () => void;
    onerror: (err: Error) => void;
    width: number;
    height: number;
  }
  
  export class ImageData {
    constructor(width: number, height: number);
    constructor(data: Uint8ClampedArray, width: number, height?: number);
    data: Uint8ClampedArray;
    width: number;
    height: number;
  }
  
  export function createCanvas(width: number, height: number): Canvas;
  export function loadImage(src: string | Buffer): Promise<Image>;
  export function registerFont(path: string, options: { family: string, weight?: string, style?: string }): void;
} 