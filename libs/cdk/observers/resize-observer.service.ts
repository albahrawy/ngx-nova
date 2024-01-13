import { Injectable, NgZone, Optional } from "@angular/core";
import { asyncScheduler, filter, map, NextObserver, Observable, Subscriber, throttleTime } from "rxjs";

@Injectable({ providedIn: 'root' })
export class ResizeObservableService {
    private resizeObserver: ResizeObserver;
    private notifiers: NextObserver<ResizeObserverEntry[]>[] = [];

    constructor(@Optional() ngZone: NgZone) {
        this.resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
            const _pushNotifier = () => this.notifiers.forEach(obs => obs.next(entries));
            if (ngZone)
                ngZone.run(() => _pushNotifier());
            else
                _pushNotifier();
        });
    }

    resizeObservable(elem: Element): Observable<ResizeObserverEntry> {
        this.resizeObserver.observe(elem, { box: 'border-box' });
        const newObserverCandidate = new Observable<ResizeObserverEntry[]>(
            (subscriber: Subscriber<ResizeObserverEntry[]>) => {
                this.notifiers.push(subscriber);

                return () => {
                    const idx = this.notifiers.findIndex(val => val === subscriber);
                    this.notifiers.splice(idx, 1);
                    this.resizeObserver.unobserve(elem);
                };
            }
        );

        return newObserverCandidate.pipe(
            map(entries => entries.find(entry => entry.target === elem)),
            filter(Boolean),
            throttleTime(20, asyncScheduler, { trailing: true })
        );
    }

    widthResizeObservable(elem: Element): Observable<number> {
        return this.resizeObservable(elem).pipe(
            map(entry => entry.borderBoxSize[0].inlineSize),
            filter(Boolean)
        );
    }

    heightResizeObservable(elem: Element): Observable<number> {
        return this.resizeObservable(elem).pipe(
            map(entry => entry.borderBoxSize[0].blockSize),
            filter(Boolean)
        );
    }
}