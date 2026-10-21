import { IElementPosition } from '../../../interface/Element';
import { ITd } from '../../../interface/table/Td';
import { Draw } from '../Draw';
interface IHintHit {
    hint: string;
    position?: IElementPosition;
    td?: ITd;
}
export declare class HintParticle {
    private draw;
    private options;
    private container;
    private hintPopupContainer;
    private hintDom;
    private lastHoverKey;
    constructor(draw: Draw);
    private _createHintPopupDom;
    private _getElementHint;
    drawHintPopup(hit: IHintHit, pageNo: number): void;
    clearHintPopup(): void;
    handleMouseMove(evt: MouseEvent): void;
}
export {};
