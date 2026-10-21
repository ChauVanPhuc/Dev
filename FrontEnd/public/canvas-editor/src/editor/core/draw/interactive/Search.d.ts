import { IElement, IElementPosition } from '../../../interface/Element';
import { IReplaceOption, ISearchOption, ISearchResult } from '../../../interface/Search';
import { Draw } from '../Draw';
export interface INavigateInfo {
    index: number;
    count: number;
}
export declare class Search {
    private draw;
    private options;
    private position;
    private range;
    private searchKeyword;
    private searchNavigateIndex;
    private searchOptions;
    private searchMatchList;
    constructor(draw: Draw);
    getSearchKeyword(): string | null;
    setSearchKeyword(payload: string | null, options?: ISearchOption): void;
    private getSearchMatchGroupStartIndex;
    searchNavigatePre(): number | null;
    searchNavigateNext(): number | null;
    searchNavigateScrollIntoView(position: IElementPosition): void;
    getSearchNavigateIndexList(): number[];
    getSearchMatchList(): ISearchResult[];
    getSearchNavigateInfo(): null | INavigateInfo;
    getMatchList(payload: string, originalElementList: IElement[]): ISearchResult[];
    compute(payload: string): void;
    render(ctx: CanvasRenderingContext2D, pageIndex: number): void;
    replace(payload: string, option?: IReplaceOption): void;
    private replaceWithTrace;
}
