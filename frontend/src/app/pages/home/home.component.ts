import { Subscription } from 'rxjs';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Tokens, WalletService } from '@app/services';

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  defaultErrorMsg = 'Something bad happened, please try again.';
  tokens$!: Subscription;

  public loading: boolean = false;
  public tokens: Tokens | undefined;

  constructor(
    private walletService: WalletService,
    private _snackBar: MatSnackBar
  ) {
    this.loading = true;
  }

  ngOnInit() {
    this.tokens$ = this.walletService.tokens$.subscribe(
      (tokens) => {
        this.tokens = tokens;

        if (this.tokens) {
          this.loading = false;

          if (this.tokens.v1.raw <= 0) {
            this._snackBar.open(
              `You don't have enough v1 tokens to make a swap`,
              'Dismiss',
              {
                duration: 5000,
              }
            );
          }
        }
      },
      (error) => {
        this.loading = false;
        this._snackBar.open(error.message || this.defaultErrorMsg, 'Dismiss', {
          duration: 5000,
        });
      }
    );
  }

  ngOnDestroy() {
    this.tokens$.unsubscribe();
  }

  async approve() {
    if (!this.tokens) return;
    this.loading = true;

    try {
      await this.walletService.tokenApprove(100000000);
    } catch (error: any) {
      this._snackBar.open(error.message || this.defaultErrorMsg, 'Dismiss', {
        duration: 5000,
      });
    }

    this.loading = false;
  }

  async swap() {
    if (!this.tokens) return;

    if (this.tokens.allowance.raw <= 0) {
      this._snackBar.open(
        `Your allowance is not enough to make a swap`,
        'Dismiss',
        {
          duration: 5000,
        }
      );
      return;
    }

    this.loading = true;

    try {
      await this.walletService.tokenSwap();
    } catch (error: any) {
      this._snackBar.open(error.message || this.defaultErrorMsg, 'Dismiss', {
        duration: 5000,
      });
    }

    this.loading = false;
  }
}
