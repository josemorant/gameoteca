# Validation

Version 1.3.0 · 26 October 2026.

- Twenty-five automated tests pass. New regression tests cover the exact Spanish Metroid EAN/UPC, equivalent leading-zero forms, retailer GTIN verification, GameTDB parsing and caching, regional artwork fallback, provider outages and cover-only updates preserving all copy details.
- The public Metroid Prime 4: Beyond / Nintendo Switch regression case uses UPC 045496513245 and EAN 0045496513245. UPCitemdb had no matching record during validation.
- The public alternative catalogue returned a product whose explicit EAN field matched 0045496513245. Title and platform resolved correctly without a game-specific override.
- GameTDB's downloaded Switch XML resolved the title to BGW5A. The Spanish front cover was unavailable; EN front covers responded successfully, including the larger coverM variant.
- A real title search returned Switch artwork from GameTDB and Shine Star, and a separate Switch 2 Edition result when the platform was Switch 2.
- Cover-only repair preserved title, platform, barcode, condition, edition and notes after a consistent SQLite backup.
- Local collection screenshots are excluded from the repository.
- The comparison with ES-DE, EmuDeck, Steam ROM Manager, USB Loader GX and Homebrew Channel is documented in EMULATION_SOURCES.md using project documentation and original source links.
- The fixed release/ directory replaces older build outputs. Collection data, downloaded covers, provider caches and certificates are outside release cleanup.

Previous live-scanner, camera lifecycle, real EAN image decoding, QR, pairing, translation and HTTPS tests remain in the suite. Physical Android/iOS camera and certificate-installation testing, a real TheGamesDB key and full installation on a second PC remain pending.

Executables are unsigned. Retail HTML can change, and barcode/artwork coverage still depends on providers; service failures are reported instead of always being presented as empty search results.
