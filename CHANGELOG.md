# Changelog

## v0.4.36

### Fixed

- Raw physical-chain previous/next controls now advance directly through controller addresses without requiring a valid logical mapping.
- Raw testing works with blank, incomplete, unassigned, and reserved address ranges.
- Raw slow-chase uses the correct On time and Dark gap controls.

### Added

- Active mappings are automatically written to `Documents/LEDController.net/Mappings/active-mapping.json`.
- Each mapping save creates a timestamped disk backup.
- The newest 20 mapping backups are retained.
- Browser storage can restore the active mapping from the disk-backed copy when local browser data is missing.

### Preserved

- 135 visual generators
- Four layers per deck
- A/B mixer and Show Director
- Audio-reactive processing and microphone auto-start preferences
- WLED/DDP and Art-Net output
- Existing preset and mapping separation

### Verification

- 229 automated tests passing
