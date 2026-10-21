import { IElement } from '../../../interface/Element';
import { IRow } from '../../../interface/Row';
import { Draw } from '../Draw';
interface ICheckboxRenderOption {
    ctx: CanvasRenderingContext2D;
    x: number;
    y: number;
    row: IRow;
    index: number;
}
export declare class CheckboxParticle {
    private draw;
    private options;
    constructor(draw: Draw);
    setSelect(element: IElement): void;
    render(payload: ICheckboxRenderOption): void;
}
export {};
