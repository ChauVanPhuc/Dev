import type { ITablePositionContext } from './Position';
export interface ISpellcheckOption {
    disabled?: boolean;
    color?: string;
}
export interface ISpellcheckContext {
    tableId?: string;
    tableIndex?: number;
    trIndex?: number;
    tdIndex?: number;
    tablePath?: ITablePositionContext[];
}
export interface ISpellcheckWord extends ISpellcheckContext {
    word: string;
    startIndex: number;
    endIndex: number;
}
export interface ISpellcheckRange extends ISpellcheckContext {
    startIndex: number;
    endIndex: number;
    data?: unknown;
}
export interface ISpellcheckClickPayload {
    evt: MouseEvent;
    range: ISpellcheckRange;
}
export type ISpellcheckClick = (payload: ISpellcheckClickPayload) => void;
