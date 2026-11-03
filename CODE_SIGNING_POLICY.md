# Code signing policy

Exportium's Windows installer is being set up for free code signing through [SignPath.io](https://signpath.io), with the
certificate issued by the [SignPath Foundation](https://signpath.org).

> **Status:** applied for, not yet active. Until the application is approved, releases are unsigned and Windows
> SmartScreen shows a "Windows protected your PC" warning (More info → Run anyway). This page is updated when signing starts.

## What is signed
Only the Exportium Windows installer (the `.exe` on each release), built by GitHub Actions from the source in
[this repository](https://github.com/AgastyaSaiN/Project-Exportium) (the build scripts and workflow are part of it).
Nothing else is signed, and no binary built elsewhere is ever submitted.

## Roles
| Role | Who |
| --- | --- |
| Author (changes the source) | [AgastyaSaiN](https://github.com/AgastyaSaiN) |
| Reviewer (reviews changes from other contributors) | [AgastyaSaiN](https://github.com/AgastyaSaiN) |
| Approver (approves every signing request) | [AgastyaSaiN](https://github.com/AgastyaSaiN) |

Every release needs the approver's manual approval before it is signed. Everyone with these roles uses multi-factor
authentication on GitHub and SignPath.

## Privacy
Exportium works fully offline. It does not send your chats, files or any personal data anywhere. The installed app
blocks all network traffic except the check for a new version on GitHub Releases, which sends no data from your exports.
It writes a log file on your computer only (`%APPDATA%/Exportium/logs/main.log`).

## Uninstalling
Use **Settings → Apps → Installed apps → Exportium → Uninstall** in Windows.
