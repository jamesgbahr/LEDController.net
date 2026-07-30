# Physical Pixel Mapper v0.1.3

This release adds live physical-chain tracing to the working Discovery + Mapping Preview baseline.

## New mapping tests

- **Hold pixel ON** continuously retransmits a frame with one physical address lit and every other address black.
- **Previous / Next** moves one physical address at a time and immediately holds the new pixel.
- **Slow chase** advances through the physical output chain at an adjustable rate.
- **Dark gap** inserts an adjustable blackout interval between neighboring pixels so transitions are unambiguous.
- **All pixels OFF** sends a blackout frame and stops continuous transmission.
- Clicking a logical pixel in the mapping canvas loads its calculated physical address into the live tester.
- The active output address is highlighted on the mapping canvas.

## Recommended first test

1. Discover the WLED device and click **Use target**.
2. Open **Pixel Mapping**.
3. Set brightness to 10–20%.
4. Set on time to 2 seconds and dark gap to 0.3 seconds.
5. Click **Start slow chase**.
6. Confirm the physical LEDs illuminate in order 1, 2, 3, and so on.
7. Use **Previous**, **Hold pixel ON**, and **Next** to inspect uncertain transitions.

The slow chase is retransmitted at 20 FPS while its address changes slowly. This keeps WLED in realtime mode even when a pixel is held for several seconds.
