import { IContentChange, IControlChange, IControlContentChange, IIntersectionPageNoChange, IPageModeChange, IPageScaleChange, IPageSizeChange, IRangeStyleChange, ISaved, IVisiblePageNoListChange, IZoneChange } from '../../interface/Listener';
export declare class Listener {
    rangeStyleChange: IRangeStyleChange | null;
    visiblePageNoListChange: IVisiblePageNoListChange | null;
    intersectionPageNoChange: IIntersectionPageNoChange | null;
    pageSizeChange: IPageSizeChange | null;
    pageScaleChange: IPageScaleChange | null;
    saved: ISaved | null;
    contentChange: IContentChange | null;
    controlChange: IControlChange | null;
    controlContentChange: IControlContentChange | null;
    pageModeChange: IPageModeChange | null;
    zoneChange: IZoneChange | null;
    constructor();
}
