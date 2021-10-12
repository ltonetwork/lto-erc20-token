![github-banner](https://user-images.githubusercontent.com/100821/108692834-6a115200-74fd-11eb-92df-ee07bf62b386.png)

# LTO Network ERC20 token 

[LTO Network](https://ltonetwork.com) is a hybrid permissionless blockchain with LTO as native token.

To improve liquidity and make LTO available for smart contracts, a 'wrapped' LTO token is available as ERC20 on
Ethereum.

## LTO Token bridge

The [LTO token bridge](https://docs.ltonetwork.com/v/edge/tutorials/buying-and-staking-lto/using-the-lto-bridge)
can be used to swap (native) mainnet LTO tokens for ERC20 LTO tokens. It can also be used to swap ERC20 LTO tokens
back to mainnet tokens. Swapping is done at a ratio of 1:1, however the bridge make take a fee for swapping tokens.

The LTO token bridge is a centralized application, with the ability to mint ERC20 LTO tokens. For the amount of ERC20
tokens minted / in circulation, the bridge must hold an equal amount of mainnet LTO in the
[bridge wallet](https://explorer.lto.network/address/3JugjxT51cTjWAsgnQK4SpmMqK6qua1VpXH).

### Intermediate addresses

To swap ERC20 LTO to mainnet LTO, the bridge will create a new ethereum account and register it as intermediate
address on the smart contract. Tokens transferred to an intermediate address are automatically burned. The bridge
releases the amount of burned tokens from the bridge wallet and sends them to the recipient mainnet address.

## Version 1

**[Source code of version 1](https://github.com/ltonetwork/lto-erc20-token/tree/v1.0)**

The initial public sale of LTO tokens is done using the LTO ERC20 tokens using the token sale smart contract. During
the token, a limited supply of mainnet LTO tokens by the bridge. For this amount, ERC20 tokens are minted by the ERC20
contract and send to the token sale contract.

The token sale has a limited run time (in number of blocks). Tokens that remain unsold after the sale has ended are
burned.

## Version 2

Version 1 of the LTO ERC20 smart contract allowed the bridge application to add any address as intermediate wallet.
Potentially it could add addresses not created by the bridge, causing tokens send to that address to be burned. This
has been resolved in version 2 of the contract, as the newly create account must confirm it's an intermediate address.

### Token swap

Since it's impossible to modify a smart contract once it's published, version 1 is replaced by version 2, resulting in
a new token address.

The old LTO ERC20 tokens can be swapped with new tokens using the `swap()` method of the LTO contract v2. To do this the
holder first need to set an allowance using the `approve()` method on the old contract. The spender will the new
contract and the amount should be the full balance of the holder.

Upon calling `swap()` the new contract will burn the allowance of the old tokens and mint the exact amount of new tokens
for the holder.

# Install
```
npm install
```

# Configuration

Edit `config.json`.

### token

The `token` entry has properties for the LTOToken smart contract. `maxSupply` should be 500 million; the number of LTO
tokens minted during genesis of LTO Network. `totalSupply` is the amount of ERC20 tokens minted and used for the token
sale.

# Test
Testing requires an ethereum network to be running.
You can download and use [truffle/ganache](https://truffleframework.com/ganache).
If the network is running you can use the following command to run tests.

```
npm test
```

Alternatively you can use truffles built in network.
Within their cli you can then manually run truffle test.

```
# opens truffle cli
truffle develop

# within truffle cli
migrate
test
```
