# Gameoteca 1.3.0

- Fixed free artwork lookup for Nintendo Switch by integrating GameTDB's downloadable title index and game IDs.
- Added regional and size fallback, preferring larger front covers and trying EN/US when the selected language's cover is unavailable.
- Added an exact-EAN public catalogue fallback when UPCitemdb has no result or is unavailable. UPC and EAN forms with leading zeroes are treated as equivalent.
- Combined artwork sources instead of letting an unavailable optional source block the rest.
- Separated Switch and Switch 2 results.
- Added Fetch cover on existing copy cards without images. This updates artwork only and preserves physical copy details.
- Added regression coverage for the reported Spanish Metroid Prime 4: Beyond barcode.
- Added the requested review of EmulationStation / ES-DE, EmuDeck, Steam ROM Manager, USB Loader GX and Homebrew Channel.
- Kept the five languages, local HTTPS live scanner, PIN pairing and one fixed release/ directory.

GameTDB Switch support and the public alternative catalogue work without API keys. TheGamesDB remains optional. ScreenScraper and SteamGridDB have been researched but are not presented as active integrations without their required credentials.
