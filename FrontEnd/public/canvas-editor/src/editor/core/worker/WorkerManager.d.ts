import { Draw } from '../draw/Draw';
import { ICatalog } from '../../interface/Catalog';
import { IEditorResult } from '../../interface/Editor';
import { IGetValueOption } from '../../interface/Draw';
export declare class WorkerManager {
    private draw;
    private wordCountWorker;
    private catalogWorker;
    private groupWorker;
    private valueWorker;
    constructor(draw: Draw);
    getWordCount(): Promise<number>;
    getCatalog(): Promise<ICatalog | null>;
    getGroupIds(): Promise<string[]>;
    getValue(options?: IGetValueOption): Promise<IEditorResult>;
    destroy(): void;
}
