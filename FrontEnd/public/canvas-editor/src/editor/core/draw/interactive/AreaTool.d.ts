import { Draw } from '../Draw';
export declare class AreaTool {
    private readonly BORDER_VALUE;
    private readonly MIN_AREA_HEIGHT;
    private draw;
    private canvas;
    private options;
    private container;
    private toolBorder;
    private anchorLine;
    private mousedownY;
    private lastAnchorKey;
    constructor(draw: Draw);
    dispose(): void;
    render(): void;
    private _mousedown;
    private _mousemove;
}
