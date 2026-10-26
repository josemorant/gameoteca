# Metadata and artwork sources

Reviewed on 26 October 2026. See the [emulation comparison](EMULATION_SOURCES.md).

| Source | Identification | Integration |
|---|---|---|
| [Libretro Thumbnails](https://github.com/libretro-thumbnails/libretro-thumbnails) | Platform/title names; artwork, title screens and screenshots. Not EAN. | Platform/title artwork search; coverage varies. |
| [GameTDB](https://www.gametdb.com/) | Downloadable title index, game IDs and regional artwork. | Switch index cached for 24 hours, with region/size fallback. Does not resolve box EANs directly. |
| [ScreenScraper](https://www.screenscraper.fr/webapi2.php) | ROM hashes, name, size and system; regional metadata/media. | Researched, not integrated. Requires its own developer credentials and applicable authorization. |
| [TheGamesDB](https://api.thegamesdb.net/) | Title/platform metadata and images by game ID. | Optional THEGAMESDB_API_KEY; quotas apply. Not a universal EAN catalogue. |
| [LaunchBox Games Database](https://feedback.launchbox-app.com/en/help/articles/8890692-getting-started-with-the-launchbox-games-database) | Community metadata and artwork by title/platform. | Not integrated; reviewed documentation did not establish a public API for this application. |
| [UPCitemdb](https://www.upcitemdb.com/wp/docs/main/development/plan/) | General product catalogue indexed by UPC/EAN. | Primary barcode lookup. Provider limits and incomplete game/platform coverage apply. |
| [Shine Star](https://www.shinestar.es/) | Physical-game pages with explicit EAN fields and images. | Alternative barcode/title lookup; verifies same-origin pages and equivalent exact EANs. HTML may change. |

## Lookup flow

Live EAN/UPC read → UPCitemdb → alternative catalogue with explicit EAN verification when necessary → title/platform → provider image or exact title/platform artwork match → local download → physical-copy review and save.

GameTDB front covers are preferred for Switch over retail photographs with large margins. Equivalent leading-zero UPC/EAN forms share a lookup cache. Recent successful internet results stay in memory for ten minutes. Optional provider failures do not block other results.

The collection is never an identification source. Unknown codes support manual entry and ambiguous platforms require review. Providers cannot determine a physical copy's condition or personal notes.

Downloaded artwork retains its original rights. Public availability does not grant permission to redistribute image packs. The repository and installer contain no downloaded game-art packs. See [third-party notices](../THIRD_PARTY_NOTICES.md).

[Live camera access requires a secure context](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia). HTTP localhost differs from a phone's HTTP LAN address. The scanner uses local HTTPS with explicit manual CA trust. BarcodeDetector or bundled ZXing decodes frames on the phone; photograph reading remains an alternative.
