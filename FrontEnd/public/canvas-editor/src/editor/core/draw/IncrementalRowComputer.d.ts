import type { IComputeRange, IComputeRowListPayload, IIncrementalRowListResult } from '../../interface/Draw';
import type { IElement } from '../../interface/Element';
import type { IRow, IRowComputeState } from '../../interface/Row';
import type { Draw } from './Draw';
/**
 * 行级增量行计算器。
 *
 * 行边界是断行依赖链的重置点（行首 x 由容器状态决定），因此编辑只需从受影响行
 * 断点续算，与某个旧行结构状态收敛即停（通常 1~3 行），其后旧行原样复用。
 * y/pageNo 等位置状态不影响行内容，过期快照依然安全。
 *
 * 门控不满足时返回 null，调用方退回全量，行为与未开启时一致。
 */
export declare class IncrementalRowComputer {
    private draw;
    private readonly snapshotMap;
    private lastLayoutSignature;
    private dirtyElementList;
    private dirtyStartIndex;
    private dirtyEndIndex;
    private isLayoutDirty;
    constructor(draw: Draw);
    recordSnapshot(row: IRow, snapshot: IRowComputeState, firstElement?: IElement): void;
    /**
     * 记录主文档元素列表的一次修改区间（脏区间，增量续算提示）。
     * splice/delete 助手自动记录；少数直接 splice 的场景需显式调用。
     */
    markRangeDirty(elementList: IElement[], start: number, deleteCount: number, insertCount: number): void;
    markFullDirty(): void;
    consumeDirtyRange(): IComputeRange | undefined;
    findPageNoOfRow(row: IRow): number | undefined;
    /**
     * 尝试增量计算。成功返回合并后的行列表与首个变动行
     * （拆分跨页表格前的原始行列表），失败返回 null（调用方走全量）。
     */
    tryCompute(range: IComputeRange | undefined, payload: IComputeRowListPayload): IIncrementalRowListResult | null;
    observeLayout(): void;
    private getLayoutSignature;
    private _findRowIndexOfElement;
    private _isComplexElement;
    private _isStructuralEqual;
    private static readonly MAX_CASCADE_ELEMENT;
}
