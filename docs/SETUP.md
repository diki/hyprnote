# Hyprnote Build Instructions

This document provides all the necessary steps to build the Hyprnote application for local development and explains the requirements for a production build.

## Local Development Build

These instructions will guide you through creating a local build of the application that you can run on your machine for development and testing.

### 1. Prerequisites

Before you begin, make sure you have the following software installed on your system:

*   **Rust and Cargo:** The core of the application is built with Rust. You can install it from [rust-lang.org](https://rust-lang.org).
*   **Node.js and pnpm:** The frontend is a Node.js project, and it uses `pnpm` as its package manager. You can install Node.js from [nodejs.org](https://nodejs.org) and then install pnpm by running `npm install -g pnpm`.
*   **Tauri CLI:** The Tauri command-line interface is used to build the final desktop application. You can install it by running `cargo install tauri-cli`.
*   **Xcode Command Line Tools (macOS only):** These are required for building native macOS applications. You can install them by running `xcode-select --install` in your terminal.
*   **CMake:** Some of the dependencies require CMake to be installed. You can install it with Homebrew: `brew install cmake`.

### 2. Clone the Repository

```bash
git clone git@github.com:diki/hyprnote.git
cd hyprnote
```

### 3. Install Frontend Dependencies

```bash
pnpm install
```

### 4. Set Environment Variables

The application requires several environment variables to be set for the build to succeed. For a local build, you can use the following mock values:

```bash
export SENTRY_DSN="https://examplePublicKey@o0.ingest.sentry.io/0"
export KEYGEN_ACCOUNT_ID="mock_account_id"
export KEYGEN_VERIFY_KEY="mock_verify_key"
export POSTHOG_API_KEY="phx_HdcNnr9C2e7gj4iXsZkpE5bH9sTjXDrnM3tVnRhUKfApj9v"
```

### 5. Run the Build Command

Once the prerequisites are installed and the environment variables are set, you can run the following command to build the application:

```bash
pnpm --filter @hypr/desktop tauri:build
```

This command will build the frontend, compile the Rust backend, and create a runnable application bundle.

### 6. Run the Application

After the build is complete, you can find the application at the following path:

`apps/desktop/src-tauri/target/release/bundle/macos/Hyprnote Dev.app`

You can run this `.app` file directly.

## Production Build and Distribution

To create a production-ready build that you can distribute to users, you will need to take several additional steps:

### 1. Real API Keys and DSNs

For a production build, you will need to replace the mock environment variables with real values from the respective services:

*   **`SENTRY_DSN`:** You will need a valid DSN from a Sentry project to enable error reporting.
*   **`KEYGEN_ACCOUNT_ID` and `KEYGEN_VERIFY_KEY`:** You will need a real account and public key from Keygen to manage license keys.
*   **`POSTHOG_API_KEY`:** You will need a real API key from PostHog for product analytics.

### 2. Code Signing (macOS and Windows)

To distribute your application, you will need to code sign it. This is a security measure that assures users that the application is from a trusted source and has not been tampered with.

*   **macOS:** You will need an Apple Developer ID certificate to sign your application. You will also need to notarize the application with Apple.
*   **Windows:** You will need a code signing certificate from a trusted Certificate Authority (CA).

### 3. Enable the Updater

For a production build, you will want to enable the auto-updater so that users can receive updates automatically. This involves:

*   **Generating a Signing Key Pair:** You will need to generate a public/private key pair for signing the updates. The private key will be set as the `TAURI_SIGNING_PRIVATE_KEY` environment variable during the build.
*   **Configuring `tauri.conf.json`:** You will need to re-enable the updater in the `tauri.conf.json` file by setting `createUpdaterArtifacts` to `true` and providing the public key in the `updater.pubkey` field.

### 4. Enable DMG/Installer Bundling

For easier distribution, you will want to re-enable the creation of `.dmg` (macOS) and other installer formats. In `tauri.conf.json`, you can change the `targets` array back to `"all"` to create all the default installer types for your platform.
