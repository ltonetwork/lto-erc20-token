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

## Token sale

The initial public sale of LTO tokens is done using the LTO ERC20 tokens using the token sale smart contract. During
the token, a limited supply of mainnet LTO tokens by the bridge. For this amount, ERC20 tokens are minted by the ERC20
contract and send to the token sale contract.

The token sale has a limited run time (in number of blocks). Tokens that remain unsold after the sale has ended are
burned.

### Capped purchase

By default, sales are capped to 40 ETH per ethereum address. To purchase more LTO during the sale, the address must
be registered as uncapped address. Potential buyers need to go through an KYC/AML procedure to be eligible for an
uncapped purchase.

### Bonus period

For the first sales of the token sale contract, accounts will receive a bonus percentage. This bonus decreases
linearly after each purchase. This bonus is only awarded at the start of the token sale, for a limited period of
time / blocks.

## Version 2

Version 1 of the LTO ERC20 smart contract allowed the bridge application to add any address as intermediate wallet.
Potentially it could add addresses not created by the bridge, causing tokens send to that address to be burned. This
has been resolved in version 2 of the contract, as the newly create account must confirm it's an intermediate address.

### Balance copy

Since it's impossible to modify a smart contract once it's published, version 1 is replaced by version 2, resulting in
a new token address.

Version 2 of the smart contract is started in a paused state, which means it doesn't allow any transfers. During this
state, tokens can be pre-minted. Pre-minting is used to copy the balances from the old (version 1) contract to the new
(version 2) contract. Once the balances are copied, the new ERC20 contract is unpauses, after which it's no longer
possible to pre-mint.

The old LTO ERC20 contract is halted using the `pause()` method, preventing balance changes while copying. Halting the
contract also ensures the old ERC20 token can no longer be traded / used.

The `BalanceCopier` contract is added as maintainer (pauser) of the new ERC20 contract. It requires both the old and
new ERC20 to be in paused state. The `copyAll()` method takes a list of addresses, obtain the account balance from the
old contract, and mint tokens on the new contract. This function is **idempotent**; it can be called multiple times for
the same address without side effects.

# Install
```
npm install
```

# Configuration

Edit `config.json`

### token

The `token` entry has properties for the LTOToken smart contract. There are 500 million LTO tokens minted during
genesis of LTO Network. `totalSupply` is the amount of ERC20 tokens minted and used for the token sale. `bridgeSupply`
should always be `500_000_000 - totalSupply`.

### tokenSale

The `tokenSale` entry has properties for the LTOTokenSale smart contract. The `bonusPercentage` is x10000, so `500`
means `5%`.

### balanceCopy

The `balanceCopy` entry has properties for copying the balances of the old contract to the new one. If it's specified
in the configuration the token sale contract is not published / used. All balances are copied through pre-minting and
there is no token sale.

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
