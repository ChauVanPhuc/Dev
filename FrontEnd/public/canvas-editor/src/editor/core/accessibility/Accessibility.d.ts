import { Draw } from '../draw/Draw';
export declare class Accessibility {
    private draw;
    private i18n;
    private disabled;
    private assertiveDom;
    private rangeChangeHandler;
    constructor(draw: Draw);
    private handleRangeChange;
    selection(): void;
    input(data: string): void;
    assertive(message: string): void;
    destroy(): void;
}
