/* eslint-disable @typescript-eslint/no-explicit-any */
import { LiveAnnouncer } from "@angular/cdk/a11y";
import { BreakpointObserver } from "@angular/cdk/layout";
import { ComponentType } from "@angular/cdk/portal";
import { EmbeddedViewRef, Inject, Injectable, Injector, Optional, SkipSelf, TemplateRef } from "@angular/core";
import {
    MAT_SNACK_BAR_DEFAULT_OPTIONS, MatSnackBar, MatSnackBarConfig,
    MatSnackBarRef, TextOnlySnackBar
} from "@angular/material/snack-bar";
import { NovaRelativeOverlay } from "./relative-overlay-container";

@Injectable({ providedIn: 'root' })
export class NovaSnackBar extends MatSnackBar {
    private _novaOverlay: NovaRelativeOverlay;
    private __defaultConfig: MatSnackBarConfig;
    constructor(
        _overlay: NovaRelativeOverlay,
        _live: LiveAnnouncer,
        _injector: Injector,
        _breakpointObserver: BreakpointObserver,
        @Optional() @SkipSelf() _parentSnackBar: MatSnackBar,
        @Inject(MAT_SNACK_BAR_DEFAULT_OPTIONS) _defaultConfig: MatSnackBarConfig,
    ) {
        super(_overlay, _live, _injector, _breakpointObserver, _parentSnackBar, _defaultConfig);
        this._novaOverlay = _overlay;
        this.__defaultConfig = _defaultConfig;
    }

    override get _openedSnackBarRef(): MatSnackBarRef<any> | null {
        return super._openedSnackBarRef;
    }
    override set _openedSnackBarRef(value: MatSnackBarRef<any> | null) {
        super._openedSnackBarRef = value;
        if (value === null)
            this._novaOverlay.attachElementToContainer(null);
    }

    openRelativeFromComponent<T, D = any>(
        component: ComponentType<T>,
        element: HTMLElement,
        config?: MatSnackBarConfig<D>,
    ): MatSnackBarRef<T> {
        this._novaOverlay.attachElementToContainer(element);
        return super.openFromComponent(component, config);
    }

    openRelativeFromTemplate(
        template: TemplateRef<any>,
        element: HTMLElement,
        config?: MatSnackBarConfig,
    ): MatSnackBarRef<EmbeddedViewRef<any>> {
        this._novaOverlay.attachElementToContainer(element);
        return super.openFromTemplate(template, config);
    }

    openRelative(
        message: string,
        action: string = '',
        element: HTMLElement,
        config?: MatSnackBarConfig,
    ): MatSnackBarRef<TextOnlySnackBar> {
        const _config = { ...this.__defaultConfig, ...config };
        _config.data = { message, action };

        if (_config.announcementMessage === message) {
            _config.announcementMessage = undefined;
        }

        return this.openRelativeFromComponent(this.simpleSnackBarComponent, element, _config);
    }

    override openFromComponent<T, D = any>(
        component: ComponentType<T>,
        config?: MatSnackBarConfig<D>,
    ): MatSnackBarRef<T> {
        this._novaOverlay.attachElementToContainer(null);
        return super.openFromComponent(component, config);
    }

    override openFromTemplate(
        template: TemplateRef<any>,
        config?: MatSnackBarConfig,
    ): MatSnackBarRef<EmbeddedViewRef<any>> {
        this._novaOverlay.attachElementToContainer(null);
        return super.openFromTemplate(template, config);
    }
}