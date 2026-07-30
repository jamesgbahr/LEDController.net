# Installation Guide

This guide installs the browser/server edition of LEDController.net v0.4.36.

## Requirements

- Windows 10/11, macOS, or Linux
- Node.js 20 or newer; the current Node.js LTS release is recommended
- A modern Chromium-based browser recommended
- WLED/DDP or Art-Net hardware on the same local network for physical output
- Microphone permission for audio-reactive operation
- A private/local network connection that allows UDP traffic

LEDController.net has no required cloud service and does not require a database.

## Windows installation without PowerShell

This is the easiest method and does not require you to open PowerShell, install Git, or use command-line instructions.

### 1. Install Node.js

Download Node.js from the official website:

**[Download Node.js](https://nodejs.org/en/download)**

On the Node.js download page:

1. Choose the **LTS** release.
2. Choose the **Windows Installer (.msi)** for your computer. The x64 installer is correct for most Windows PCs.
3. Open the downloaded installer.
4. Accept the license and leave the normal installation options enabled.
5. Make sure Node.js is added to the Windows `PATH` when that option is shown.
6. Finish the installation.

Restarting Windows is normally unnecessary, but close and reopen any Command Prompt or terminal windows that were already open before Node.js was installed.

### 2. Download LEDController.net

1. Open the LEDController.net GitHub repository.
2. Click the green **Code** button.
3. Click **Download ZIP**.
4. Open your Downloads folder.
5. Right-click the downloaded ZIP and choose **Extract All**.
6. Open the extracted project folder.

Do not run LEDController.net from inside the ZIP archive. The entire archive must be extracted first.

### 3. Start LEDController.net

Double-click:

```text
start-ledcontroller.cmd
```

A command window will start the LEDController.net server. When the server is ready, the launcher automatically opens this address in your default web browser:

```text
http://localhost:8087
```

Keep the LEDController.net command window open while using the program. Closing that window stops the local server and LED output.

If Windows displays a security warning for the command file, choose **More info**, verify that the file came from the LEDController.net package, and then choose **Run anyway**.

### 4. Allow Windows Firewall access

The first time Node.js uses the network, Windows may display a firewall prompt. Allow access on **Private networks** so controller discovery and UDP output can work on your local network.

Public-network access is normally unnecessary.

## Windows installation using Command Prompt

You do not need to use PowerShell. You can also start LEDController.net from the regular Windows Command Prompt:

1. Open the extracted LEDController.net folder in File Explorer.
2. Click the folder address bar.
3. Type `cmd` and press Enter.
4. In the Command Prompt window, run:

```bat
npm start
```

Then open:

```text
http://localhost:8087
```

The `start-ledcontroller.cmd` launcher is recommended because it opens the browser automatically and checks for an older LEDController.net server already using port 8087.

## PowerShell installation alternative

Open PowerShell in the project folder and run:

```powershell
node --version
npm --version
npm start
```

The Node.js version should begin with `v20` or newer.

## Clone with Git

Git is optional. From Command Prompt, PowerShell, or another terminal:

```bash
git clone <repository-url>
cd LEDController.net
npm start
```

Use the HTTPS clone address displayed under GitHub's **Code** button.

## macOS or Linux installation

Install Node.js 20 or newer, clone or extract the project, then run:

```bash
npm start
```

Open:

```text
http://localhost:8087
```

Depending on the operating system firewall, allow Node.js to receive local-network discovery traffic and transmit UDP packets.

## First-run checklist

1. Confirm the computer and LED controller are on the same network.
2. Open the **Discover** workspace.
3. Allow microphone access when prompted if audio reaction is required.
4. Start with master brightness around 10–20% during mapping and wiring tests.
5. Configure and save the physical mapping before starting a full visual.

## Updating to a newer release

1. Stop the existing LEDController.net server.
2. Back up mappings and preset JSON files.
3. Extract the new release into a new folder rather than overwriting the old folder.
4. Start the new release.
5. Confirm the displayed client and server versions match.
6. Verify the saved mapping at low brightness before live use.

Mapping backups created by v0.4.36 are stored under:

```text
Documents\LEDController.net\Mappings
```

## Running the test suite

From Command Prompt or PowerShell in the project folder:

```text
npm test
```

v0.4.36 contains 229 automated tests covering mapping, output, visual rendering, layers, audio, presets, discovery, and UI regressions.

## Installation troubleshooting

### Double-clicking the launcher does nothing

- Confirm the ZIP was fully extracted.
- Confirm `start-ledcontroller.cmd`, `server.mjs`, and the `public` folder are in the same project folder.
- Install Node.js from the official download link above.
- Restart Windows after installing Node.js if the launcher still says Node is missing.

### `node` is not recognized

Node.js is not installed or was not added to `PATH`. Reinstall Node.js using the official installer and keep the normal PATH option enabled.

### The browser does not open automatically

Wait a few seconds for the server to finish starting, then manually open:

```text
http://localhost:8087
```

If the page still does not load, inspect the LEDController.net command window for an error message.

### Port 8087 is already in use

An older LEDController.net process may still be running. Close its terminal window or stop the Node process, then start the current release again.

### The page opens but discovery finds nothing

- Confirm the controller and computer are on the same subnet.
- Allow Node.js through Windows Firewall on private networks.
- Temporarily disable VPN software that changes local routing.
- Try the manual controller IP field.
- Use **Deep WLED Scan** when normal discovery does not find a WLED device.

### The microphone does not start

Check the browser's microphone permission for `localhost`, Windows microphone privacy settings, and the selected input device. A normal click inside LEDController.net can resume a browser-suspended AudioContext.
