import { Component } from '@angular/core';
import { INovaButtonArgs, INovaButtonConfig, NovaButtonContainer } from '@ngx-nova/mat-extensions/buttons';

@Component({
    selector: 'buttons-example',
    templateUrl: 'buttons.html',
    standalone: true,
    imports: [NovaButtonContainer]

})

export class ButtonsExampleComponent {

    buttons: INovaButtonConfig = {
        button1: { text: 'button1', color: 'primary', progress: { type: 'bar', color: 'accent' } },
        button2: { text: 'button2' },
        button3: { text: 'button3', icon: 'check' },
        button4: { icon: 'check', isFab: true },
    }

    buttonClicked(event: INovaButtonArgs) {
        event.button.progress.visible = true;
        event.button.progress.type = 'bar';
        const button = event.getButton('button2');
        if (button)
            button.hidden = true;
    }
}