import { IColgroup } from '../interface/table/Colgroup';
export declare function getColgroupWidth(colgroup: IColgroup[]): number;
export declare function shrinkColgroupToWidth(colgroup: IColgroup[], maxWidth: number, minWidth: number): void;
export declare function scaleColgroupToWidth(colgroup: IColgroup[], targetWidth: number): void;
