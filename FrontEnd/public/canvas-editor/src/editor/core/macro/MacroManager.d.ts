import type { Command } from '../command/Command';
import type { IMacro, IRecordedMacro, IScriptMacro, IMacroHandler } from '../../interface/Macro';
export declare class MacroManager {
    private macros;
    private recording;
    private isPlaying;
    private command;
    constructor(command: Command);
    isRecording(): boolean;
    startRecording(): void;
    stopRecording(name: string): IRecordedMacro | null;
    cancelRecording(): void;
    play(idOrName: string, ...args: unknown[]): Promise<void>;
    getMacros(): IMacro[];
    getMacro(idOrName: string): IMacro | undefined;
    removeMacro(idOrName: string): boolean;
    exportMacros(): string;
    importMacros(json: string, options?: {
        overwrite?: boolean;
    }): void;
    register(name: string, handler: IMacroHandler): IScriptMacro;
    unregister(idOrName: string): boolean;
    private findMacro;
    private logStep;
}
