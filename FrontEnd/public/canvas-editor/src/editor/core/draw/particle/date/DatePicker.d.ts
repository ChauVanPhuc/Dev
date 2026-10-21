import { IElementPosition } from '../../../../interface/Element';
import { Draw } from '../../Draw';
export interface IDatePickerLang {
    now: string;
    confirm: string;
    return: string;
    timeSelect: string;
    weeks: {
        sun: string;
        mon: string;
        tue: string;
        wed: string;
        thu: string;
        fri: string;
        sat: string;
    };
    year: string;
    month: string;
    months: {
        jan: string;
        feb: string;
        mar: string;
        apr: string;
        may: string;
        jun: string;
        jul: string;
        aug: string;
        sep: string;
        oct: string;
        nov: string;
        dec: string;
    };
    hour: string;
    minute: string;
    second: string;
}
export interface IDatePickerOption {
    onSubmit?: (date: string) => void;
}
interface IRenderOption {
    value: string;
    position: IElementPosition;
    dateFormat?: string;
}
export declare class DatePicker {
    private draw;
    private options;
    private now;
    private dom;
    private renderOptions;
    private isDatePicker;
    private pickDate;
    private lang;
    private datePickerType;
    private viewMode;
    private yearPageStart;
    constructor(draw: Draw, options?: IDatePickerOption);
    private _createDom;
    private _bindEvent;
    private _setPosition;
    isInvalidDate(value: Date): boolean;
    private _setValue;
    private _getDatePickerType;
    private _getLang;
    private _setLangChange;
    private _update;
    private _updateTitleVisibility;
    private _updateDateView;
    private _updateYearView;
    private _updateMonthView;
    private _switchView;
    private _toggleDateTimePicker;
    private _createDate;
    private _setDatePick;
    private _setTimePick;
    private _preMonth;
    private _nextMonth;
    private _preYear;
    private _nextYear;
    private _preYearPage;
    private _nextYearPage;
    private _now;
    private _toggleVisible;
    private _submit;
    formatDate(date: Date, format?: string): string;
    render(option: IRenderOption): void;
    dispose(): void;
    destroy(): void;
}
export {};
