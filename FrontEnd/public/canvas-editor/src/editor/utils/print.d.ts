import { PaperDirection } from '../dataset/enum/Editor';
import { IIframeInfo } from '../interface/Block';
interface IPrintOption {
    width: number;
    height: number;
    direction?: PaperDirection;
    pageDirections?: PaperDirection[];
    iframeInfoList?: IIframeInfo[][];
}
export declare function print(base64List: string[], options: IPrintOption): Promise<void>;
export {};
