import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import Web3 from 'web3';
import WalletConnectProvider from '@walletconnect/web3-provider';

import ltoContractABI from '@assets/lto-contract-abi.json';

// Web3Modal only works with Angular if using the VanillaJS version
// see https://github.com/Web3Modal/web3modal/issues/190#issuecomment-698318423
// @ts-ignore
const Web3Modal = window.Web3Modal.default;

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  public provider: any;
  public connected$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    false
  );

  private web3Modal: any;

  constructor() {
    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: 'bb2c607b63d648008d4dfcbe08f722f5',
        },
      },
    };

    this.web3Modal = new Web3Modal({
      providerOptions,
      network: 'mainnet',
    });
  }

  async connect(): Promise<void> {
    this.web3Modal.clearCachedProvider();

    this.provider = await this.web3Modal.connect();

    this.provider.on('accountsChanged', () => {
      this.getBalance();
    });

    this.provider.on('chainChanged', () => {
      this.getBalance();
    });

    this.provider.on('networkChanged', () => {
      this.getBalance();
    });

    this.connected$.next(true);
  }

  async disconnect(): Promise<void> {
    if (this.provider.close) this.provider.close();

    this.web3Modal.clearCachedProvider();

    this.provider = null;

    this.connected$.next(false);
  }

  async getBalance(): Promise<string> {
    const web3js = new Web3(this.provider);

    if (!web3js) throw Error('Not connected');

    // does not return all accounts, only the selected account (in an array)
    const accounts = await web3js.eth.getAccounts();
    const account = accounts[0];

    if (!account) throw Error('No account');

    const LTOContract = new web3js.eth.Contract(
      ltoContractABI as any,
      '0x3db6ba6ab6f95efed1a6e794cad492faaabf294d'
    );

    const balance = await LTOContract.methods.balanceOf(account).call();

    return (balance / 100000000).toFixed(2);
  }
}
