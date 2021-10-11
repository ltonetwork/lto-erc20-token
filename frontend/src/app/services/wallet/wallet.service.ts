import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  connected$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor() {}

  async connect(): Promise<void> {
    // @todo: connect with wallet provider (maybe web3modal? "npm install --save web3modal")
    this.connected$.next(true);
  }
}
