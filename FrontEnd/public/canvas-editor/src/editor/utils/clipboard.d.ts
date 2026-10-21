import { DeepRequired } from '../interface/Common';
import { IEditorOption } from '../interface/Editor';
import { IElement } from '../interface/Element';
export interface IClipboardData {
    text: string;
    elementList: IElement[];
}
export declare function setClipboardData(data: IClipboardData): void;
export declare function getClipboardData(): IClipboardData | null;
export declare function removeClipboardData(): void;
export declare function writeClipboardItem(text: string, html: string, elementList: IElement[]): Promise<void>;
export declare function writeElementList(elementList: IElement[], options: DeepRequired<IEditorOption>): Promise<void>;
export declare function getIsClipboardContainFile(clipboardData: DataTransfer): boolean;
