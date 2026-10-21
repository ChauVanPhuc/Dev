import { IRowElement } from '../../../../../interface/Row';
export declare class IFrameBlock {
    static readonly sandbox: string[];
    static readonly allow: string[];
    private element;
    private iframe;
    private isReadonly;
    constructor(element: IRowElement);
    getIframe(): HTMLIFrameElement | null;
    private _defineIframeProperties;
    render(blockItemContainer: HTMLDivElement): void;
    setReadonly(readonly: boolean): void;
}
