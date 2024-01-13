import { Directive, Input, inject } from "@angular/core";
import { DateAdapter, MAT_DATE_FORMATS } from "@angular/material/core";
import { MatDatepickerInput, MatEndDate, MatStartDate } from "@angular/material/datepicker";
import { Caret, NovaMaskInput } from "./mask.directive";
import { isDate, numberBetween } from "@ngx-nova/js-extensions";
import { _addMissingDateComponents } from "./internal/functions";

type DatePart = { start: number; end: number; separator: number; };
@Directive({
    selector: `input:[inputmode=date][dateFormat],input:[matDatepicker][dateFormat],
               input:[nvEndDate][dateFormat],input:[nvStartDate][dateFormat],
               input:[matEndDate][dateFormat],input:[matStartDate][dateFormat]`,
    standalone: true,
})
export class DateMaskInput<D> extends NovaMaskInput {

    private _dateParts?: { day: DatePart; month: DatePart; year: DatePart; };
    private dateAdapter = inject(DateAdapter<D>, { optional: true });
    private _datePickerInput = inject(MatDatepickerInput<D>, { optional: true });
    private _dateRangeStartInput = inject(MatStartDate<D>, { optional: true });
    private _dateRangeEndInput = inject(MatEndDate<D>, { optional: true });
    private dateFormats = inject(MAT_DATE_FORMATS, { optional: true });

    override get clearOnInvalid() { return false; }

    @Input() get dateFormat(): string | undefined | null {
        return super.mask;
    }
    set dateFormat(value: string | undefined | null) {
        if (value) {
            value = _addMissingDateComponents(value);
            const day = _getFormatPosition(value, 'd', 2);
            const month = _getFormatPosition(value, 'M', 2);
            const year = _getFormatPosition(value, 'y', 4);
            this._dateParts = { day, month, year };
            value = value.replace('dd', '39').replace('MM', '19').replace('yyyy', '9999');
        }
        super.mask = value;
    }

    protected override maskChanged(): void {
        const _picker = this._datePickerInput ?? this._dateRangeStartInput ?? this._dateRangeEndInput;
        const value = _picker ? _picker.value : this.value;
        setTimeout(() => this.writeValue(value));
    }

    protected override onKeyDown(event: KeyboardEvent, position?: Caret | undefined): void {
        if (!position || position.begin == null || !this._dateParts)
            return;
        let step = 0;
        switch (event.key) {
            case 'ArrowUp':
                step = 1;
                event.preventDefault();
                break;
            case 'ArrowDown':
                step = -1;
                event.preventDefault();
                break;
        }
        if (step == 0)
            return;
        let stepChanged = this._changeStep(this._dateParts.day, position.begin, event, step, 31);
        if (!stepChanged)
            stepChanged = this._changeStep(this._dateParts.month, position.begin, event, step, 12);
        if (!stepChanged)
            stepChanged = this._changeStep(this._dateParts.year, position.begin, event, step, 9999, 4);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    override writeValue(value: any): void {
        if (isDate(value) && this.dateAdapter && this.dateFormats)
            value = this.dateAdapter.format(value, this.dateFormats.display.dateInput);
        super.writeValue(value);
    }

    protected override changeModel(value: unknown, raiseInputEvent: boolean): void {
        if (value && this.dateAdapter && this.dateFormats) {
            if (typeof value === 'string')
                value = value.replace(new RegExp(this.placeHolderChar, 'g'), '');
            value = this.dateAdapter.parse(value, this.dateFormats.parse.dateInput);
        }

        super.changeModel(value, raiseInputEvent);
    }

    private _changeStep(part: DatePart | undefined, position: number, event: Event, step: number, max: number, partLength: number = 2) {
        if (part && numberBetween(position, part.start, part.end + part.separator)) {
            const value = this.buffer.slice(part.start, part.end + 1).map(p => p.replace(this.placeHolderChar, '')).join('');
            let v = +value;
            v += step;
            if (numberBetween(v, 1, max)) {
                const parts = (v + '').padStart(partLength, '0').split('');;
                let partIndex = 0;
                for (let i = part.start; i <= part.end && partIndex <= parts.length; i++) {
                    this.buffer[i] = parts[partIndex];
                    partIndex++;
                }
                this.writeBuffer();
                this.caret(part.start, part.end + 1);
                this.update(event);
            }
            return true;
        }
        return false;
    }
}

function _getFormatPosition(format: string, key: string, length: number) {
    let separator = 0;
    const start = format.indexOf(key);
    const end = start >= 0 ? start + length - 1 : -1;
    if (end === format.length - 1)
        separator = 1;
    else
        separator = format.slice(end + 1).match(/[dMy]/)?.index ?? 0;
    return { start, end, separator };
}