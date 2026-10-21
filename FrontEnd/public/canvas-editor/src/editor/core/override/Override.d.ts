export interface IOverrideResult {
    preventDefault?: boolean;
}
export declare class Override {
    paste: ((evt?: ClipboardEvent) => unknown | IOverrideResult) | undefined;
    pasteImage: ((file: File | Blob) => unknown | IOverrideResult) | undefined;
    copy: (() => unknown | IOverrideResult) | undefined;
    drop: ((evt: DragEvent) => unknown | IOverrideResult) | undefined;
}
