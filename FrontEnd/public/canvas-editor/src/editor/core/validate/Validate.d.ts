import { IControlValidateResult, IValidateOption } from '../../interface/Control';
import { Draw } from '../draw/Draw';
export declare class Validate {
    private draw;
    private control;
    private i18n;
    private highlightedControlIds;
    private lastErrorBackgroundColor;
    constructor(draw: Draw);
    private collectControlElements;
    private getNormalizedValue;
    private isHidden;
    private t;
    private validateControl;
    private walkAllControlElements;
    private applyHighlight;
    clearHighlight(): void;
    execute(payload?: IValidateOption): IControlValidateResult[];
}
