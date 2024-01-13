import { toStringValue } from "@ngx-nova/js-extensions";

/** @internal */
export class NumberParser {

    locale?: string;
    inputmode: 'numeric' | 'decimal' = 'numeric';
    thousandSeparator: boolean = false;
    percentage: boolean = false;
    decimalDigits?: number;
    currency?: string;

    private _decimalExp!: RegExp;
    private _decimalRelated: boolean = false;
    private _minusSignExp!: RegExp;
    private _formatter!: Intl.NumberFormat;
    private _parser!: (value: string) => number | null;

    createFormatter() {
        const options: Intl.NumberFormatOptions = {};
        if (this.inputmode == 'decimal' && this.decimalDigits && this.decimalDigits > 0) {
            options.minimumFractionDigits = this.decimalDigits;
            options.maximumFractionDigits = this.decimalDigits;
            this._decimalRelated = true;
        }
        options.useGrouping = this.thousandSeparator;
        if (this.currency) {
            options.style = 'currency';
            options.currency = this.currency;
            options.currencyDisplay = 'narrowSymbol';
        } else if (this.percentage)
            options.style = 'percent';

        this._formatter = new Intl.NumberFormat(this.locale, options);
    }

    createParser() {
        const parts = new Intl.NumberFormat(this.locale, { style: 'percent', minimumFractionDigits: 1 }).formatToParts(-12345.6);
        const numerals = [...new Intl.NumberFormat(this.locale, { useGrouping: false }).format(9876543210)].reverse();
        const index = new Map(numerals.map((d, i) => [d, i]));
        const _numeral = new RegExp(`[${numerals.join('')}]`, "g");
        const groupExp = new RegExp(`[${parts.find(d => d.type === "group")!.value}]`, "g");
        const percentExp = new RegExp(`[${parts.find(d => d.type === "percentSign")!.value}]`);
        this._decimalExp = new RegExp(`[${parts.find(d => d.type === "decimal")!.value}]`);
        this._minusSignExp = new RegExp(`[${parts.find(d => d.type === "minusSign")!.value}]`);

        this._parser = (value: string) => {
            let parsedValue = value.trim()
                .replace(/\s/g, '')
                .replace(groupExp, "")
                .replace(this._decimalExp, ".")
                .replace(percentExp, "")
                .replace(_numeral, d => toStringValue(index.get(d)));
            if (this.currency)
                parsedValue = parsedValue.replace(this.currency, '')
            let finalValue: number | null = +parsedValue;
            if (isNaN(finalValue))
                finalValue = null;
            if (finalValue && percentExp.test(value))
                finalValue = finalValue / 100;
            return finalValue;
        }
    }

    format(value?: number | bigint | null): string {
        if (!this._formatter)
            return toStringValue(value);
        if (value != null) {
            if (this._decimalRelated && this.decimalDigits) {
                const power10 = Math.pow(10, this.decimalDigits);
                if (typeof value !== 'number')
                    value = Number(value);
                value = Math.trunc(value * power10) / power10;
            }

            let currencyReplaced = false;
            return this._formatter.formatToParts(value)
                .map((item, idx, arr) => {
                    if ((item.type === "currency" || item.type === "literal") && currencyReplaced) return "";
                    const nextCurrency = arr[idx + 1] && arr[idx + 1].type === "currency" && arr[idx + 1].value;
                    if (item.type === "minusSign" && nextCurrency && !currencyReplaced) {
                        currencyReplaced = true;
                        return `${nextCurrency} ${item.value}`;
                    }
                    return `${item.value}`;
                })
                .join("");
        }

        return "";
    }

    parse(value?: string) {
        if (value)
            return this._parser(value);
        return null;
    }

    isMinusSignChar(value: string) {
        if (this._minusSignExp.test(value)) {
            this._minusSignExp.lastIndex = 0;
            return true;
        }

        return false;
    }

    isDecimalChar(value: string) {
        if (this._decimalExp.test(value)) {
            this._decimalExp.lastIndex = 0;
            return true;
        }

        return false;
    }

    getDecimalIndex(value: string) {
        return value.search(this._decimalExp);
    }
}