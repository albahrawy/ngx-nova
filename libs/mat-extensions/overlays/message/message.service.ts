import { Injectable, inject } from '@angular/core';
import { INovaMessageService } from '@ngx-nova/cdk/shared';
import { NovaSnackBar } from '../snackbar/snackbar';
import { MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NovaSnackBarMessageService implements INovaMessageService {

    private _snackBar = inject(NovaSnackBar);

    showError(message: string, element: HTMLElement | null = null, position: 'top' | 'bottom' = 'bottom', callBack?: () => void): void {
        const config = { duration: 1000, verticalPosition: position };
        let _snackBarRef: MatSnackBarRef<TextOnlySnackBar>;
        if (element)
            _snackBarRef = this._snackBar.openRelative(message, 'x', element, config);
        else
            _snackBarRef = this._snackBar.open(message, 'x', config);

        if (callBack) {
            _snackBarRef.afterDismissed().subscribe(() => setTimeout(() => callBack()));
        }
    }
}