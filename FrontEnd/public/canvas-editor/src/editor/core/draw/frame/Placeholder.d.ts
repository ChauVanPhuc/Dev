import { IPlaceholder } from '../../../interface/Placeholder';
import { Draw } from '../Draw';
export interface IPlaceholderRenderOption {
    placeholder: Required<IPlaceholder>;
    startY?: number;
}
export declare class Placeholder {
    private draw;
    private position;
    private options;
    private elementList;
    private rowList;
    private positionList;
    constructor(draw: Draw);
    private _recovery;
    _compute(options?: IPlaceholderRenderOption): void;
    private _computeRowList;
    private _computePositionList;
    render(ctx: CanvasRenderingContext2D, options?: IPlaceholderRenderOption): void;
}
