# Project instructions

- Author and maintainer: Jose Morant (https://josemorant.com). Keep original project code under MIT and preserve third-party notices.
- Write documentation and code comments in English. Keep UI translations multilingual.
- Use main for stable releases and develop for integration; branch feature/* and fix/* from develop. See CONTRIBUTING.md.
- Never commit collections, downloaded covers, certificates, provider caches, credentials or generated releases.

- Generate Windows releases with `npm run dist:win`.
- Keep only the latest build in the fixed `release/` folder. The release script removes previous build outputs, including the legacy `dist/` and `release-icons/` folders. Do not create version-specific output folders. Never remove `data/` or user profile data while building.
- English is the base UI language. Keep Spanish, Catalan, French and German translations complete, including errors, condition labels and accessible labels.
- Persist stable condition identifiers, never translated labels. Preserve migration of older collection records.
- Maintain original SVG interface icons; do not copy third-party brand assets or add brand-inspiration statements to code comments.
- Generate mobile QR codes locally and require the four-digit PIN exchange before allowing remote API access. Keep attempt limits and session expiry.
- Mobile scan mode uses a live rear-camera EAN/UPC scanner over trusted HTTPS. Keep the local certificate setup guide and never suggest bypassing browser certificate warnings.
- Barcode metadata must come from internet providers, not from existing collection rows. Fill metadata and available artwork automatically; keep incomplete or ambiguous matches available for review.
