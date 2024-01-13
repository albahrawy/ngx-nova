import { ElementRef } from "@angular/core";
import { NovaSplitPanelDirective } from "./split-panel.directive"
import { ISplitPanelRef, SplitOrientation, SplitSize } from "./types";

export function getPanelMinSize(panel: NovaSplitPanelDirective): number | null {
    if (panel.renderRef.size === 'auto')
        return null;

    if (panel.freezeSize)
        return panel.renderRef.size;

    if (panel.minSize === null)
        return null;

    if (panel.minSize > panel.renderRef.size)
        return panel.renderRef.size;

    return panel.minSize;
}

export function getPanelMaxSize(panel: NovaSplitPanelDirective): number | null {
    if (panel.renderRef.size === 'auto')
        return null;

    if (panel.freezeSize)
        return panel.renderRef.size;

    if (panel.maxSize === null)
        return null;

    if (panel.maxSize < panel.renderRef.size)
        return panel.renderRef.size;

    return panel.maxSize;
}

export function getPointFromEvent(event: MouseEvent | TouchEvent | KeyboardEvent, orientation: SplitOrientation): number {
    if (event instanceof TouchEvent)
        return orientation === 'horizontal' ? event.changedTouches[0].clientX : event.changedTouches[0].clientY;
    else if (event instanceof MouseEvent)
        return orientation === 'horizontal' ? event.clientX : event.clientY;
    else {
        const el = event.currentTarget as HTMLElement;
        return orientation === 'horizontal' ? el.offsetLeft : el.offsetTop;
    }
}


export function getKeyboardEndpoint(event: KeyboardEvent, orientation: SplitOrientation, step: number): number | null {

    if ((orientation === 'horizontal' && !['ArrowLeft', 'ArrowRight'].includes(event.key))
        || (orientation === 'vertical' && !['ArrowUp', 'ArrowDown'].includes(event.key)))
        return null;

    const el = event.currentTarget as HTMLElement
    switch (event.key) {
        case 'ArrowLeft':
            return el.offsetLeft - step;
        case 'ArrowRight':
            return el.offsetLeft + step;
        case 'ArrowUp':
            return el.offsetTop - step;
        case 'ArrowDown':
            return el.offsetTop + step;
    }
    return null;
}

export type Writable<T> = { -readonly [K in keyof T]: T[K]; };

export interface INovaSplitSnapshot {
    gutterIndex: number;
    totalSizePercent: number;
    totalSizePixel: number;
    lastOffset: number;
    panelsBefore: Array<IPanelDragRef>;
    panelsAfter: Array<IPanelDragRef>;
}

export interface IPanelDragRef {
    panel: NovaSplitPanelDirective;
    startSize: SplitSize;
    startSizeInPixels: number;
}

export interface ISplitSideAbsorptionCapacity {
    remain: number;
    list: Array<IPanelAbsorptionCapacity>;
}

export interface IPanelAbsorptionCapacity {
    areaSnapshot: IPanelDragRef;
    pixelAbsorb: number;
    percentAfterAbsorption: SplitSize;
    pixelRemain: number;
}

export function getElementPixelSize(elRef: ElementRef<HTMLElement>, direction: SplitOrientation): number {
    const rect = elRef.nativeElement.getBoundingClientRect();
    return direction === 'horizontal' ? rect.width : rect.height;
}

export function getGutterSideAbsorptionCapacity(
    sideAreas: Array<IPanelDragRef>,
    pixels: number,
    allAreasSizePixel: number,
): ISplitSideAbsorptionCapacity {
    return sideAreas.reduce<ISplitSideAbsorptionCapacity>(
        (acc, ref) => {
            const res = getAbsorptionCapacity(ref, acc.remain, allAreasSizePixel)
            acc.list.push(res);
            acc.remain = res.pixelRemain;
            return acc;
        },
        { remain: pixels, list: [] },
    );
}

function getAbsorptionCapacity(
    areaSnapshot: IPanelDragRef,
    pixels: number,
    allAreasSizePixel: number,
): IPanelAbsorptionCapacity {

    const absorptionCapacity = {
        areaSnapshot,
        pixelAbsorb: 0,
        percentAfterAbsorption: areaSnapshot.startSize,
        pixelRemain: 0,
    };

    const tempPixelSize = areaSnapshot.startSizeInPixels + pixels;
    const tempPercentSize = (tempPixelSize / allAreasSizePixel) * 100;

    if (pixels > 0) {
        // If maxSize & newSize bigger than it > absorb to max and return remaining pixels
        if (areaSnapshot.panel.renderRef.maxSize !== null && tempPercentSize > areaSnapshot.panel.renderRef.maxSize) {
            // Use area.area.maxSize as newPercentSize and return calculate pixels remaining
            absorptionCapacity.pixelAbsorb = (areaSnapshot.panel.renderRef.maxSize / 100) * allAreasSizePixel;
            absorptionCapacity.percentAfterAbsorption = areaSnapshot.panel.renderRef.maxSize;
            absorptionCapacity.pixelRemain = areaSnapshot.startSizeInPixels + pixels - absorptionCapacity.pixelAbsorb;
        } else {
            absorptionCapacity.pixelAbsorb = pixels;
            absorptionCapacity.percentAfterAbsorption = tempPercentSize > 100 ? 100 : tempPercentSize;
        }
    } else if (pixels < 0) {
        // If minSize & newSize smaller than it > absorb to min and return remaining pixels
        if (areaSnapshot.startSizeInPixels === 0) {
            absorptionCapacity.percentAfterAbsorption = 0;
            absorptionCapacity.pixelRemain = pixels;
        } else if (areaSnapshot.panel.renderRef.minSize !== null && tempPercentSize < areaSnapshot.panel.renderRef.minSize) {
            // Use area.area.minSize as newPercentSize and return calculate pixels remaining
            absorptionCapacity.pixelAbsorb = (areaSnapshot.panel.renderRef.minSize / 100) * allAreasSizePixel;
            absorptionCapacity.percentAfterAbsorption = areaSnapshot.panel.renderRef.minSize;
            absorptionCapacity.pixelRemain = areaSnapshot.startSizeInPixels + pixels - absorptionCapacity.pixelAbsorb;
        }
        // If reduced under zero > return remaining pixels
        else if (tempPercentSize < 0) {
            absorptionCapacity.pixelAbsorb = -areaSnapshot.startSizeInPixels;
            absorptionCapacity.percentAfterAbsorption = 0;
            absorptionCapacity.pixelRemain = pixels + areaSnapshot.startSizeInPixels;
        } else {
            absorptionCapacity.pixelAbsorb = pixels;
            absorptionCapacity.percentAfterAbsorption = tempPercentSize;
        }
    }

    return absorptionCapacity;
}

export function updateAreaSize(item: IPanelAbsorptionCapacity) {
    // Update size except for the wildcard size area
    if (item.areaSnapshot.panel.renderRef.lastSize)
        (item.areaSnapshot.panel.renderRef as Writable<ISplitPanelRef>).lastSize = null;
    if (item.areaSnapshot.panel.renderRef.size !== 'auto') {
        (item.areaSnapshot.panel.renderRef as Writable<ISplitPanelRef>).size = item.percentAfterAbsorption;
    }
}