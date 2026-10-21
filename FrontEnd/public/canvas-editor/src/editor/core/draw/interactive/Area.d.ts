import { Draw } from '../Draw';
import { IAreaInfo, IDeleteAreaOption, IGetAreaValueOption, IGetAreaValueResult, IInsertAreaOption, ILocationAreaOption, ISetAreaPropertiesOption, ISetAreaValueOption } from '../../../interface/Area';
import { IRange } from '../../../interface/Range';
import { IRow } from '../../../interface/Row';
import { IElementPosition } from '../../../interface/Element';
export declare class Area {
    private draw;
    private zone;
    private range;
    private position;
    private options;
    private areaInfoMap;
    constructor(draw: Draw);
    getAreaInfo(): Map<string, IAreaInfo>;
    getActiveAreaId(): string | null;
    getActiveAreaInfo(): IAreaInfo | null;
    isReadonly(): boolean;
    insertArea(payload: IInsertAreaOption): string | null;
    render(ctx: CanvasRenderingContext2D, pageNo: number): void;
    compute(): void;
    /**
     * 收集区域补高的跨页延续段：
     * 结转标记在区域后续行时，起点 = 结转行内容顶部 - 本行全部偏移（即页内容区顶部）；
     * 结转标记在区域末行自身时（区域位于文档末尾），延续段位于下一空白页顶部
     */
    private computePaddingSegmentList;
    private computeAreaInfo;
    private computeTableAreaInfo;
    /**
     * 应用区域最小高度：按区域分组连续行累计内容高度，
     * 不足 minHeight 时将差值补充到区域末行行高（区域顶部间距不计入内容高度）
     */
    applyMinHeight(rowList: IRow[]): void;
    getAreaValue(options?: IGetAreaValueOption): IGetAreaValueResult | null;
    getContextByAreaId(areaId: string, options?: ILocationAreaOption): {
        range: IRange;
        elementPosition: IElementPosition;
    } | null;
    setAreaProperties(payload: ISetAreaPropertiesOption): void;
    setAreaValue(payload: ISetAreaValueOption): void;
    deleteArea(options?: IDeleteAreaOption): void;
}
