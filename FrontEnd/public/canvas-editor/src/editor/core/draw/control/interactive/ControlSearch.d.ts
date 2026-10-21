import { IControlHighlight, IControlHighlightRule } from '../../../../interface/Control';
import { IElement } from '../../../../interface/Element';
import { ISearchResult } from '../../../../interface/Search';
import { Control } from '../Control';
type IHighlightMatchResult = (ISearchResult & IControlHighlightRule)[];
export declare class ControlSearch {
    private draw;
    private control;
    private options;
    private highlightList;
    private highlightMatchResult;
    constructor(control: Control);
    getControlHighlight(elementList: IElement[], index: number): string;
    getHighlightMatchResult(): IHighlightMatchResult;
    getHighlightList(): IControlHighlight[];
    setHighlightList(payload: IControlHighlight[]): void;
    computeHighlightList(): void;
    renderHighlightList(ctx: CanvasRenderingContext2D, pageIndex: number): void;
}
export {};
