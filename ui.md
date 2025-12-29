
UI GUIDELINES.

============================================================
FOUNDATION
==========

• Prioritize speed and clarity.
• Touch-first interaction; controller second.
• Zero decorative animation at MVP.
• 60fps target; drop anything that threatens it.

============================================================
LAYOUT
======

• Single-column structure.
• Edge padding: 16px minimum.
• Hit target: 44px minimum.
• Use safe areas for notches.
• Avoid horizontal scrolling in core flows.

============================================================
NAVIGATION
==========

• Stack navigation only.
• Max 3 primary screens: Login → Library → Stream.
• No nested tabs.
• Back action always visible.
• Auto-redirect logged-in users to Library.

============================================================
COLOR + THEMING
===============

• High contrast by default.
• Light or dark theme; not both at MVP.
• Limit palette: primary, secondary, background, error, success.
• No gradients.
• Avoid transparency/blur.

============================================================
TEXT + TYPOGRAPHY
=================

• Primary font: system default.
• Title: 24–28px, medium weight.
• Body: 16px.
• Buttons: 16px uppercase or bold.
• Truncate long game names; no wrapping past 1 line.

============================================================
COMPONENTS
==========

• Buttons: full-width, high-contrast, single action per screen.
• Cards: list entries only; no card grids.
• Inputs: minimal; inline validation only.
• Spinners: timeout → error state after 5 seconds.
• Error banners: persistent until dismissed.

============================================================
LIBRARY SCREEN
==============

Item Layout:
• Thumbnail (16:9)
• Title, short description, status
• Launch button always visible
• Scroll-only interaction; no hovers

Actions:
• Tap → Connect
• Long-press → Context menu (optional; not at MVP)

============================================================
STREAM SCREEN
=============

• Video surface: fullscreen.
• Controls overlay: hide by default; tap to show.
• Overlay elements:

* Exit
* Connection status (ping)
* Quality indicator (720/1080)
  • No chat, no overlays beyond essentials.

============================================================
ERROR STATES
============

• Connection lost: retry + exit.
• Unsupported codec: fallback message.
• Controller disconnected: prompt + auto-reconnect.
• Latency high: show indicator; no modal.

============================================================
PERFORMANCE RULES
=================

• Avoid RN re-renders; memo critical components.
• Disable layout recalculation during stream.
• Preload images in Library.
• No modals during streaming; use overlays.

============================================================
TOUCH + FEEDBACK
================

• Tactile feedback on major actions.
• Controller and touch parity: both work in Library and Login.
• Streaming screen plays without touch; controller-first.

============================================================
ACCESSIBILITY
=============

• Contrast ratio 4.5:1 minimum.
• Scalable font sizes through system settings.
• High-visibility focus indicators for controller navigation.

============================================================
FAIL CONDITIONS (DO NOT SHIP)
=============================

• Text smaller than 14px.
• Buttons smaller than 44px tall.
• Invisible navigation or hidden exit.
• Blocking modals during stream.

============================================================
FINAL DIRECTIVE
===============

UI must stay invisible to the experience:
Get user from **Launch → Play** with **minimum friction** and **no cognitive overhead**.
