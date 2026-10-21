import { Draw } from '../draw/Draw';
import { CanvasEvent } from '../event/CanvasEvent';
export declare class CursorAgent {
    private draw;
    private container;
    private agentCursorDom;
    private canvasEvent;
    private eventBus;
    constructor(draw: Draw, canvasEvent: CanvasEvent);
    getAgentCursorDom(): HTMLTextAreaElement;
    private _keyDown;
    private _input;
    private _paste;
    private _compositionstart;
    private _compositionend;
}
