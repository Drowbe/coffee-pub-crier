# Coffee Pub Crier

A Foundry VTT module that enhances combat turn announcements and notifications with rich visual and audio features.

![Foundry v12](https://img.shields.io/badge/foundry-v12-green)
![Latest Release](https://img.shields.io/github/v/release/Drowbe/coffee-pub-crier)
![MIT License](https://img.shields.io/badge/license-MIT-blue)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/Drowbe/coffee-pub-crier/release.yml)
![GitHub all releases](https://img.shields.io/github/downloads/Drowbe/coffee-pub-crier/total)

## Overview

Coffee Pub Crier enhances your Foundry VTT combat experience with rich visual and audio announcements for combat turns, making battles more engaging and easier to follow.

## Preview

### Combat Turn Cards
<img src="product/screen-card-blue.png" width="400" alt="Combat Turn Card - Blue Theme">

*Combat turn card with blue theme*

<img src="product/screen-card-storm-deathsaving.png" width="400" alt="Combat Turn Card - Death Saving">

*Combat turn card showing death saving throws*

### Round Announcements
<img src="product/screen-round.png" width="400" alt="Round Announcement">

*Round transition announcement*

### Module Configuration
<img src="product/screen-settings-card.png" width="400" alt="Card Settings">

*Extensive card customization options*

<img src="product/screen-settings-round.png" width="400" alt="Round Settings">

*Round announcement settings*

## Features

### Combat Turn Announcements
- Custom styled chat messages for character turns
- Configurable character portraits/tokens display
- Optional character stats display including:
  - HP status
  - Ability scores
  - Armor Class
  - Movement speed
  - Death saving throws status
- Three layout options: full, small, or none

### Round Management
- Customizable round announcements
- Configurable sound effects for new rounds
- Visual round transition indicators

### Combat Tracking
- Missed turn detection and GM notifications
- Last combatant action tracking
- Turn order management

### Customization Options
- Configurable card styles for turns and rounds
- Custom icon selections
- Toggle visibility of:
  - Player names
  - Ability scores
  - Health status
  - Bloody portraits (damage indicators)
- NPC name obfuscation options
- Customizable sound effects

### Health Status Visualization
- Dynamic health status indicators:
  - Healthy (>75%)
  - Hurt (50-75%)
  - Dying (25-50%)
  - Critical (1-25%)
  - Death Saving/Dead (≤0%)
- Visual death saving throw trackers

### Permission System
- Integrated with Foundry's permission system
- GM-only information handling
- Configurable visibility settings

## Installation

### Method 1: Foundry VTT Interface
1. Inside Foundry's Configuration and Setup screen, go to **Add-on Modules**
2. Click "Install Module"
3. Search for "Coffee Pub Crier"
4. Click 'Install' 

### Method 2: Manifest URL
Use this manifest URL in Foundry's module installer:
```
https://github.com/Drowbe/coffee-pub-crier/releases/latest/download/module.json
```

## Dependencies
- [Coffee Pub Blacksmith](https://github.com/Drowbe/coffee-pub-blacksmith) - Required for core functionality

## Development
Want to contribute? Great! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Support & Community
- Found a bug? Please [open an issue](https://github.com/Drowbe/coffee-pub-crier/issues)
- Have a feature request? [Submit it here](https://github.com/Drowbe/coffee-pub-crier/issues)
- Need help? Contact me on Discord: `drowbe`

## Attribution
This module is built for [Foundry Virtual Tabletop](https://foundryvtt.com/).

## License
This module is licensed under the [MIT License](./LICENSE).

## Credits
Created by drowbe

