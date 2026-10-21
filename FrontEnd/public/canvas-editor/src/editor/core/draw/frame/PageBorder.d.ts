import { Draw } from '../Draw';
export declare class PageBorder {
    private draw;
    private header;
    private footer;
    private options;
    constructor(draw: Draw);
    render(ctx: CanvasRenderingContext2D, pageNo: number): void;
}
