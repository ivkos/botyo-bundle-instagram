# Instagram Bundle for Botyo
[![npm](https://img.shields.io/npm/v/botyo-bundle-instagram.svg)](https://www.npmjs.com/package/botyo-bundle-instagram)
[![npm](https://img.shields.io/npm/dt/botyo-bundle-instagram.svg)](https://www.npmjs.com/package/botyo-bundle-instagram)
[![npm](https://img.shields.io/npm/l/botyo-bundle-instagram.svg)]()

The **Instagram Bundle for [Botyo](https://github.com/ivkos/botyo)** consists of a few modules providing some useful Instagram integrations.

The included components are:
- `InstagramCommand` - a command that posts an Instagram photo of a particular user, or one tagged with a hashtag.
- `InstagramSneakPeekFilter` - a filter that listens for Instagram profile links and posts a few photos of the user in question.

## Usage
`#ig [latest] <@user | #hashtag>`

For example:
- `#ig latest by @ivkos` - Posts the newest photo uploaded by @ivkos
- `#ig latest of #landscape` - Posts the newest photo tagged with #landscape
- `#ig @zuck` - Posts a random photo uploaded by @zuck
- `#ig #happy` - Posts a random photo tagged with #happy

## Install
**Step 1.** Install the module from npm.

`npm install --save botyo-bundle-instagram`

**Step 2.** Configure the module.

Add your Instagram username and password to your configuration file `config.yaml`
```yaml
facebook:
  email: ...
  password: ...
  ...


# Instagram Bundle Configuration
instagram:
  username: INSTAGRAM_USERNAME
  password: INSTAGRAM_PASSWORD
  cookiesFile: instagram_cookies.json     # optional; path to cookies file

  
modules:
  ...
```

**Step 3.** Register the bundle.
```typescript
import Botyo from "botyo";
import { InstagramBundle } from "botyo-bundle-instagram"

Botyo.builder()
    ...
    .registerBundle(InstagramBundle)
    ...
    .build()
    .start();
```

Or optionally, register only the desired modules:
```typescript
import Botyo from "botyo";
import { InstagramCommand, InstagramSneakPeekFilter } from "botyo-bundle-instagram"

Botyo.builder()
    ...
    .registerModule(InstagramCommand)
//  .registerModule(InstagramSneakPeekFilter)
    ...
    .build()
    .start();
```

## Configuration
`InstagramCommand` has no configuration properties. The `InstagramSneakPeekFilter` has sensible defaults so it need not be explicitly configured.

```yaml
modules:
    InstagramSneakPeekFilter:
      maxPhotos: 3  # how many photos of the user to post
```