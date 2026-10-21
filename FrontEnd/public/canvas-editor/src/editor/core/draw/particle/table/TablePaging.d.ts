import { IElement, ITableRowFragment } from '../../../../interface/Element';
import { IRow } from '../../../../interface/Row';
import { Draw } from '../../Draw';
export declare class TablePaging {
    private draw;
    private options;
    private tableParticle;
    constructor(draw: Draw);
    splitTableRowAcrossPages(rowList: IRow[]): IRow[];
    truncateTableByFragment(element: IElement, fragment: ITableRowFragment, elementList: IElement[]): boolean;
    private _trimTdContentToWindow;
    private _repairTableContextAfterTruncate;
}
