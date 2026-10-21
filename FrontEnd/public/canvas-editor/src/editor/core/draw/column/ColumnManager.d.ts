import { IColumnLayout, IColumnOption } from '../../../interface/Column';
import { PaperDirection } from '../../../dataset/enum/Editor';
import { Draw } from '../Draw';
export declare class ColumnManager {
    private draw;
    private options;
    private layoutMap;
    constructor(draw: Draw);
    computeLayout(innerWidth: number, config: IColumnOption | undefined): IColumnLayout | null;
    compute(): void;
    getLayout(direction?: PaperDirection): IColumnLayout | null;
    setConfig(config: IColumnOption | null | undefined): void;
    getOffset(columnIndex: number | undefined, direction?: PaperDirection): number;
    drawSeparator(ctx: CanvasRenderingContext2D, pageNo: number): void;
}
