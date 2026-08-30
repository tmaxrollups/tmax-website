# TMAX Visual QA Pass

## Completed in this pass
- Added intrinsic width/height to content images to reduce layout shift.
- Added `decoding="async"` and lazy loading to non-logo content images.
- Kept logos eager/high-priority.
- Converted video poster frames from JPG to WebP and updated video references.
- Kept video preload at `metadata`; no autoplay was introduced.
- Added page-specific desktop/mobile hero focal positions for Home, Exterior Shades, Interior Shades, Garage Doors, Shutters, and Commercial.
- Changed About and Dealers page-header imagery so the same patio hero is not repeated across Home / Exterior / About.
- Removed same-page duplicate gallery images on Garage Doors, Interior Shades, and Commercial.
- Replaced the repeated Exterior Shades interior-view gallery image with the matching open-state view to strengthen the open/deployed sequence.

## Images removed from active galleries
- `garage-black-supercars.webp` — weak composition/lighting compared with the other garage installations.
- `interior-shades-lounge-green.webp` — substantially overlaps the marble-lounge installation and is already used on the homepage.
- `shutters-small-black.webp` — product occupies too little of the frame compared with the stronger shutter examples.

The source image files remain in the package for now; they are simply no longer referenced by those pages. They can be deleted after final deployment QA if desired.

## Repetition policy
Some cross-page repetition remains intentionally: homepage product cards/gallery act as previews of product-page imagery. Repetition inside the same product page was reduced. Product-page hero imagery is now more distinct across the primary pages.

## Video status
Current demonstration clips remain intentionally portrait and are not yet final-trimmed:
- Exterior shade demo: ~9 sec, 720x1280
- Interior shade demo: ~11 sec, 540x960

Final cropping/trimming should be done only after the exact desktop/mobile video containers are approved.
