import { Router } from '@angular/router';
import { Component } from '@angular/core';

import { WalletService } from '@app/services';

@Component({
  selector: 'login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  constructor(private router: Router, private walletService: WalletService) {}

  async connect(): Promise<void> {
    await this.walletService.connect();
    this.router.navigate([''], { skipLocationChange: true });
  }
}
