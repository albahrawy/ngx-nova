/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Platform } from '@angular/cdk/platform';
import { NgTemplateOutlet } from '@angular/common';
import {
    ANIMATION_MODULE_TYPE, ChangeDetectionStrategy, ChangeDetectorRef,
    Component, ElementRef, Inject, InjectionToken, Input,
    NgZone, OnDestroy, Optional, TemplateRef, ViewEncapsulation
} from '@angular/core';
import { MAT_RIPPLE_GLOBAL_OPTIONS, RippleGlobalOptions, ThemePalette } from '@angular/material/core';
import { MatList, MatListItem, MatListOptionTogglePosition } from '@angular/material/list';

export const NOVA_SELECTION_LIST = new InjectionToken<INovaSelectionList<unknown, unknown>>('NOVA_SELECTION_LIST');

export interface INovaSelectionList<TRow, TValue> extends MatList {
    multiple: boolean;
    isSelected(value?: TValue | null): boolean;
    _notifyTouched(): void;
    _changeOptionValue(option: NovaListOption<TRow, TValue>, selected: boolean): void;
}

@Component({
    selector: 'nova-list-option',
    exportAs: 'novaListOption',
    styleUrls: ['./list-option.scss'],
    templateUrl: './list-option.html',
    host: {
        'class': 'mat-mdc-list-item mat-mdc-list-option mdc-list-item mat-mdc-list-item-single-line mdc-list-item--with-one-line',
        'role': 'option',
        // As per MDC, only list items without checkbox or radio indicator should receive the
        // `--selected` class.
        '[class.mdc-list-item--selected]': 'selected',
        '[class.mdc-list-item--with-leading-avatar]': 'iconType === "avatar" && iconPosition === "before"',
        '[class.mat-mdc-list-option-with-trailing-avatar]': 'iconType === "avatar" && iconPosition === "after"',
        '[class.mdc-list-item--with-leading-icon]': 'iconType === "icon" && iconPosition === "before"',
        '[class.mdc-list-item--with-trailing-icon]': 'iconType === "icon" && iconPosition === "after"',
        '[class.mdc-list-item--with-leading-checkbox]': 'toggleType === "check" && togglePosition === "before"',
        '[class.mdc-list-item--with-trailing-checkbox]': 'toggleType === "check" && togglePosition === "after"',
        '[class.mdc-list-item--with-leading-radio]': 'toggleType === "radio" && togglePosition === "before"',
        '[class.mdc-list-item--with-trailing-radio]': 'toggleType === "radio" && togglePosition === "after"',
        '[class.mat-accent]': 'color !== "primary" && color !== "warn"',
        '[class.mat-warn]': 'color === "warn"',
        '[class._mat-animation-noopable]': '_noopAnimations',
        '[attr.aria-selected]': 'selected',
        '[attr.tabindex]': '0',
        '(blur)': '_handleBlur()',
        '(click)': '_toggleOnInteraction()',
    },
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [NgTemplateOutlet],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        { provide: MatListItem, useExisting: NovaListOption },
    ],
})
export class NovaListOption<T = unknown, V = unknown> extends MatListItem implements OnDestroy {

    private _color: ThemePalette;

    @Input() data!: T;
    @Input() value?: V;
    @Input() index?: number;
    @Input() iconPosition: MatListOptionTogglePosition = 'before';
    @Input() togglePosition: MatListOptionTogglePosition = 'after';
    @Input() toggleType: 'radio' | 'check' | undefined = 'check';
    @Input() iconType: 'icon' | 'avatar' | undefined;

    @Input()
    get color(): ThemePalette { return this._color; }
    set color(newValue: ThemePalette) { this._color = newValue; }

    @Input() iconTemplate?: TemplateRef<unknown>;
    @Input() indexTemplate?: TemplateRef<unknown>;
    @Input() titleTemplate?: TemplateRef<unknown>;

    get selected(): boolean {
        return this._selectionList.isSelected(this.value);
    }

    constructor(
        elementRef: ElementRef<HTMLElement>,
        ngZone: NgZone,
        platform: Platform,
        private _changeDetectorRef: ChangeDetectorRef,
        @Inject(NOVA_SELECTION_LIST) private _selectionList: INovaSelectionList<T,V>,
        @Optional() @Inject(MAT_RIPPLE_GLOBAL_OPTIONS)
        globalRippleOptions?: RippleGlobalOptions,
        @Optional() @Inject(ANIMATION_MODULE_TYPE) animationMode?: string,
    ) {
        super(elementRef, ngZone, _selectionList, platform, globalRippleOptions, animationMode);
    }


    focus(): void {
        this._hostElement.focus();
    }

    _handleBlur() {
        setTimeout(() => this._selectionList._notifyTouched());
    }

    /**
     * Sets the selected state of the option.
     * @returns Whether the value has changed.
     */
    _setSelected(selected: boolean): boolean {
        if (selected === this.selected)
            return false;
        this._selectionList._changeOptionValue(this, selected);
        return true;
    }

    /**
     * Notifies Angular that the option needs to be checked in the next change detection run.
     * Mainly used to trigger an update of the list option if the disabled state of the selection
     * list changed.
     */
    _markForCheck() {
        this._changeDetectorRef.markForCheck();
    }

    /** Toggles the option's value based on a user interaction. */
    _toggleOnInteraction() {
        if (!this.disabled) {
            if (this._selectionList.multiple) {
                this._setSelected(!this.selected);
            } else if (!this.selected) {
                this._setSelected(true);
            }
        }
    }
}