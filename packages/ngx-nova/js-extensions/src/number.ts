export namespace numbers {

    const formatCache = new Map<string, Intl.NumberFormatOptions | undefined>();

    /**
     * Checks if the given value has a specific flag set.
     * @param {number} value - The value to check the flag against.
     * @param {number} flag - The flag value to be checked.
     * @returns {boolean} - True if the value has the flag set, false otherwise.
     */
    export function hasFlag(value: number, flag: number): boolean {
        return (value & flag) === flag;
    }

    /**
     * Converts a number to an array of its binary bit values.
     * @param {number} value - The number to convert to bit values.
     * @returns {number[]} - An array of binary bit values of the given number.
     */
    export function toBitValues(value: number): number[] {
        const data: number[] = [];
        let d = 1;
        while (value > 0) {
            if (value & 1)
                data.push(d);
            d = d << 1;
            value = value >>> 1;
        }
        return data;
    }

    /**
     * Pads a number to a specified length with a character (optional).
     * @param {number} value - The number to pad.
     * @param {number} length - The desired length of the padded number.
     * @param {string} [char] - The character to use for padding. Default is '0'.
     * @returns {string} - The padded number as a string.
     */
    export function padStart(value: number, length: number, char?: string): string {
        return value?.toString().padStart(length, char);
    }

    /**
     * Checks if a number is between a specified range (inclusive).
     * @param {number} value - The number to check.
     * @param {number} min - The minimum value of the range.
     * @param {number} max - The maximum value of the range.
     * @returns {boolean} - True if the number is between the specified range, false otherwise.
     */
    export function between(value: number, min: number, max: number): boolean {
        return value >= min && value <= max;
    }

    /**
     * Generates the options object for formatting a number based on the format string.
     * @param {string} [formatString] - The format string for the number formatting.
     * @returns {Intl.NumberFormatOptions | undefined} - The options object for formatting the number, or undefined if formatString is empty or invalid.
     */
    export function generateFormatOption(formatString?: string): Intl.NumberFormatOptions | undefined {
        const options: Intl.NumberFormatOptions = {};
        if (formatString) {
            if (formatString.includes('%')) { options.style = 'percent'; }
            if (formatString.includes(',')) { options.useGrouping = true; }
            const pointPosition = formatString.indexOf('.');
            options.maximumFractionDigits = pointPosition > -1 ?
                options.minimumFractionDigits = formatString.replace('%','').length - pointPosition - 1
                : options.maximumFractionDigits = 0;
        }

        return !!Object.keys(options).length ? options : undefined;
    }

    /**
     * Formats a number based on the provided format string and locale.
     * @param {number} value - The number to format.
     * @param {string} [formatString] - The format string for formatting the number.
     * @param {string} [locals] - The locale to use for formatting. If not provided, the default locale is used.
     * @returns {string} - The formatted number as a string.
     */
    export function format(value: number, formatString?: string, locals?: string): string {
        let options: Intl.NumberFormatOptions | undefined;
        if (formatString) {
            options = formatCache.get(formatString);
            if (!options) {
                options = generateFormatOption(formatString);
                formatCache.set(formatString, options);
            }
        }
        return value.toLocaleString(locals, options);
    }

    /**
     * Formats a file size number into a human-readable format based on the provided locale.
     * @param {number} size - The file size in bytes.
     * @param {string} [locals] - The locale to use for formatting. If not provided, the default locale is used.
     * @returns {string} - The formatted file size as a string with appropriate units.
     */
    export function formatFileSize(size: number, locals?: string): string {
        if (!isFinite(size) || size <= 0) {
            return '0';
        }
        const unitDisplay = locals?.startsWith('ar') ? 'long' : 'short';
        const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte'];
        const sizeNumber = Math.floor(Math.log(size) / Math.log(1024));
        const finalSize = +(size / Math.pow(1024, sizeNumber)).toFixed(2);
        return new Intl.NumberFormat(locals, { style: 'unit', unitDisplay, unit: units[sizeNumber] }).format(finalSize);
    }

    /**
     * Adds prototype extensions to the Number object.
     * This function extends the Number object with additional utility methods for formatting and flag operations.
     */
    export function addProtoTypeExtensions() {
        if (!Number.generateFormatOption)
            Number.generateFormatOption = generateFormatOption;
        if (!Number.prototype.format)
            Number.prototype.format = function (f, locals) { return format(<number>this, f, locals) };
        if (!Number.prototype.hasFlag)
            Number.prototype.hasFlag = function (flag) { return hasFlag(<number>this, flag) };
        if (!Number.prototype.toBitValues)
            Number.prototype.toBitValues = function () { return toBitValues(<number>this) };
        if (!Number.prototype.padStart)
            Number.prototype.padStart = function (length, char = '0') { return padStart(<number>this, length, char) };
        if (!Number.prototype.formatFileSize)
            Number.prototype.formatFileSize = function (locals) { return formatFileSize(<number>this, locals) };
    }
}

// Declaration merging for Number prototype extensions
declare global {

    interface Number {
        toBitValues(): number[];
        format(formatString: string, locals?: string): string;
        formatFileSize(locals?: string): string;
        padStart(length: number, char?: string): string;
        hasFlag(flag: number): boolean;
    }

    interface NumberConstructor {
        generateFormatOption(formatString: string): Intl.NumberFormatOptions | undefined;
    }
}