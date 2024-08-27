<h1 align="center">CARDO - PODCAST PLAYER</h1>
<p align="center">
    <a href="https://n0vella.github.io">
        <img src="https://raw.githubusercontent.com/n0vella/cardo/master/src-tauri/icons/icon.png" alt="logo" width="256" height="256" />
    </a>
</p>

## Overview

Cardo is a podcast player, inspired on Android's [Antennapod](https://antennapod.org/). Cardo could be synchonized with Antennapod and other apps using [Nextcloud Gppoder](https://github.com/thrillfall/nextcloud-gpodder/).

![1](assets/readme/1.png)

![2](assets/readme/2.png)

![3](assets/readme/3.png)

![4](assets/readme/4.png)

### Features

- Search podcasts online
- Manage your subscriptions
- Look at new episodes of your subscriptions with a glance
- Synchronizing episodes state and subscriptions using Nexcloud Gpodder
- Lightweight app (thanks to Tauri)
- Customizable themes
- [ ] Download episodes to listen them offline
- [ ] Keep your favorite episodes


## Contributing

### Helping with donations

If you like this app you can contribute buying me a cofee or whatever you want, that would be really great :)

<div style="display: inline-flex; gap: 10px; align-items: center">
    <a href="https://www.buymeacoffee.com/n0vella" target="_blank" rel="noopener">
        <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;"
        >
    </a>
    <a href="https://www.paypal.com/paypalme/adriannovella" target="_blank" rel="noopener">
        <img src="https://www.paypalobjects.com/webstatic/icon/pp196.png" alt="Paypal" width="60" height="60" style="border-radius: 10px" />
    </a>
</div>

### If you are a developer

It's also nice if you want to improve the app. The stack is Tauri v1 + React + Typescript + Tailwind.

To install dependencies `pnpm i` command should be enough. To setup a Tauri development environment check their [docs](https://tauri.app/v1/guides/getting-started/prerequisites), are pretty good.
In src-tauritauri-conf.json you should remove the updater configuration and windows certificate settings, or you will experiment errors of missing private key / certificate.

Be free of summiting a PR if you get something good!

### Translations

You can contribute with translations if you speak some other languages.
It's only needed to replicate json's files in resources / translations. There is a tool on scripts to auto translate it using Google Translate, but I didn't want to leave a bad translations, even english could be badly translated as it isn't my mother language.

## Troubleshooting

On windows you may experience a Windows shield alert, that's because app is signed with a self-signed certificate, not a paid one. Maybe alerts stop appearing if the app earns some reputation. Of course you don't have to believe me, inspecting the code and building it by yourself is always the safer option.