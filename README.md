# YouTube Automatic Translation Language Auto-Setter

유튜브 자동번역 언어 자동 선택기

A lightweight Chrome extension that remembers your preferred subtitle language and automatically applies it through YouTube's subtitle settings.

## Install

**[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/naefklandenadphambkjgindjnodfkdj)**

The Chrome Web Store is the recommended installation method because Chrome handles updates automatically. This repository contains the extension's source code for transparency and development.

## Features

- Search and select a preferred subtitle language from the extension popup.
- Sync the selected language through Chrome's extension storage.
- Apply YouTube's auto-translate option on supported videos.
- Preserve the user's choice when subtitles are turned off.
- Provide Korean and English extension interfaces.
- Require no account, external server, analytics, or tracking.

## Usage

1. Install the extension from the Chrome Web Store.
2. Open a YouTube video that provides subtitles.
3. Turn subtitles on in the YouTube player.
4. Click the extension icon and choose your preferred language.
5. The extension applies that language when YouTube's auto-translate option is available.

YouTube occasionally changes its player interface. If automatic selection stops working, please open a GitHub issue with the video URL, your Chrome language, and the target subtitle language.

## Install from source

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the repository folder.

Installing from source does not receive automatic Chrome Web Store updates.

## Project files

- `manifest.json` — Chrome Manifest V3 configuration
- `popup.html`, `popup.css`, `popup.js` — language-selection interface
- `language-data.js` — supported-language catalog and matching helpers
- `content.js` — YouTube subtitle-menu automation
- `_locales/` — Korean and English translations
- `icon_*.png` — extension icons

## Privacy

The extension stores only the selected target-language code using `chrome.storage.sync`. It does not collect, transmit, sell, or share personal data. See [PRIVACY.md](PRIVACY.md) for details.

## Permissions

- `storage` — remembers and syncs the selected subtitle language.
- Access to `youtube.com` — interacts with the YouTube player's subtitle settings.

## Contributing

Bug reports and focused pull requests are welcome. Please test changes against both Korean and English Chrome/YouTube interfaces when possible.
