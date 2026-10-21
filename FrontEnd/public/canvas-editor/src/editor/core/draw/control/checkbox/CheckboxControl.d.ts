import { IControlContext, IControlInstance, IControlRuleOption } from '../../../../interface/Control';
import { IElement } from '../../../../interface/Element';
import { Control } from '../Control';
export declare class CheckboxControl implements IControlInstance {
    protected element: IElement;
    protected control: Control;
    constructor(element: IElement, control: Control);
    setElement(element: IElement): void;
    getElement(): IElement;
    getCode(): string | null;
    getValue(): IElement[];
    setValue(): number;
    setSelect(codes: string[], context?: IControlContext, options?: IControlRuleOption): void;
    keydown(evt: KeyboardEvent): number | null;
    cut(): number;
}
