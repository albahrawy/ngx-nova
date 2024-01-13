import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NOVA_DIALOG_SERVICE } from '@ngx-nova/cdk/shared';
import { MaterialInputExtension } from '../material-input-extensions/material-input-extensions';
import { NovaMatButtonStyle } from '@ngx-nova/mat-extensions/buttons';
import { delay, map, of } from 'rxjs';
import { NovaSnackBar } from '@ngx-nova/mat-extensions/overlays';

@Component({
    selector: 'Dialog-Example',
    templateUrl: './dialog.html',
    standalone: true,
    imports: [MatButtonModule, NovaMatButtonStyle]
})

export class DialogExampleComponent {

    private _snackBar = inject(NovaSnackBar);

    openSnavkbar() {
        this._snackBar.openRelative('message', "action", this.htmlDom?.nativeElement,
            { verticalPosition: 'bottom', horizontalPosition: 'end' });
    }

    openSnavkbar2() {
        this._snackBar.openRelative('message2- kalam', "action", this.snackBarArea?.nativeElement, { verticalPosition: 'bottom', horizontalPosition: 'end' });
    }

    openSnavkbar3() {
        this._snackBar.open('default- kalam', "action", { verticalPosition: 'bottom', horizontalPosition: 'end' });
    }

    private dialogService = inject(NOVA_DIALOG_SERVICE);

    @ViewChild("htmlPara") private htmlDom?: ElementRef;
    @ViewChild("snackBarArea") private snackBarArea?: ElementRef;

    openDialogComponent() {
        this.dialogService.open({
            component: MaterialInputExtension,
            getResult: () => of(true).pipe(delay(1000), map(() => { throw new Error('some-error') })),
            options: {
                actionBar: {
                    buttons: {
                        accept: {
                            icon: 'home',
                            text: 'customButton',
                            // click: (args) => {
                            //     args?.button.progress!.progressVisible = true;
                            //     setTimeout(() => alert('aaa'), 1);
                            //     setTimeout(() => args!.progress!.progressVisible = false, 1000);
                            // }
                        },
                    }
                }
            }
        }).subscribe(x => console.log(x));
    }

    openDialogHTML() {
        this.dialogService.open({
            component: this.htmlDom!, options: {
                actionBar: {
                    buttons: {
                        accept: {
                            icon: 'check',
                            text: 'Dialog.Accept',
                            // click: (args) => {
                            //     args!.progress!.progressVisible = true;
                            //     setTimeout(() => alert('aaa'), 1);
                            //     setTimeout(() => args!.progress!.progressVisible = false, 1000);
                            // }
                        },
                    }
                }
            }
        })
    }


    openDialogString() {
        this.dialogService.open({
            component: 'Ahmed Albahrawy', data: 'xx', options: {
                actionBar: {
                    buttons: {
                        accept: {
                            icon: 'check',
                            text: 'Dialog.Accept',
                            // progress: {
                            //     addOnProgress: 'bar',
                            //     progressMode: 'indeterminate',
                            // },
                            // click: (args) => {
                            //     args!.progress!.progressVisible = true;
                            //     setTimeout(() => alert('aaa'), 1);
                            //     setTimeout(() => args!.progress!.progressVisible = false, 1000);
                            // }
                        },
                    }
                }
            }
        })
    }


}