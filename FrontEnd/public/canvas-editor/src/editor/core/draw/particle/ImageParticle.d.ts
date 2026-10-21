import { DeepRequired } from '../../../interface/Common';
import { IEditorOption } from '../../../interface/Editor';
import { IElement } from '../../../interface/Element';
import { Draw } from '../Draw';
export declare class ImageParticle {
    private draw;
    protected options: DeepRequired<IEditorOption>;
    protected imageCache: Map<string, HTMLImageElement>;
    private container;
    private floatImageContainer;
    private floatImage;
    constructor(draw: Draw);
    getOriginalMainImageList(): IElement[];
    private _countImagesBeforeTarget;
    createFloatImage(element: IElement): void;
    dragFloatImage(movementX: number, movementY: number): void;
    destroyFloatImage(): void;
    protected addImageObserver(promise: Promise<unknown>): void;
    protected getFallbackImage(width: number, height: number): HTMLImageElement;
    private _drawImageWithCrop;
    private _renderCaption;
    render(ctx: CanvasRenderingContext2D, element: IElement, x: number, y: number): void;
}
