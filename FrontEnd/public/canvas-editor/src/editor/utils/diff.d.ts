import { IElement } from '../interface/Element';
export interface IDiffOp {
    type: 'equal' | 'insert' | 'delete';
    value: string;
}
export declare function diffText(oldText: string, newText: string): IDiffOp[];
export declare function compareElementList(oldList: IElement[], newList: IElement[]): IElement[];
