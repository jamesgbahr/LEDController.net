# Capabilities

LEDController.net v0.4.36 is a local visual-generation, pixel-mapping, and network-output environment for addressable LED installations.

## Visual engine

- 135 visual generators across color, organic, geometric, texture, motion, utility, test, and audio-reactive categories
- Independent Deck A and Deck B previews
- Server-authoritative center preview representing the logical frame used for physical output
- Speed, scale, direction, primary color, and secondary color controls
- Master brightness and configurable output frame rate
- Resolution-aware Matrix Clarity modes for low-resolution LED layouts
- Visual library, full-screen operation, and fixed live-performance layout

With eight layer slots and 135 choices per slot, the system has more than 110 quadrillion ordered generator assignments before colors, opacity, blend modes, masks, modifiers, speed, scale, modulation, or A/B mixing are considered.

## A/B live mixer

- Continuous Deck A / Deck B crossfader
- Solo A and Solo B
- 75A/25B, 50/50, and 25A/75B shortcuts
- Deck swap
- Enable or disable two-deck mixing
- Actual server-calculated Deck B contribution

Mixer modes:

- Normal crossfade
- Add light
- Screen
- Multiply/darken
- Difference
- Luma key
- Horizontal wipe
- Vertical wipe

## Layer engine

Each deck supports up to four layers.

Layer operations:

- Add, select, enable, disable, solo, duplicate, reorder, and delete
- Independent generator, colors, speed, scale, direction, and opacity
- Up to six modifiers per layer
- Optional mask and modulation assignment
- Complete layer-stack persistence in performance presets

Layer blend modes:

- Normal
- Add
- Screen
- Multiply
- Overlay
- Lighten
- Darken
- Difference
- Subtract
- Maximum
- Minimum
- Luma mask

Layer modifiers:

- Blur
- Glow
- Pixelate
- Posterize
- Threshold
- Hue rotate
- Saturation boost
- Contrast boost
- Mirror X
- Mirror Y
- Kaleidoscope
- Edge detect

Masks:

- Circle
- Rectangle
- Linear gradient
- Radial gradient
- Stripes
- Checkerboard
- Noise
- Audio spectrum
- No mask

Modulation sources include overall audio level, bass, mid, treble, beat, kick, snare, hi-hat, and sine/triangle/saw LFOs. Modulation can control opacity, brightness, speed, scale, or hue.

## Audio-reactive system

Input and analysis:

- Microphone input
- Browser/tab, window, or system-audio capture when supported by the browser
- 2048-point FFT
- Logarithmic spectrum analysis
- Spectrum and waveform displays
- Overall level, sub, bass, low-mid, mid, high-mid, and treble bands
- Beat, kick, snare, hi-hat, spectral-flux, and transient detection
- Attack/release envelopes and per-transient thresholds

Reliability and control:

- AudioWorklet background clock with Worker and timer fallbacks
- Noise-floor learning
- Automatic gain with preserved headroom
- Input gain, master reaction, gate, smoothing, dynamics, attack, release, and band gain controls
- Motion, brightness, scale, color, and per-layer modulation
- Automatic BPM estimation, tap tempo, half time, normal, double time, and quarter-beat controls
- Per-device calibration profiles
- Remembered microphone and automatic microphone startup after reload when browser permission permits
- Starting audio does not replace the selected visual

## Physical pixel mapping

Panel layout:

- Add and remove panels
- Mixed panel sizes and resolutions
- Logical X/Y placement
- Automatic row, column, grid, or compact arrangements
- Sparse logical canvases
- Per-panel enable/disable state

Panel transforms and wiring:

- Rotation at 0°, 90°, 180°, or 270°
- Horizontal and vertical mirror
- Across-row or down-column wiring
- Four input corners
- Serpentine or straight wiring
- Custom cable-chain order
- Forward or reverse controller chain

Physical addressing:

- Explicit panel start addresses
- Reserved gaps and disabled-panel address reservation
- Configurable total controller-frame size
- Preserved physical addresses rather than automatic compaction
- Exact logical-to-physical resolved route table
- Click-by-click custom wiring
- Duplicate, incomplete, overlapping, and out-of-range validation

## Mapping tests and recovery

Raw physical tests bypass the logical map:

- Hold one physical pixel on
- Previous/next physical pixel
- Slow physical chase
- Adjustable on-time and dark gap
- Blackout

v0.4.36 allows raw one-by-one testing even when no valid mapping exists. It walks directly through every configured controller address, including unassigned or reserved addresses.

Mapped logical tests include:

- Logical-pixel hold and chase
- Row, column, checkerboard, and rainbow tests
- Global horizontal, vertical, and diagonal matrix flow
- Panel-seam proof grid

Mapping storage:

- Browser working copy
- Disk-backed active mapping
- Timestamped backup history
- Automatic disk recovery when browser storage is missing
- JSON import/export

Default disk location:

```text
Documents/LEDController.net/Mappings
```

## Preset Memory

- Save, update, delete, and load presets from persistent browser memory
- One-click quick recall
- JSON library import/export for backup and transfer
- Complete visual, deck, layer, mixer, Show Director, and creative audio-response state
- Mapping intentionally stored separately from performance presets
- Loading a preset does not automatically start LED output
- Active microphone transport is preserved during preset changes

## Show Director and busking

- Manual Busking mode
- Assisted mode
- Autopilot mode
- Eight live look pads
- Punch, white hit, blackout tap, freeze, strobe, reverse, color hit, and next-look controls
- BPM and phrase-aligned transitions
- Kick, snare, hi-hat, and energy-driven performance gestures
- Festival, nightclub, cinematic, ambient, and corporate show styles
- Adjustable phrase length, transition time, intensity, variation, and gesture density

## Controller discovery and output

Discovery:

- WLED mDNS discovery
- WLED `/json/info` verification
- Fast local-subnet fallback scan
- Deep WLED scan
- Art-Net ArtPoll discovery
- Manual target entry
- Persistent target selection and health checks

Output:

- WLED/DDP UDP output
- Art-Net UDP output
- RGB, GRB, BRG, RBG, GBR, and BGR channel orders
- Configurable frame rate, brightness, target, port, and starting universe
- Automatic Art-Net universe splitting
- Monotonic server-side frame scheduler
- Frame skipping rather than burst transmission after missed deadlines
- Output ownership protection between mapping tests and live visuals
- Stop/blackout protection against stale delayed updates
- Output continues while the browser is unfocused

## Monitoring and diagnostics

- Running/idle state
- Frames, packets, bytes, and errors
- Actual FPS, scheduler jitter, and dropped frames
- Renderer and frame hashes
- Mapping fingerprint
- Logical and physical output addresses
- Output-owner status
- Server/client version lock
- Live activity and error logs

## Current limitations

v0.4.36 does not yet include:

- E1.31/sACN
- OSC
- Serial LED output
- Video layers
- Text layers
- Screen-capture layers
- Native Windows desktop packaging
