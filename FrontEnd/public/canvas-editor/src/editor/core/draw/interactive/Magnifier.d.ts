import { Draw } from '../Draw';
export declare class Magnifier {
    private draw;
    private options;
    private canvas;
    private isActive;
    private container;
    constructor(draw: Draw);
    private _createMagnifierCanvas;
    private _addEvent;
    private _removeEvent;
    private _handleKeyDown;
    private _handleKeyUp;
    private _mousemove;
    show(): void;
    hide(): void;
    private _update;
    destroy(): void;
}
