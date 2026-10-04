# Czech region map

`src/data/czech-regions.json` contains simplified SVG paths derived from
[geoBoundaries gbOpen CZE ADM1](https://www.geoboundaries.org/api/current/gbOpen/CZE/ADM1/),
boundary ID `CZE-ADM1-73172107`, representing 2021 boundaries from the Czech Office for Surveying (ČÚZK).

Source: https://github.com/wmgeolab/geoBoundaries/blob/9469f09/releaseData/gbOpen/CZE/ADM1/geoBoundaries-CZE-ADM1_simplified.geojson

License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
Changes: projected to a local SVG coordinate system, simplified to approximately
0.8 SVG units, rounded coordinates, and added Czech labels. The numeric region
codes match the ČKA API region IDs. No external map requests are made by the app.
