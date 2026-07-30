# LEDController.net v0.4.36

v0.4.36 is a mapping recovery and raw physical-test reliability release.

## Highlights

- Raw one-by-one physical testing no longer depends on an existing logical map.
- Previous/next now walks through every configured controller address, including unassigned and reserved pixels.
- Saving a mapping creates an active disk copy plus timestamped backups under `Documents/LEDController.net/Mappings`.
- The newest 20 mapping backups are retained.
- A missing browser copy can be restored automatically from the disk-backed mapping.
- All v0.4.35 visual, layer, audio, preset, mapping, WLED/DDP, and Art-Net behavior is preserved.

## Verification

- 229 automated tests passing
