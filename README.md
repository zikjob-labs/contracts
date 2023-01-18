# ZikJob Contract

This repo contains all the contracts used in ZikJob.

## Development

### Install

```shell
npm install
```

### Compile

```shell
npx hardhat compile
```

### Test

```shell
cp .env.example .env
```

- Config PRIVATE_KEY in .env file

```shell
npx hardhat test
```

### Run local chain

```
npx hardhat node --port 8546 --show-stack-traces
```

### Deploy

```shell
npx hardhat run --network XXXX scripts/deploy.js
```

XXX - get from hardhat.config.js. Sample: hardhat_node
```
npx hardhat run --network hardhat_node scripts/deploy.js
```
