import { IToken } from './tokenizer';
export type IAstNode = {
    type: 'logical';
    op: '&&' | '||';
    left: IAstNode;
    right: IAstNode;
} | {
    type: 'not';
    argument: IAstNode;
} | {
    type: 'compare';
    op: string;
    left: IAstNode;
    right: IAstNode;
} | {
    type: 'arithmetic';
    op: string;
    left: IAstNode;
    right: IAstNode;
} | {
    type: 'literal';
    value: unknown;
} | {
    type: 'getValue';
    target: {
        kind: 'id';
        value: string;
    } | {
        kind: 'self';
    };
} | {
    type: 'call';
    name: string;
    args: IAstNode[];
};
export declare function parse(tokens: IToken[]): IAstNode;
