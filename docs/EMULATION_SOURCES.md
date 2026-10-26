# Emulation and homebrew artwork sources

Reviewed on 26 October 2026 against project documentation and source code.

| Application | Artwork source and matching | Relevance to Gameoteca |
|---|---|---|
| ES-DE / EmulationStation Desktop Edition | ScreenScraper and TheGamesDB; ROM names, platforms and service identifiers. | Normalize titles, separate platforms and review matches. ScreenScraper requires its own credentials. |
| EmuDeck with ES-DE | Delegates scraping to ES-DE. | EmuDeck is not a standalone cover database or universal EAN API. |
| EmuDeck with Steam ROM Manager | SteamGridDB; title matching, exceptions and image selection. | Possible artwork source, not an EAN catalogue. Never reuse another application's keys. |
| USB Loader GX | GameTDB, formerly WiiTDB; IDs, regions and image types. | Map titles to IDs, then request regional artwork with fallback. |
| Homebrew Channel | Local icon.png and meta.xml in each SD/USB app folder. | Does not identify retail boxes by EAN or automatically download their covers. Individual loaders may do so. |

## Primary references

- [ES-DE user guide](https://gitlab.com/es-de/emulationstation-de/-/blob/master/USERGUIDE.md).
- [EmuDeck ES-DE documentation](https://emudeck.github.io/tools/steamos/es-de/).
- [EmuDeck Steam ROM Manager documentation](https://github.com/EmuDeck/emudeck.github.io/blob/main/docs/tools/steamos/steam-rom-manager.md).
- [Steam ROM Manager](https://steamgriddb.github.io/steam-rom-manager/).
- [USB Loader GX settings](https://github.com/wiidev/usbloadergx/blob/enhanced/source/settings/CSettings.cpp) and [image downloader](https://github.com/wiidev/usbloadergx/blob/enhanced/source/network/ImageDownloader.cpp).
- [Homebrew Channel documentation](https://wiibrew.org/wiki/Homebrew_Channel).
- [ScreenScraper API](https://www.screenscraper.fr/webapi2.php).

## ROM identifiers versus physical barcodes

The GameTDB ID BGW5A for Metroid Prime 4: Beyond differs from its Spanish EAN 0045496513245. Gameoteca must resolve the box barcode through a product catalogue first, then obtain artwork by title, platform or game ID. Changing image servers alone cannot resolve a missing product barcode.

## Implemented in 1.3.0

- Switch GameTDB lookup without an API key, with a 24-hour index cache.
- Case-, accent- and punctuation-insensitive matching, preserving sequel numbers.
- Preferred UI language followed by EN/US artwork fallback.
- Retail fallback verifying explicit product EAN fields, including equivalent leading-zero forms.
- Combined providers with independent handling of failures.
- Fetch cover for saved copies, preserving physical-copy details.

Switch 2 uses the alternative catalogue and optional TheGamesDB; matching titles never justify assigning Switch artwork to Switch 2. ScreenScraper and SteamGridDB remain documented possibilities rather than active integrations.
