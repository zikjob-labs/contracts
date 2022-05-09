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

### Deploy

```shell
npx hardhat run --network XXXX scripts/deploy.js
```
