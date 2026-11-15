# Kingdom Chess — Google Play Store Listing & Visual Assets Checklist

Use only verified product facts below when filling out the Google Play Console **Main store listing**.

---

## 1. Store Text Copy

### App Title (max 30 chars)
```text
Kingdom Chess
```

### Short Description (max 80 chars)
```text
A cinematic 3D fantasy chess battle where you rule the kingdom and master the board.
```

### Full Description (factual feature summary)
```text
Command rival armies on a dark-fantasy 3D chessboard in Kingdom Chess — a tactical 3D chess experience designed for smooth, responsive mobile play.

CHOOSE FROM FIVE 3D KINGDOM SETS
Lead complete 6-piece 3D character rosters across five distinct fantasy kingdoms:
• Human Royal Kingdom — Medieval sovereigns, arcane queens, paladins, centaur lancers, and wardens
• Titan Vanguard — Armored vanguard heroes with heavy shields and dual-blade combat styles
• Inferno Empire — Obsidian and ember warriors forged in volcanic battlefields
• Shadow Dominion — Midnight assassins, dark sorcerers, and phantom blades
• Celestial Kingdom — Radiant starlight defenders wielding golden and astral arms

PLAY SOLO OR PASS-AND-PLAY
• Player vs AI — Test your strategy against 5 AI difficulty ranks, from Young Squire to The Ancient King (Grandmaster)
• Choose Your Side — Command either the White Kingdom or Black Kingdom against the AI
• Local 1 vs 1 — Challenge a friend on the same device with optional Auto-Flip camera between turns

TACTICAL CONTROLS & CHESS TIMERS
• Four Time Controls — 10 Min (Classic), 5 Min (Blitz), 3 Min (Rapid Duel), or Unlimited (No Clock)
• Full Official Chess Rules — Legal move highlights, Castling, En Passant, Pawn Promotion (Queen, Rook, Bishop, Knight), Check alerts, Checkmate, and Stalemate/Draw detection
• Precise Single-Tap Touch Controls — Tap any piece to view legal squares and tap any highlighted tile to move
• Fixed Battlefield Camera & Zoom — Pinch-to-zoom, Zoom buttons, Inspect focus view, and Overview reset

CINEMATIC COMBAT & BATTLEFIELD AUDIO
• Capture Duels — Every capture triggers character-specific 3D combat choreography
• Weapon-Based Sound Design — Realistic layered sword, axe, hammer, spear, dagger, bow, magic staff, shield, and armor sound effects
• Royal Check & Checkmate Announcements — Built-in sound, music, and graphics quality toggles (High & Balanced)
```

---

## 2. Store Graphic & Screenshot Asset Checklist

Capture real screenshots directly from the live Android / WebView build (do not fabricate features or fake UI):

| Asset | Play Console Requirement | Recommended Capture Screen |
| --- | --- | --- |
| **App Icon** | `512 × 512 px` PNG (32-bit, no alpha transparency for Store icon) | Export high-res Kingdom Chess royal gold crown on `#0B0F18` slate-navy background matching `mipmap-xxxhdpi/ic_launcher.png` |
| **Feature Graphic** | `1024 × 500 px` PNG/JPG | Composite of the 3D Home Diorama rival kings and Kingdom Chess title |
| **Phone Screenshots** | Minimum 2–8 screenshots (`9:16` portrait, min 320px, max 3840px) | 1. Home Screen 3D Rival Kings diorama<br>2. Choose Your Kingdom 3D character preview (e.g., Human Royal Kingdom / Inferno Empire)<br>3. Active 3D Match Board with legal move highlights<br>4. Capture Combat Duel choreography in progress<br>5. AI Difficulty & Match Setup dossier<br>6. Checkmate Victory screen |

---

## 3. Launcher Icon & Splash Screen Status (Verified in Repo)

- **Adaptive Launcher Icon**: `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` & `ic_launcher_round.xml` using `@color/ic_launcher_background` (`#0B0F18`) and `@mipmap/ic_launcher_foreground` across `mdpi` through `xxxhdpi`.
- **Legacy Icons**: Branded `ic_launcher.png` and `ic_launcher_round.png` present across `mdpi` (`48x48`), `hdpi` (`72x72`), `xhdpi` (`96x96`), `xxhdpi` (`144x144`), and `xxxhdpi` (`192x192`).
- **Production Splash Screen**: `AppTheme.NoActionBarLaunch` in `android/app/src/main/res/values/styles.xml` paired with `@drawable/launch_splash` (`#0B0F18` dark royal canvas + centered Kingdom Chess emblem) and Android 12+ `Theme.SplashScreen` attributes for instant, non-stretched launch.
