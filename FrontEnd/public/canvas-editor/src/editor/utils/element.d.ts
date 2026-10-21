import { LocationPosition } from '../dataset/enum/Common';
import { RowFlex } from '../dataset/enum/Row';
import { DeepRequired } from '../interface/Common';
import { IEditorOption } from '../interface/Editor';
import { IElement } from '../interface/Element';
export declare function isElementTraceDeleted(element: IElement): boolean;
export declare function getNonDeletedElementList(elementList: IElement[]): IElement[];
export declare function getNonTraceElementList(elementList: IElement[]): IElement[];
export declare function unzipElementList(elementList: IElement[]): IElement[];
interface IFormatElementListOption {
    isHandleFirstElement?: boolean;
    isForceCompensation?: boolean;
    editorOptions: DeepRequired<IEditorOption>;
}
export declare function formatElementList(elementList: IElement[], options: IFormatElementListOption): void;
export declare function isSameElementExceptValue(source: IElement, target: IElement): boolean;
interface IPickElementOption {
    extraPickAttrs?: Array<keyof IElement>;
}
export declare function pickElementAttr(payload: IElement, option?: IPickElementOption): IElement;
interface IZipElementListOption {
    extraPickAttrs?: Array<keyof IElement>;
    isClassifyArea?: boolean;
    isClone?: boolean;
    isListValue?: boolean;
}
export declare function zipElementList(payload: IElement[], options?: IZipElementListOption): IElement[];
export declare function convertTextAlignToRowFlex(node: HTMLElement): RowFlex;
export declare function convertRowFlexToTextAlign(rowFlex: RowFlex): "justify" | RowFlex.LEFT | RowFlex.CENTER | RowFlex.RIGHT | RowFlex.JUSTIFY;
export declare function convertRowFlexToJustifyContent(rowFlex: RowFlex): "center" | "flex-start" | "flex-end" | "space-between";
export declare function isTextLikeElement(element: IElement): boolean;
export declare function isTextElement(element: IElement): boolean;
export declare function getElementListText(elementList: IElement[]): string;
export declare function getAnchorElement(elementList: IElement[], anchorIndex: number): IElement | null;
export interface IFormatElementContextOption {
    isBreakWhenWrap?: boolean;
    ignoreContextKeys?: Array<keyof IElement>;
    editorOptions?: DeepRequired<IEditorOption>;
}
export declare function formatElementContext(sourceElementList: IElement[], formatElementList: IElement[], anchorIndex: number, options?: IFormatElementContextOption): void;
export declare function convertElementToDom(element: IElement, options: DeepRequired<IEditorOption>): HTMLElement;
export declare function splitListElement(elementList: IElement[]): Map<number, IElement[]>;
export interface IElementListGroupRowFlex {
    rowFlex: RowFlex | null;
    data: IElement[];
}
export declare function groupElementListByRowFlex(elementList: IElement[]): IElementListGroupRowFlex[];
export declare function createDomFromElementList(elementList: IElement[], options?: IEditorOption): HTMLDivElement;
export declare function convertTextNodeToElement(textNode: Element | Node): IElement | null;
export interface IGetElementListByHTMLOption {
    innerWidth: number;
}
export declare function getElementListByHTML(htmlText: string, options: IGetElementListByHTMLOption): IElement[];
export declare function getTextFromElementList(elementList: IElement[], options?: {
    isClone?: boolean;
}): string;
export declare function getSlimCloneElementList(elementList: IElement[]): IElement[];
export declare function getIsBlockElement(element?: IElement): boolean;
export declare function replaceHTMLElementTag(oldDom: HTMLElement, tagName: keyof HTMLElementTagNameMap): HTMLElement;
export declare function pickSurroundElementList(elementList: IElement[]): IElement[];
export declare function deleteSurroundElementList(elementList: IElement[], pageNo: number): void;
export declare function getNonHideElementIndex(elementList: IElement[], index: number, position?: LocationPosition, isHidden?: (element: IElement) => boolean): number;
/**
 * 嵌套感知的边界步进：从 index 按方向移动一位。
 * 若落点 controlId 与 ownerId 相同，返回落点；
 * 若落点 controlId 不同（进入了内层控件段），持续同向步进直到回到 ownerId 或越界。
 * 用于替换边界扫描循环里的 i++ / i--。
 */
export declare function scanToOwner(elementList: IElement[], index: number, direction: 1 | -1, ownerId: string): number;
/**
 * 查找位置所属的最外层控件 controlId。
 * 通过向左扫找到当前控件的 PREFIX，递归检查 PREFIX 前一位是否仍在另一控件段内。
 */
export declare function getOutermostOwner(elementList: IElement[], index: number): string | null;
export declare function visitElementTree(elementList: IElement[], visitor: (element: IElement) => void): void;
export {};
