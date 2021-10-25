import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import WalletConnectProvider from '@walletconnect/web3-provider';

// import v1ContractABI from '@assets/yeenus-rinkeby-abi.json';
import v1ContractABI from '@assets/lto-contract-v1-abi.json';
import v2ContractABI from '@assets/lto-contract-v2-abi.json';

export interface TokenBalance {
  raw: number;
  value: string;
}

export interface Tokens {
  v1: TokenBalance;
  v2: TokenBalance;
  allowance: TokenBalance;
}

// Web3Modal only works with Angular if using the VanillaJS version
// see https://github.com/Web3Modal/web3modal/issues/190#issuecomment-698318423
// @ts-ignore
const Web3Modal = window.Web3Modal.default;

const v1ContractInfo = {
  hash: '0x3db6ba6ab6f95efed1a6e794cad492faaabf294d',
  // hash: '0xc6fDe3FD2Cc2b173aEC24cc3f267cb3Cd78a26B7', // rinkeby (Yeenus Faucet)
  abi: v1ContractABI as any,
};

const v2ContractInfo = {
  hash: '0xd01409314acb3b245cea9500ece3f6fd4d70ea30',
  // hash: '0xED09Cb98279BD6801A5AFB777766e83e05C66751', // rinkeby (LTO token - deployed manually)
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

  private tokens: Tokens | undefined;

  public tokens$: BehaviorSubject<Tokens | undefined> = new BehaviorSubject<
    Tokens | undefined
  >(undefined);
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

  async fetchNetwork(): Promise<void> {
    this.web3Modal.clearCachedProvider();
    this.web3 = new Web3(this.provider);

    // does not return all accounts, only the selected account (in an array)
    const accounts = await this.web3.eth.getAccounts();
    if (!accounts[0]) throw Error('No account');

    this.selectedAccount = accounts[0];

    this.v1Contract = new this.web3.eth.Contract(
      v1ContractInfo.abi,
      v1ContractInfo.hash
    );

    this.v2Contract = new this.web3.eth.Contract(
      v2ContractInfo.abi,
      v2ContractInfo.hash
    );

    try {
      await this.fetchTokens();
    } catch (error) {
      this.tokens$.next(undefined);
      this.tokens$.error(error);
    }
  }

  async fetchTokens(): Promise<void> {
    if (!this.web3 || !this.v1Contract || !this.v2Contract) {
      throw Error('Not connected');
    }

    const v1RawBalance = await this.v1Contract.methods
      .balanceOf(this.selectedAccount)
      .call();

    const v2RawBalance = await this.v2Contract.methods
      .balanceOf(this.selectedAccount)
      .call();

    if (!v1RawBalance || !v2RawBalance) {
      throw Error('Invalid balance');
    }

    const allowance = await this.v1Contract.methods
      .allowance(this.selectedAccount, v2ContractInfo.hash)
      .call();

    this.tokens = {
      v1: {
        raw: v1RawBalance,
        value: (v1RawBalance / 100000000).toFixed(2),
      },
      v2: {
        raw: v2RawBalance,
        value: (v2RawBalance / 100000000).toFixed(2),
      },
      allowance: {
        raw: allowance,
        value: (allowance / 100000000).toFixed(2),
      },
    };

    this.tokens$.next(this.tokens);
  }

  async connect(): Promise<void> {
    this.web3Modal.clearCachedProvider();

    this.provider = await this.web3Modal.connect();

    this.provider.on('accountsChanged', () => {
      this.fetchNetwork();
    });

    this.provider.on('chainChanged', () => {
      this.fetchNetwork();
    });

    this.connected$.next(true);

    this.fetchNetwork();
  }

  async disconnect(): Promise<void> {
    if (this.provider.close) this.provider.close();

    this.web3Modal.clearCachedProvider();

    this.web3 = undefined;
    this.provider = undefined;
    this.selectedAccount = undefined;

    this.v1Contract = undefined;
    this.v2Contract = undefined;

    this.tokens = undefined;

    this.connected$.next(false);
    this.tokens$.next(undefined);
  }

  async tokenApprove(amount: number): Promise<void> {
    if (!this.web3 || !this.v1Contract || !this.tokens) {
      throw Error('Not connected');
    }

    await this.v1Contract.methods
      .approve(v2ContractInfo.hash, this.tokens.v1.raw)
      .send({ from: this.selectedAccount });

    await this.fetchTokens();
  }

  async tokenSwap(): Promise<void> {
    if (!this.web3 || !this.v2Contract || !this.selectedAccount) {
      throw Error('Not connected');
    }

    await this.v2Contract.methods.swap().send({ from: this.selectedAccount });

    await this.fetchTokens();
  }
}
