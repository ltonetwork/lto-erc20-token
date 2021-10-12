import { Component, OnInit } from '@angular/core';

import { WalletService } from '@app/services';

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  balance!: string;

  constructor(private walletService: WalletService) {}

  ngOnInit() {
    this.getBalance();
  }

  async getBalance() {
    this.balance = await this.walletService.getBalance();
  }
}
