# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DHA Store Counter is a Progressive Web App (PWA) for tracking store sales. It runs fully offline after initial download and persists all data locally using localStorage with cookie backup.

## Architecture

**Single-page vanilla JS application with no build step:**
- `index.html` - Main HTML structure with three tabs: Products, Stats, Settings
- `app.js` - All application logic including data persistence, UI rendering, and sales tracking
- `styles.css` - Mobile-first responsive CSS with CSS custom properties
- `sw.js` - Service worker for offline caching (caches all assets on install)
- `manifest.json` - PWA manifest for installability

**Data Flow:**
- Products and sales stored in localStorage with cookie backup for redundancy
- All data operations go through the `Storage` object in app.js
- Undo stack maintains last 50 sales for reversal
- Stats calculated on-the-fly from sales array filtered by date period

## Running the App

Serve with any static file server:
```bash
npx serve .
# or
python -m http.server 8000
```

Then open http://localhost:8000 (or the appropriate port). The service worker requires HTTPS in production but works on localhost for development.

## Key Data Structures

```javascript
// Product
{ id, name, cost, price, color, image (base64 or null) }

// Sale
{ id, productId, productName, cost, price, quantity, timestamp (ISO string) }
```

## Modifying the App

- **Adding features:** Keep everything in single files - no module bundling
- **Styling:** Use CSS custom properties in `:root` for theming
- **Icons:** SVG icons in `/icons/` - update both manifest.json and sw.js ASSETS array if changed
- **Service worker:** Increment `CACHE_NAME` version when updating cached assets
