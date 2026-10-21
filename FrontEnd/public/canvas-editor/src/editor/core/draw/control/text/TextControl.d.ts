import { DeepRequired } from '../../../../interface/Common';
import { IControlContext, IControlInstance, IControlRuleOption } from '../../../../interface/Control';
import { IEditorOption } from '../../../../interface/Editor';
import { IElement } from '../../../../interface/Element';
import { Control } from '../Control';
export declare class TextControl implements IControlInstance {
    protected element: IElement;
    protected control: Control;
    protected options: DeepRequired<IEditorOption>;
    constructor(element: IElement, control: Control);
    setElement(element: IElement): void;
    getElement(): IElement;
    getValue(context?: IControlContext): IElement[];
    setValue(data: IElement[], context?: IControlContext, options?: IControlRuleOption): number;
    clearValue(context?: IControlContext, options?: IControlRuleOption): number;
    keydown(evt: KeyboardEvent): number | null;
    cut(): number;
}
