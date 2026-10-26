# Live mobile scanner

## First connection

1. Run Gameoteca on Windows and select **Connect phone**.
2. Connect the phone to the same Wi-Fi and scan the QR. Select the PC's Wi-Fi address if it has multiple interfaces.
3. Download the public CA certificate and compare its SHA-256 fingerprint with the PC connection panel.
4. Install and trust the certificate manually in the phone settings. Only install your own PC's CA: it can sign other certificates. No trust settings change automatically.
5. Select **Open secure scanner**, enter the four-digit PIN and select **Start scanner**. Allow camera access.

On Android, look for **CA certificate** in security settings or **Encryption and credentials > Install a certificate**. Names vary by manufacturer.

On iPhone/iPad, install the profile under **Settings > General > VPN & Device Management**, then enable **Gameoteca Local Scanner CA** under **General > About > Certificate Trust Settings**. See [Apple's instructions](https://support.apple.com/en-sg/102390).

If a certificate warning remains, check the installation, fingerprint and PC address. Do not bypass browser warnings. Restart Gameoteca if its IP changes to renew the server certificate; the CA is preserved.

## Scan games

Point the rear camera at the complete EAN/UPC barcode in good light. Frames are decoded on the phone. A valid read stops the camera and starts an internet lookup. The title and platform are filled when identified; available artwork is downloaded automatically. Review condition, edition and notes, save, then scan the next game.

Existing collection records never identify barcodes. Multiple physical copies can share metadata while retaining independent copy details. Unknown or ambiguous results support manual completion.

## Ports and privacy

- HTTP 3210: desktop catalog, QR setup and public certificate download.
- HTTPS 3211: live mobile scanner.
- Allow both through Windows Firewall on private networks only. Do not forward them on the router.
- Camera frames stay on the phone; only the detected barcode reaches the PC.
- QR codes and certificates are generated locally. Private keys are never served over HTTP.
- External providers have their own limits and coverage; see [UPCitemdb](https://www.upcitemdb.com/api/).

LAN camera access requires a secure context: [getUserMedia documentation](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia). Physical Android/iOS camera and certificate-installation testing remains pending.
