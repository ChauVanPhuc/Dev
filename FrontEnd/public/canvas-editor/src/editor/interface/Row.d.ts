import { PaperDirection } from '../dataset/enum/Editor';
import { RowFlex } from '../dataset/enum/Row';
import { IElement, IElementMetrics, IElementPosition, ITableRowFragment } from './Element';
import { IMargin } from './Margin';
import { ITd } from './table/Td';
export type IRowElement = IElement & {
    metrics: IElementMetrics;
    style: string;
    left?: number;
};
export interface IRow {
    width: number;
    height: number;
    ascent: number;
    rowFlex?: RowFlex;
    startIndex: number;
    isPageBreak?: boolean;
    paperDirection?: PaperDirection;
    isList?: boolean;
    listIndex?: number;
    offsetX?: number;
    offsetY?: number;
    spacingAfter?: number;
    areaPadding?: {
        areaId: string;
        height: number;
    };
    areaPaddingCarry?: {
        areaId: string;
        height: number;
    };
    elementList: IRowElement[];
    isWidthNotEnough?: boolean;
    rowIndex: number;
    isSurround?: boolean;
    columnIndex?: number;
    tableFragment?: ITableRowFragment;
    fragmentPosition?: IElementPosition;
    repeatTdPositionList?: {
        td: ITd;
        positionList: IElementPosition[];
    }[];
}
export interface IRowComputeState {
    rowIndex: number;
    x: number;
    y: number;
    pageNo: number;
    pageStartY: number;
    direction: PaperDirection;
    margins: IMargin;
    innerWidth: number;
    startX: number;
    pageHeight: number;
    column: number;
    controlRealWidth: number;
    listIndexMap: Map<string, number>;
}
