import { Control } from '../Control';
interface CalculatorOptions {
    control: Control;
    onCalculate: (result: number) => void;
}
export declare class Calculator {
    private control;
    private calculatorDom;
    private onCalculate;
    private currentExpression;
    constructor(options: CalculatorOptions);
    createPopup(): void;
    destroy(): void;
    private calculate;
}
export {};
