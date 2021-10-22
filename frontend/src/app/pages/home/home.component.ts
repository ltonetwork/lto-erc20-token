import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { WalletService } from '@app/services';

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  defaultErrorMsg = 'Something bad happened, please try again.';
  tokens!: {
    v1: string;
    v2: string;
  };

  public loading: boolean = false;
  public swapDisabled: boolean = false;

  constructor(
    private walletService: WalletService,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.getBalance();
  }

  async getBalance() {
    this.loading = true;
    this.swapDisabled = true;

    try {
      this.tokens = await this.walletService.getTokensBalance();
      this.loading = false;

      if (this.tokens.v1 === '0.00') {
        this._snackBar.open(
          `You don't have enough v1 tokens to make a swap`,
          'Dismiss',
          {
            duration: 5000,
          }
        );

        return;
      }
    } catch (error: any) {
      this._snackBar.open(error.message || this.defaultErrorMsg, 'Dismiss', {
        duration: 5000,
      });
    }

    this.loading = false;
    this.swapDisabled = false;
  }

  async swap() {
    if (this.tokens.v1 === '0.00') {
      this._snackBar.open(
        `You don't have enough v1 tokens to make a swap`,
        'Dismiss',
        {
          duration: 5000,
        }
      );

      return;
    }

    this.loading = true;
    this.swapDisabled = true;

    try {
      await this.walletService.tokenSwap();

      await this.getBalance();
    } catch (error: any) {
      this._snackBar.open(error.message || this.defaultErrorMsg, 'Dismiss', {
        duration: 5000,
      });
    }

    this.loading = false;
    this.swapDisabled = false;
  }
}
