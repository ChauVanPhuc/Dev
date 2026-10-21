import { IElement, IElementMetrics, IElementPosition } from '../../../interface/Element';
import { IRow, IRowElement } from '../../../interface/Row';
import { IMarkElementListDeletedOption } from '../../../interface/Trace';
import { Draw } from '../Draw';
interface ITraceRenderContext {
    ctx: CanvasRenderingContext2D;
    element: IRowElement;
    x: number;
    y: number;
    curRow: IRow;
    metrics: IElementMetrics;
    offsetY: number;
    scale: number;
}
export declare class TraceParticle {
    private draw;
    private options;
    private container;
    private tracePopupContainer;
    private listDom;
    private lastHoverKey;
    private strikeoutState;
    private underlineState;
    private currentRow;
    constructor(draw: Draw);
    private _createTracePopupDom;
    drawTracePopup(element: IElement, position: IElementPosition | undefined, pageNo: number): void;
    clearTracePopup(): void;
    handleMouseMove(evt: MouseEvent): void;
    private _getTraceFlags;
    render(context: ITraceRenderContext): void;
    flush(ctx: CanvasRenderingContext2D): void;
    private _flushStrikeout;
    private _flushUnderline;
    isTraceHidden(element: IElement): boolean;
    private _markElementList;
    markElementListInserted(elementList: IElement[]): void;
    markElementListDeleted(elementList: IElement[], options?: IMarkElementListDeletedOption): IElement[];
}
export {};
