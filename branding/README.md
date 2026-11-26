# GitHub App Logo & Receipt Stamp Upload Folder

Upload your **App Logo** and **Receipt Stamp** directly into this `branding/` folder on GitHub (using **Add file → Upload files → Commit changes**).

Every time you commit an image here, GitHub Actions automatically rebuilds and publishes updated Android APKs with your new logo and stamp already built in.

## Supported Files

| File Name | What It Updates | Recommended Format |
| :--- | :--- | :--- |
| `app-logo.png` *(or `.jpg`, `.jpeg`, `.svg`)* | **CBE Mobile Banking** Android launcher icon, splash screen, notification icon, PWA icons, and in-app bank logo | Square PNG (`512x512` or larger), transparent or white background |
| `stamp.png` *(or `.jpg`, `.jpeg`, `.svg`)* | **CBE Web & PDF Receipt** rubber stamp bundled inside the app | Transparent PNG (`400x400`–`800x800`) |
| `messages-logo.png` *(optional)* | **Messages** standalone Android APK launcher icon | Square PNG (`512x512`) |
| `truecaller-logo.png` *(optional)* | **Truecaller** standalone Android APK launcher icon | Square PNG (`512x512`) |
| `phone-logo.png` *(optional)* | **Phone** standalone Android APK launcher icon | Square PNG (`512x512`) |

## How to Upload on GitHub

1. Open this `branding/` folder in your GitHub repository.
2. Click **Add file** → **Upload files**.
3. Drag and drop `app-logo.png` and/or `stamp.png`.
4. Click **Commit changes**.
5. Wait for the **Build & Publish Android APKs** workflow in the **Actions** tab to finish — existing users will automatically receive the new logo and stamp in the next in-app update.

> **Note:** To revert back to the default app logo or remove the bundled receipt stamp, simply delete `branding/app-logo.png` or `branding/stamp.png` on GitHub and commit.
