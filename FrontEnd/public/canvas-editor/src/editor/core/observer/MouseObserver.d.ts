import { Draw } from '../draw/Draw';
export declare class MouseObserver {
    private draw;
    private eventBus;
    private pageContainer;
    constructor(draw: Draw);
    private _mousemove;
    private _mouseenter;
    private _mouseleave;
    private _mousedown;
    private _mouseup;
    private _click;
}
