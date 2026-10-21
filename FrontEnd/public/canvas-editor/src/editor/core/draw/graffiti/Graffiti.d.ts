import { IGraffitiData } from '../../../interface/Graffiti';
import { Draw } from '../Draw';
export declare class Graffiti {
    private draw;
    private options;
    private data;
    private pageContainer;
    private isDrawing;
    private startStroke;
    constructor(draw: Draw, data?: IGraffitiData[]);
    private register;
    private start;
    private stop;
    private drawing;
    getValue(): IGraffitiData[];
    compute(): void;
    clear(): void;
    render(ctx: CanvasRenderingContext2D, pageNo: number): void;
}
