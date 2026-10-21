export declare enum TokenType {
    IDENT = "IDENT",
    STRING = "STRING",
    NUMBER = "NUMBER",
    BOOLEAN = "BOOLEAN",
    NULL = "NULL",
    SELF = "SELF",
    OP = "OP",
    LPAREN = "LPAREN",
    RPAREN = "RPAREN",
    LBRACKET = "LBRACKET",
    RBRACKET = "RBRACKET",
    COMMA = "COMMA"
}
export interface IToken {
    type: TokenType;
    value: string;
}
export declare function tokenize(source: string): IToken[];
