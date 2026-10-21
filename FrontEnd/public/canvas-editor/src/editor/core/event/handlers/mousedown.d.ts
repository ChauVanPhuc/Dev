import { CanvasEvent } from '../CanvasEvent';
import { IElement } from '../../../interface/Element';
import { Draw } from '../../draw/Draw';
export declare function setRangeCache(host: CanvasEvent): void;
export declare function hitCheckbox(element: IElement, draw: Draw): void;
export declare function hitRadio(element: IElement, draw: Draw): void;
export declare function mousedown(evt: MouseEvent, host: CanvasEvent): void;
