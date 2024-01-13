import { DOCUMENT, isPlatformBrowser } from "@angular/common";
import { Directive, ElementRef, Input, OnInit, PLATFORM_ID, booleanAttribute, inject } from "@angular/core";
import { NG_VALUE_ACCESSOR } from "@angular/forms";
import { createValueAccessorInterceptor } from "@ngx-nova/cdk/shared";
export type Caret = { begin: number; end: number };
type Browser = { chromeAndroid: boolean, android: boolean, iPhone: boolean };
@Directive({
    selector: `input:not([type=number])[mask], 
    input:not([type=date])[mask], 
    input:not([inputmode=decimal])[mask], 
    input:not([inputmode=numeric])[mask]
    input:not([inputmode=date])[mask],
    `,
    standalone: true,
    exportAs: 'maskInput',
    host: {
        '(input)': '_onInput($event)',
        '(blur)': '_onBlur($event)',
        '(focus)': '_onFocus($event)',
        '(keydown)': '_onKeyDown($event)',
        '(keypress)': '_onKeyPress($event)',
        '(paste)': '_onPaste($event)'
    }
})
export class NovaMaskInput implements OnInit {

    private _mask?: string | null;
    private _browser: Browser = { android: false, chromeAndroid: false, iPhone: false };
    private tests: (RegExp | null)[] = [];
    private maskLength: number = 0;
    private oldVal?: string;
    private firstNonMaskPos?: number | null;
    private defaultBuffer?: string;
    private focusText?: string;
    private caretTimeoutId: number | undefined;
    private partialPosition: number = 0;
    private lastRequiredNonMaskPos?: number | null;
    private _internalEvent = false;

    private _initialized = false;
    private readonly _inputEvent = new Event('input', { bubbles: true, cancelable: false });

    protected _elementRef: ElementRef<HTMLInputElement> = inject(ElementRef);
    private document = inject(DOCUMENT, { optional: true });
    private platformId = inject(PLATFORM_ID);
    private inputValueAccessors = inject(NG_VALUE_ACCESSOR, { optional: true, self: true });
    private readonly _acceesorProxy = createValueAccessorInterceptor(this.inputValueAccessors, v => this.writeValue(v));
    private get readonly() { return this._elementRef?.nativeElement.readOnly; }

    protected value?: string;
    protected buffer: string[] = [];
    private _clearOnInvalid: boolean = true;

    //#region inputs

    @Input() placeHolderChar: string = '_';
    @Input({ transform: booleanAttribute }) useUnmaskValue: boolean = false;
    @Input({ transform: booleanAttribute })
    get clearOnInvalid(): boolean { return this._clearOnInvalid };
    set clearOnInvalid(value: boolean) { this._clearOnInvalid = value };

    @Input() get mask(): string | undefined | null {
        return this._mask;
    }
    set mask(value: string | undefined | null) {
        this._mask = value;
        if (this._initialized) {
            this.initMask();
            this.maskChanged();
        }
    }

    //#endregion

    //#region events

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onKeyDown(event: KeyboardEvent, position?: Caret) { }

    protected writeBuffer() {
        this._elementRef.nativeElement.value = this.buffer.join('');
    }
    protected changeModel(value: unknown, raiseInputEvent: boolean) {
        if (raiseInputEvent)
            this.dispatchInputEvent();
        this._acceesorProxy?.change(value);
    }

