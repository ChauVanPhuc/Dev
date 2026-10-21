import { IAstNode } from './parser';
export interface IResolvedValue {
    code?: string | null;
    codes?: string[];
    text?: string | null;
    isDate?: boolean;
}
export type ResolveIdentifier = (name: string) => IResolvedValue | undefined;
export interface IEvalContext {
    resolve: ResolveIdentifier;
    resolveSelf?: () => IResolvedValue | undefined;
}
export declare function evaluate(node: IAstNode, context: IEvalContext): boolean;
export declare function evaluateValue(node: IAstNode, context: IEvalContext): string | number | null;
