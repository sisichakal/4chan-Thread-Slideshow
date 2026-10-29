# 4chan Thread Slideshow

Userscript turning 4chan and 4archive threads into a keyboard-driven fullscreen slideshow.

[![Userscript](https://img.shields.io/badge/userscript-v1.3-blue)](4chan-thread-slideshow.user.js) [![License: MIT](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE) [![No dependencies](https://img.shields.io/badge/dependencies-none-lightgrey)](#how-it-works)

Threads bury their images behind thumbnails and endless scrolling. This script plays them as a fullscreen slideshow instead.

## What it does

- Opens every image in a thread as a fullscreen slideshow.
- Works on both live threads and 4archive mirrors.
- Driven from the keyboard, so you never go back to the thumbnails.

## Where it runs

- `boards.4chan.org/*/thread/*`
- `4archive.org/board/*/thread/*`

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser.
2. Open [`4chan-thread-slideshow.user.js`](4chan-thread-slideshow.user.js) and click **Raw**.

Tampermonkey picks up the install prompt automatically. Updates are served through `@updateURL`, so later versions are offered without reinstalling.

## How it works

A single `.user.js` file of plain DOM code: no build step, no bundler, no external library.

## Known limitations

- Selectors track the site's current markup and will need updating when it changes.

## License

[MIT](LICENSE) — use it, change it, redistribute it, no strings attached.
