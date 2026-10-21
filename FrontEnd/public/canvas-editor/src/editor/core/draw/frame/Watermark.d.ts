import { Draw } from '../Draw';
export declare class Watermark {
    private draw;
    private options;
    private imageCache;
    constructor(draw: Draw);
    renderText(ctx: CanvasRenderingContext2D, pageNo: number): void;
    renderImage(ctx: CanvasRenderingContext2D, pageNo: number): void;
    render(ctx: CanvasRenderingContext2D, pageNo: number): void;
}
