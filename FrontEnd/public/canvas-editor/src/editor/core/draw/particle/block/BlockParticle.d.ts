import { IIframeInfo } from '../../../../interface/Block';
import { IRowElement } from '../../../../interface/Row';
import { Draw } from '../../Draw';
export declare class BlockParticle {
    private draw;
    private options;
    private container;
    private blockContainer;
    private blockMap;
    constructor(draw: Draw);
    private _createBlockContainer;
    getDraw(): Draw;
    getBlockContainer(): HTMLDivElement;
    render(ctx: CanvasRenderingContext2D, pageNo: number, element: IRowElement, x: number, y: number): void;
    clear(): void;
    update(): void;
    drawIframeToPage(pageList: HTMLCanvasElement[], snapDomFunction: (iframe: HTMLIFrameElement) => Promise<string>): Promise<void>;
    pickIframeInfo(): IIframeInfo[][];
}
