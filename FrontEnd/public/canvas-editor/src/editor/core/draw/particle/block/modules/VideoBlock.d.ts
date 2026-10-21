import { IRowElement } from '../../../../../interface/Row';
export declare class VideoBlock {
    private element;
    protected videoCache: Map<string, HTMLVideoElement>;
    constructor(element: IRowElement);
    snapshot(ctx: CanvasRenderingContext2D, x: number, y: number): Promise<unknown>;
    render(blockItemContainer: HTMLDivElement): void;
}
