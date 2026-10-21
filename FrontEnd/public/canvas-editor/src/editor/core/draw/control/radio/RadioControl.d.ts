import { IControlContext, IControlRuleOption } from '../../../../interface/Control';
import { CheckboxControl } from '../checkbox/CheckboxControl';
export declare class RadioControl extends CheckboxControl {
    setSelect(codes: string[], context?: IControlContext, options?: IControlRuleOption): void;
}
