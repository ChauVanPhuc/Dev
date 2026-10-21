import { IControlContext, IControlInstance, IControlRuleOption } from '../../../../interface/Control';
import { IElement } from '../../../../interface/Element';
import { Control } from '../Control';
export declare class SelectControl implements IControlInstance {
    private draw;
    private element;
    private control;
    private isPopup;
    private selectDom;
    private options;
    private VALUE_DELIMITER;
    private DEFAULT_MULTI_SELECT_DELIMITER;
    constructor(element: IElement, control: Control);
    setElement(element: IElement): void;
    getElement(): IElement;
    getIsPopup(): boolean;
    getCodes(): string[];
    getText(codes: string[]): string | null;
    getValue(context?: IControlContext): IElement[];
    setValue(data: IElement[], context?: IControlContext, options?: IControlRuleOption): number;
    keydown(evt: KeyboardEvent): number | null;
    cut(): number;
    clearSelect(context?: IControlContext, options?: IControlRuleOption): number;
    setSelect(code: string, context?: IControlContext, options?: IControlRuleOption): void;
    private _createSelectPopupDom;
    awake(): void;
    destroy(): void;
}
