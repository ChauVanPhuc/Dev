import { NumberType } from '../../../dataset/enum/Common';
import { Draw } from '../Draw';
export declare class PageNumber {
    private draw;
    private options;
    constructor(draw: Draw);
    static formatNumberPlaceholder(text: string, pageNo: number, replaceReg: RegExp, numberType: NumberType): string;
    render(ctx: CanvasRenderingContext2D, pageNo: number): void;
}
