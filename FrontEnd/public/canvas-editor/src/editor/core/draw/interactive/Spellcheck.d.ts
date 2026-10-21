import type { ISpellcheckContext, ISpellcheckRange, ISpellcheckWord } from '../../../interface/Spellcheck';
import type { Draw } from '../Draw';
export declare class Spellcheck {
    private options;
    private draw;
    private position;
    private segmenter;
    private spellcheckRangeList;
    constructor(draw: Draw);
    private _isElementHidden;
    getSpellcheckRangeList(): ISpellcheckRange[];
    private _appendWordList;
    private _collectWordList;
    getSpellcheckWordList(): ISpellcheckWord[];
    setSpellcheckRangeList(payload: ISpellcheckRange[] | null): boolean;
    private _isSameTablePath;
    getRangeByIndex(index: number, context?: ISpellcheckContext): ISpellcheckRange | null;
    private _drawWave;
    render(ctx: CanvasRenderingContext2D, pageIndex: number): void;
}
