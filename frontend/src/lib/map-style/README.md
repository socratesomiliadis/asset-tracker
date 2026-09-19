# Basemap style

`positron.json` is the OpenFreeMap Positron style retrieved from
https://tiles.openfreemap.org/styles/positron on 2026-09-20.
Upstream: https://github.com/hyperknot/openfreemap-styles.

The style derives from OpenMapTiles Positron and CartoDB Basemaps, designed
by Stamen and Paul Norman for CartoDB Inc. See the included license files
for BSD code terms and Creative Commons design attribution.

Our `createMapStyle()` clones this style and adjusts water, vegetation,
residential land, building, and background colors. The original JSON stays
unchanged so upstream changes and local customizations can be reviewed separately.
Tiles, glyphs, and sprites are served by OpenFreeMap. MapLibre retains the
tile source attribution. Both the asset map and location picker use this style.
