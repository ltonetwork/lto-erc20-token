import { Router } from '@angular/router';
import { Component } from '@angular/core';

import { Observable } from 'rxjs';

import { WalletService } from '@app/services';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  connected$: Observable<boolean>;

  constructor(private router: Router, private walletService: WalletService) {
    this.connected$ = this.walletService.connected$;
  }

  async disconnect(): Promise<void> {
    await this.walletService.disconnect();
    this.router.navigate(['login']);
  }
}
