import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import WalletConnectProvider from '@walletconnect/web3-provider';

import v1ContractABI from '@assets/lto-contract-v1-abi.json';
import v2ContractABI from '@assets/lto-contract-v2-abi.json';

// Web3Modal only works with Angular if using the VanillaJS version
// see https://github.com/Web3Modal/web3modal/issues/190#issuecomment-698318423
// @ts-ignore
const Web3Modal = window.Web3Modal.default;

const v1ContractInfo = {
  hash: '0x3db6ba6ab6f95efed1a6e794cad492faaabf294d',
  abi: v1ContractABI as any,
};

const v2ContractInfo = {
  hash: '0xd01409314acb3b245cea9500ece3f6fd4d70ea30',
  abi: v2ContractABI as any,
};

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  public provider: any;
  public web3: Web3 | undefined;
  public selectedAccount: string | undefined;

  public v1Contract: Contract | undefined;
  public v2Contract: Contract | undefined;

  public v1RawBalance: number | undefined;
  public v2RawBalance: number | undefined;

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
    this.web3 = new Web3(this.provider);

    this.v1Contract = new this.web3.eth.Contract(
      v1ContractInfo.abi,
      v1ContractInfo.hash
    );

    this.v2Contract = new this.web3.eth.Contract(
      v2ContractInfo.abi,
      v2ContractInfo.hash
    );

    this.provider.on('accountsChanged', () => {
      this.getTokensBalance();
    });

    this.provider.on('chainChanged', () => {
      this.getTokensBalance();
    });

    this.provider.on('networkChanged', () => {
      this.getTokensBalance();
    });

    this.connected$.next(true);
  }

  async disconnect(): Promise<void> {
    if (this.provider.close) this.provider.close();

    this.web3Modal.clearCachedProvider();

    this.web3 = undefined;
    this.provider = undefined;
    this.selectedAccount = undefined;

    this.v1Contract = undefined;
    this.v2Contract = undefined;

    this.v1RawBalance = undefined;
    this.v2RawBalance = undefined;

    this.connected$.next(false);
  }

  async getTokensBalance(): Promise<{ v1: string; v2: string }> {
    if (!this.web3 || !this.v1Contract || !this.v2Contract) {
      throw Error('Not connected');
    }

    // does not return all accounts, only the selected account (in an array)
    const accounts = await this.web3.eth.getAccounts();
    if (!accounts[0]) throw Error('No account');

    this.selectedAccount = accounts[0];

    this.v1RawBalance = await this.v1Contract.methods
      .balanceOf(this.selectedAccount)
      .call();
    this.v2RawBalance = await this.v2Contract.methods
      .balanceOf(this.selectedAccount)
      .call();

    if (!this.v1RawBalance || !this.v2RawBalance) {
      throw Error('Invalid balance');
    }

    return {
      v1: (this.v1RawBalance / 100000000).toFixed(2),
      v2: (this.v2RawBalance / 100000000).toFixed(2),
    };
  }

  async tokenSwap(): Promise<void> {
    if (
      !this.web3 ||
      !this.v1Contract ||
      !this.v2Contract ||
      !this.v1RawBalance ||
      !this.v2RawBalance ||
      !this.selectedAccount
    ) {
      throw Error('Not connected');
    }

    await this.v1Contract.methods
      .approve(v2ContractInfo.hash, this.v1RawBalance)
      .send({ from: this.selectedAccount });

    await this.v2Contract.methods.swap().send({ from: this.selectedAccount });
  }
}
