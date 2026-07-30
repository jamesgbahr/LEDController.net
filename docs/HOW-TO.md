# How-To Guide

This guide covers the normal LEDController.net v0.4.36 workflow from controller discovery through live output.

## 1. Start LEDController.net

On Windows, double-click:

```text
start-ledcontroller.cmd
```

Or run:

```powershell
npm start
```

Open:

```text
http://localhost:8087
```

Keep the server terminal open while using LEDController.net.

## 2. Discover a controller

1. Open the **Discover** workspace.
2. Start discovery.
3. Select the WLED or Art-Net device when it appears.
4. Confirm the displayed IP address and device information.

When a WLED controller is not found:

- Run **Deep WLED Scan**.
- Confirm both devices are on the same local network.
- Allow Node.js through the private-network firewall.
- Enter the controller IP manually.

The selected target is shared across Discover, Map, Output, and Monitor.

## 3. Set the controller frame size

Before one-by-one physical testing:

1. Open **Map**.
2. Enter the actual total number of addressable LEDs under **Controller frame pixels**.
3. Start at low brightness, usually 10–20%.

The frame size includes active pixels and any intentional reserved address gaps.

## 4. Walk the physical chain one pixel at a time

Use this when rebuilding an unknown installation or identifying physical cable order.

1. Open the mapper's **Raw test** section.
2. Confirm the target, protocol, and controller frame size.
3. Set low test brightness.
4. Press **Hold ON**.
5. Use **Previous** and **Next** to move through physical addresses.
6. Record which real-world pixel lights at each address.
7. Use **Blackout** when finished.

Raw mode bypasses the logical map. In v0.4.36 it works with a blank, incomplete, or invalid map and moves through reserved or unassigned addresses.

The raw test identifies the physical chain; it does not automatically assign logical XY positions.

## 5. Create a panel mapping

For a normal rectangular panel:

1. Add a panel.
2. Enter its width and height.
3. Set its logical X/Y position.
4. Choose across-row or down-column wiring.
5. Choose the physical input corner.
6. Enable or disable serpentine wiring.
7. Set panel rotation and mirror options.
8. Set the physical starting LED address.
9. Repeat for additional panels.
10. Set the panel cable-chain order.

Use the mapping preview to compare logical coordinates with physical addresses.

## 6. Create a custom click-by-click route

Use custom routing for irregular sculptures, nonstandard panel wiring, or installations where the cable path does not follow a simple grid.

1. Build the logical canvas and panel positions.
2. Open the custom wiring editor.
3. Start assignment.
4. For each physical address, click its corresponding logical pixel.
5. Use Undo to correct the most recent assignment.
6. Verify the assigned count matches the required active pixels.
7. Save only after duplicate and incomplete-route warnings are clear.

A custom route overrides calculated panel wiring for that panel or map.

## 7. Verify the completed mapping

Run several mapped tests before using performance visuals:

- Logical XY chase
- Row test
- Column test
- Checkerboard
- Global horizontal flow
- Global vertical flow
- Global diagonal flow
- Panel seam grid

Check for:

- Reversed rows or columns
- Incorrect start corners
- Rotation errors
- Mirror errors
- Swapped panel order
- Address gaps
- Seam discontinuities

## 8. Save and back up the mapping

Press **Save active mapping** after the map validates.

v0.4.36 stores:

- A browser working copy
- `Documents/LEDController.net/Mappings/active-mapping.json`
- A timestamped backup under `Documents/LEDController.net/Mappings/Backups`

The newest 20 timestamped backups are retained.

Also export a mapping JSON to OneDrive, Google Drive, an external drive, or another computer. A full Windows drive wipe can remove the Documents copy.

## 9. Create a visual look

1. Open **Output Studio**.
2. Select a visual for Deck A.
3. Adjust its colors, speed, scale, and direction.
4. Select a visual for Deck B.
5. Move the A/B crossfader to blend the decks.
6. Choose a mixer mode.
7. Use Solo A or Solo B to verify each deck independently.

The center preview shows the server-rendered logical frame before physical mapping.

## 10. Add layers

Each deck supports four layers.

1. Select Deck A or Deck B.
2. Press the layer `+` button.
3. Select the new layer.
4. Choose its generator and colors.
5. Open **Layer controls**.
6. Set opacity and blend mode.
7. Add masks or modifiers when needed.
8. Assign audio or LFO modulation.
9. Reorder, solo, duplicate, disable, or delete layers as required.

The completed layers are composited inside each deck before the A/B mixer combines the decks.

## 11. Use microphone audio reaction

1. Open **Audio controls**.
2. Select the desired microphone.
3. Start the microphone and grant browser permission.
4. Enable **React visuals to audio**.
5. Begin with the Balanced response profile.
6. Adjust master reaction before changing individual band gains.
7. Use calibration when steady room noise causes unwanted response.

Audio can modulate ordinary visual generators; selecting an audio-specific generator is optional.

Microphone startup does not replace the current visual. When auto-start is enabled, LEDController.net attempts to restore the same microphone after a page reload.

## 12. Save and recall a performance preset

1. Build the desired deck, layer, mixer, Show Director, and audio-response state.
2. Open **Presets**.
3. Enter a name.
4. Press **Save to memory**.
5. Use **Quick recall** or **Load from memory** later.

Presets save creative and performance state. They do not save or replace the physical mapping.

Use JSON export as a backup or to move presets to another computer.

## 13. Use Show Mode

1. Open **Show Mode**.
2. Choose Busking, Assisted, or Autopilot.
3. Select a show style.
4. Set BPM or use audio tempo detection.
5. Adjust phrase length, transitions, intensity, variation, and gesture density.
6. Use look pads and performance buttons during manual operation.

Show timing is owned by the local Node service, so changing browser focus does not change the physical animation rate.

## 14. Start physical output safely

1. Confirm the correct target controller.
2. Confirm the active mapping.
3. Set low master brightness.
4. Confirm protocol, frame rate, channel order, and universe or port settings.
5. Press **Start Visual**.
6. Increase brightness only after verifying the correct pixels and colors.

Use **Stop / Blackout** immediately if the wrong controller, mapping, or physical pixels respond.

## 15. Recover a mapping

When browser storage is empty, v0.4.36 checks the disk-backed active mapping automatically.

Manual recovery:

1. Look under `Documents/LEDController.net/Mappings`.
2. Copy the active mapping or a timestamped backup somewhere safe.
3. Use the mapper's JSON import function.
4. Verify the map with low-brightness raw and mapped tests.
5. Press **Save active mapping** again.

## Common problems

### Previous/Next does not light the expected pixel

- Confirm the controller frame size.
- Confirm the correct target IP and protocol.
- Press Hold ON before stepping.
- Check master/test brightness.
- Verify the physical controller output count.

### A visual appears in preview but not on the LEDs

- Confirm **Start Visual** is active.
- Check the output target and protocol.
- Confirm the map validates.
- Check output ownership; an active mapping test can take control from the visual engine.
- Close any older LEDController.net server still using port 8087.

### Colors are wrong

Change the channel order between RGB, GRB, BRG, RBG, GBR, and BGR until the physical colors match the preview.

### Audio meters stay at zero

- Grant microphone permission.
- Confirm the selected Windows input device.
- Check Windows microphone privacy settings.
- Click once inside the page to resume a suspended AudioContext.

### Audio meters stay near 100%

Run audio calibration, lower input gain or master reaction, and allow the noise-floor learner to settle before increasing individual band boosts.
