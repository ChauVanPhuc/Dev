import { IControlContext, IControlInstance, IControlRuleOption } from '../../../../interface/Control';
import { IElement } from '../../../../interface/Element';
import { Control } from '../Control';
export declare class DateControl implements IControlInstance {
    private draw;
    private element;
    private control;
    private isPopup;
    private datePicker;
    private options;
    constructor(element: IElement, control: Control);
    setElement(element: IElement): void;
    getElement(): IElement;
    getIsPopup(): boolean;
    getValue(context?: IControlContext): IElement[];
    setValue(data: IElement[], context?: IControlContext, options?: IControlRuleOption): number;
    clearSelect(context?: IControlContext, options?: IControlRuleOption): number;
    setSelect(date: string, context?: IControlContext, options?: IControlRuleOption): void;
    keydown(evt: KeyboardEvent): number | null;
    cut(): number;
    awake(): void;
    destroy(): void;
    private _setDate;
}
