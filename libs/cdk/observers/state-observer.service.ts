import { Injectable } from "@angular/core";
import { Observable, Subscriber, asyncScheduler, throttleTime } from "rxjs";

export type InputStateEntry = {
    disabled: boolean;
    readonly: boolean;
}

@Injectable({ providedIn: 'root' })
export class ElementStateObservableService {

    stateObservable(elem: HTMLInputElement): Observable<InputStateEntry> {
        const newObserverCandidate = new Observable<InputStateEntry>((subscriber: Subscriber<InputStateEntry>) => {
            const mutationObserver = new MutationObserver(() => {
                subscriber.next({ disabled: elem.disabled, readonly: elem.readOnly });
            });
            mutationObserver.observe(elem, { attributes: true, attributeFilter: ['readonly', 'disabled'] });
            return () => mutationObserver.disconnect();
        });

        return newObserverCandidate.pipe(
            throttleTime(20, asyncScheduler, { trailing: true })
        );
    }
}