import { IElement } from '../../../interface/Element';
import { IRow } from '../../../interface/Row';
import { Draw } from '../Draw';
interface IRadioRenderOption {
    ctx: CanvasRenderingContext2D;
    x: number;
    y: number;
    row: IRow;
    index: number;
}
export declare class RadioParticle {
    private draw;
    private options;
    constructor(draw: Draw);
    setSelect(element: IElement): void;
    render(payload: IRadioRenderOption): void;
}
export {};