    protected maskChanged() {
        this.writeValue(this.value);
    }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            const ua = navigator.userAgent;
            this._browser.android = /android/i.test(ua);
            this._browser.chromeAndroid = this._browser.android && /chrome/i.test(ua);
            this._browser.iPhone = /iphone/i.test(ua);
        }

        this.initMask();
        this._initialized = true;
    }

    _onInput(event: Event) {
        if (!this.maskLength || this._internalEvent)
            return;

        if (this._browser.chromeAndroid)
            this.handleAndroidInput(event);
        else
            this.handleInputChange(event);
    }

    _onBlur(e: Event) {
        if (!this.maskLength)
            return;
        this.checkVal();
        if (this._elementRef?.nativeElement.value != this.focusText || this._elementRef?.nativeElement.value != this.value) {
            this.updateModel(e, false);
            this._elementRef.nativeElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: false }));
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _onFocus(event: Event) {
        if (!this.maskLength || this.readonly)
            return;

        clearTimeout(this.caretTimeoutId);
        const el = this._elementRef.nativeElement;
        this.focusText = el.value;
        const pos = this.checkVal();

        this.caretTimeoutId = setTimeout(() => {
            if (el !== el.ownerDocument.activeElement)
                return;
            this.writeBuffer();
            if (pos == this.mask?.replace('?', '').length)
                this.caret(0, pos);
            else
                this.caret(pos);
        }, 10);
    }

    _onKeyDown(e: KeyboardEvent) {
        if (!this.maskLength || this.readonly)
            return;
        const k = e.key;
        let pos,
            begin,
            end;
        this.oldVal = this._elementRef?.nativeElement.value;
        //backspace, delete, and escape get special treatment
        if (k === 'Delete' || k === 'Backspace' || (this._browser.iPhone && k === 'Escape')) {
            pos = this.caret() as Caret;
            begin = pos.begin;
            end = pos.end;
            if (end - begin === 0) {
                begin = k !== 'Delete' ? this.seekPrev(begin) : (end = this.seekNext(begin - 1));
                end = k === 'Delete' ? this.seekNext(end) : end;
            }

            this.clearBuffer(begin, end);
            this.shiftL(begin, end - 1);
            this.updateModel(e, true);
            e.preventDefault();
        } else if (k === 'Enter') {
            this._onBlur(e);
            this.updateModel(e, true);
        } else if (k === 'Escape') {
            (this._elementRef as ElementRef).nativeElement.value = this.focusText;
            this.caret(0, this.checkVal());
            this.updateModel(e, true);
            e.preventDefault();
        } else {
            this.onKeyDown(e, this.caret());
        }
    }

    _onKeyPress(e: KeyboardEvent) {
        if (!this.maskLength || this.readonly)
            return;

        const k = e.key, pos = this.caret() as Caret;
        let p: number,
            c: string,
            next: number,
            completed: boolean = false;

        if (e.ctrlKey || e.altKey || e.metaKey) {
            //Ignore
            return;
        } else if (k && k !== 'Enter') {
            if (pos.end - pos.begin !== 0) {
                this.clearBuffer(pos.begin, pos.end);
                this.shiftL(pos.begin, pos.end - 1);
            }

            p = this.seekNext(pos.begin - 1);
            if (p < this.maskLength) {
                c = e.key;
                if (this.tests?.[p]?.test(c)) {
                    this.shiftR(p);

                    this.buffer[p] = c;
                    this.writeBuffer();
                    next = this.seekNext(p);

                    if (this._browser.android) {
                        const proxy = () => this.caret(next);
                        setTimeout(proxy, 0);
                    } else {
                        this.caret(next);
                    }
                    if (pos.begin <= (this.lastRequiredNonMaskPos as number))
                        completed = this.isCompleted();
                }
            }
            e.preventDefault();
        }

        this.updateModel(e, true);
        if (completed) {
            this._onComplete();
        }
    }

    protected dispatchInputEvent(): void {
        this._internalEvent = true;
        this._elementRef.nativeElement.dispatchEvent(this._inputEvent);
        this._internalEvent = false;
    }

    _onPaste(e: Event) {
        if (!this.maskLength || this.readonly) {
            return;
        }

        this.handleInputChange(e);
    }

    //#endregion

    //#region private methods

    private initMask() {
        this.maskLength = this.mask?.length || 0;
        if (this.maskLength == 0) {
            return;
        }

        this.tests = [];
        this.buffer = [];
        this.partialPosition = this.maskLength;

        this.firstNonMaskPos = null;
        const defs: Record<string, string> = {
            '#': '[0-9]',
            '1': '[0-1]',
            '2': '[0-2]',
            '3': '[0-3]',
            '4': '[0-4]',
            '5': '[0-5]',
            '6': '[0-6]',
            '7': '[0-7]',
            '8': '[0-8]',
            '9': '[0-9]',
            a: '[A-Za-z]',
            '*': '[A-Za-z]|[0-9]'
        };

        const maskTokens = this.mask!.split('');
        this.buffer = [];
        for (let i = 0; i < maskTokens.length; i++) {
            const c = maskTokens[i];
            if (c == '?') {
                this.maskLength--;
                this.partialPosition = i;
            } else if (defs[c]) {
                this.tests.push(new RegExp(defs[c]));
                if (this.firstNonMaskPos === null) {
                    this.firstNonMaskPos = this.tests.length - 1;
                }
                if (i < this.partialPosition)
                    this.lastRequiredNonMaskPos = this.tests.length - 1;
                this.buffer.push(this.getPlaceholder(i));

            } else {
                this.tests.push(null);
                this.buffer.push(c);
            }
        }

        this.defaultBuffer = this.buffer.join('');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected writeValue(value: any): void {
        if (!this.maskLength)
            return;
        this.value = value;
        const el = this._elementRef?.nativeElement;

        if (el) {
            if (this.value == undefined || this.value == null)
                el.value = '';
            else
                el.value = this.value;

            this.checkVal();
            this.focusText = el.value;
        }
    }

    protected caret(first?: number, last?: number): Caret | undefined {
        if (!this.maskLength)
            return undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const el: any = this._elementRef.nativeElement, _document: any = this.document;

        if (!el?.offsetParent || el !== el.ownerDocument.activeElement) {
            return;
        }
        let range, begin, end;
        if (typeof first == 'number') {
            begin = first;
            end = typeof last === 'number' ? last : begin;
            if (el.setSelectionRange) {
                el.setSelectionRange(begin, end);
            } else if (el['createTextRange']) {
                range = el['createTextRange']();
                range.collapse(true);
                range.moveEnd('character', end);
                range.moveStart('character', begin);
                range.select();
            }
        } else {
            if (el.setSelectionRange) {
                begin = el.selectionStart;
                end = el.selectionEnd;
            } else if (_document['selection']?.createRange) {
                range = _document['selection'].createRange();
                begin = 0 - range.duplicate().moveStart('character', -100000);
                end = begin + range.text.length;
            }
            begin ??= 0;
            return { begin, end };
        }
        return undefined;
    }

    private getPlaceholder(i: number) {
        if (i < this.placeHolderChar.length) {
            return this.placeHolderChar.charAt(i);
        }
        return this.placeHolderChar.charAt(0);
    }

    private checkVal(allow?: boolean): number {
        const el = this._elementRef?.nativeElement;
        const test = el.value;
        let lastMatch = -1,
            i,
            c,
            pos;

        for (i = 0, pos = 0; i < (this.maskLength); i++) {
            if (this.tests[i]) {
                this.buffer[i] = this.getPlaceholder(i);
                while (pos++ < test.length) {
                    c = test.charAt(pos - 1);
                    if (this.tests?.[i]?.test(c)) {
                        this.buffer[i] = c;
                        lastMatch = i;
                        break;
                    }
                }
                if (pos > test.length) {
                    this.clearBuffer(i + 1, this.maskLength);
                    break;
                }
            } else {
                if (this.buffer[i] === test.charAt(pos)) {
                    pos++;
                }
                if (i < this.partialPosition) {
                    lastMatch = i;
                }
            }
        }
        if (allow) {
            this.writeBuffer();
        } else if (lastMatch + 1 < this.partialPosition) {
            if (this.clearOnInvalid || this.buffer.join('') === this.defaultBuffer) {
                // Invalid value. Remove it and replace it with the
                // mask, which is the default behavior.
                if (el.value)
                    el.value = '';
                this.clearBuffer(0, this.maskLength);
            } else {
                // Invalid value, but we opt to show the value to the
                // user and allow them to correct their mistake.
                this.writeBuffer();
            }
        } else {
            this.writeBuffer();
            el.value = el.value.substring(0, lastMatch + 1);
        }
        return (this.partialPosition ? i : this.firstNonMaskPos) as number;
    }

    private handleInputChange(event: Event) {
        if (!this.maskLength || this.readonly)
            return;
        setTimeout(() => {
            const pos = this.checkVal(true);
            this.caret(pos);
            this.updateModel(event, false);
            if (this.isCompleted()) {
                this._onComplete();
            }
        }, 0);
    }

    private handleAndroidInput(e: Event) {
        if (!this.maskLength)
            return;
        const curVal = this._elementRef?.nativeElement.value;
        const pos = this.caret() as Caret;
        if (this.oldVal && this.oldVal.length && this.oldVal.length > curVal.length) {
            // a deletion or backspace happened
            this.checkVal(true);
            while (pos.begin > 0 && !this.tests[pos.begin - 1]) pos.begin--;
            if (pos.begin === 0) {
                while (pos.begin < (this.firstNonMaskPos as number) && !this.tests[pos.begin]) pos.begin++;
            }

            setTimeout(() => {
                this.caret(pos.begin, pos.begin);
                this.updateModel(e, false);
            }, 0);
        } else {
            this.checkVal(true);
            while (pos.begin < this.maskLength && !this.tests[pos.begin])
                pos.begin++;

            setTimeout(() => {
                this.caret(pos.begin, pos.begin);
                this.updateModel(e, false);
            }, 0);
        }
    }

    private updateModel(e: Event, raiseInputEvent: boolean) {
        if (!this.maskLength)
            return;

        const updatedValue = this.useUnmaskValue ? this.getUnmaskedValue() : (e.target as HTMLInputElement).value;
        if (updatedValue !== null || updatedValue !== undefined) {
            this.value = updatedValue;
            this.changeModel(this.value, raiseInputEvent);
        }
    }

    private getUnmaskedValue() {
        return this.buffer.filter((c, i) => this.tests[i] && c != this.getPlaceholder(i)).join('');
    }

    private clearBuffer(start: number, end: number) {
        for (let i = start; i < end && i < this.maskLength; i++) {
            if (this.tests[i])
                this.buffer[i] = this.getPlaceholder(i);
        }
    }

    private seekNext(pos: number) {
        while (++pos < this.maskLength && !this.tests[pos]);
        return pos;
    }

    private seekPrev(pos: number) {
        while (--pos >= 0 && !this.tests[pos]);
        return pos;
    }

    private shiftL(begin: number, end: number) {
        if (begin < 0)
            return;

        let i, j;

        for (i = begin, j = this.seekNext(end); i < this.maskLength; i++) {
            if (this.tests[i]) {
                if (j < this.maskLength && this.tests[i]!.test(this.buffer[j])) {
                    this.buffer[i] = this.buffer[j];
                    this.buffer[j] = this.getPlaceholder(j);
                } else {
                    break;
                }

                j = this.seekNext(j);
            }
        }
        this.writeBuffer();
        this.caret(Math.max(this.firstNonMaskPos as number, begin));
    }

    private shiftR(pos: number) {
        let i, c, j, t;

        for (i = pos, c = this.getPlaceholder(pos); i < this.maskLength; i++) {
            if (this.tests[i]) {
                j = this.seekNext(i);
                t = this.buffer[i];
                this.buffer[i] = c;
                if (j < this.maskLength && this.tests[j]!.test(t)) {
                    c = t;
                } else {
                    break;
                }
            }
        }
    }

    private isCompleted(): boolean {
        for (let i = this.firstNonMaskPos as number; i <= (this.lastRequiredNonMaskPos as number); i++) {
            if (this.tests[i] && this.buffer[i] === this.getPlaceholder(i))
                return false;
        }

        return true;
    }

    protected _onComplete() {

    }

    protected update(event: Event) {
        this.updateModel(event, true);
        if (this.isCompleted())
            this._onComplete();
    }

    //#endregion
}