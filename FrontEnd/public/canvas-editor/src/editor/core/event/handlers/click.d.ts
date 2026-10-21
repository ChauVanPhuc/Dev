import { IRange } from '../../../interface/Range';
import { CanvasEvent } from '../CanvasEvent';
export declare function getWordRangeBySegmenter(host: CanvasEvent): IRange | null;
export declare function getWordRangeByCursor(host: CanvasEvent): IRange | null;
declare function dblclick(host: CanvasEvent, evt: MouseEvent): void;
declare function threeClick(host: CanvasEvent): void;
declare const _default: {
    dblclick: typeof dblclick;
    threeClick: typeof threeClick;
};
export default _default;
