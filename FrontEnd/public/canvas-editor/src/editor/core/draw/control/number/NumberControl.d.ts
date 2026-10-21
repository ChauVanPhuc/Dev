import { IControlContext, IControlRuleOption } from '../../../../interface/Control';
import { IElement } from '../../../../interface/Element';
import { TextControl } from '../text/TextControl';
export declare class NumberControl extends TextControl {
    private isPopup;
    private calculator;
    constructor(element: IElement, control: any);
    getIsPopup(): boolean;
    setValue(data: IElement[], context?: IControlContext, options?: IControlRuleOption): number;
    private _setCalculatedValue;
    awake(): void;
    destroy(): void;
}
