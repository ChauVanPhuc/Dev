import { Draw } from '../draw/Draw';
export declare class CascadeManager {
    private draw;
    private control;
    private eventBus;
    private baselines;
    private controlBaselines;
    private valueCache;
    private isExecuting;
    private needsRerun;
    constructor(draw: Draw);
    private getZoneElementLists;
    private collectAll;
    private resolveIdentifier;
    private resolveIdentifierUncached;
    private resolveByControlId;
    private normalizeGetValueResult;
    private findTitleRangeElements;
    private recordBaseline;
    private writeWithBaseline;
    private restoreBaseline;
    private recordControlBaseline;
    private restoreControlBaseline;
    private applyAction;
    private applyComputes;
    executeAll(): void;
    private executePass;
}
