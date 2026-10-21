import { Draw } from '../draw/Draw';
import { CanvasEvent } from './CanvasEvent';
export declare class GlobalEvent {
    private draw;
    private options;
    private cursor;
    private canvasEvent;
    private range;
    private previewer;
    private tableTool;
    private areaTool;
    private hyperlinkParticle;
    private hintParticle;
    private control;
    private magnifier;
    private dateParticle;
    private imageParticle;
    private dprMediaQueryList;
    constructor(draw: Draw, canvasEvent: CanvasEvent);
    register(): void;
    private addEvent;
    removeEvent(): void;
    clearSideEffect: (evt: Event) => void;
    setCanvasEventAbility: () => void;
    watchCursorActive(): void;
    setPageScale: (evt: WheelEvent) => void;
    private _handleVisibilityChange;
    private _handleDprChange;
}
