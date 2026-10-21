import { IAreaBadge, IBadge } from '../../../interface/Badge';
import { Draw } from '../Draw';
export declare class Badge {
    private draw;
    private options;
    private imageCache;
    private mainBadge;
    private areaBadgeMap;
    constructor(draw: Draw);
    setMainBadge(payload: IBadge | null): void;
    setAreaBadgeMap(payload: IAreaBadge[]): void;
    private _drawImage;
    render(ctx: CanvasRenderingContext2D, pageNo: number): void;
}
