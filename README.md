# Buurtlab

Een 3D-buurtmodel in de browser waarmee je de piekvraag op de transformator verkent. Je plaatst woningen, winkels, kantoren, bedrijfspanden en laadpleinen en stelt per object de omvang, het energielabel, de verwarming, de zonnepanelen en de laadpunten in. Achter elk object zit een jaarprofiel per uur. De buurtpiek is de hoogste som van die profielen, dus de gelijktijdigheid komt vanzelf uit het model.

**Live:** https://rickwol.github.io/buurtlab/

## Structuur

- `index.html`: de complete app (Three.js via CDN, verder geen build-stap)
- `profielen/`: plek voor gemeten of standaardprofielen (NEDU, ElaadNL, KNMI, PVGIS) als CSV

## Profielen aanleveren

Lever een CSV aan met één rij per uur (8.760) of per kwartier (35.040). Zet de tijdstempel in de eerste kolom en daarna één kolom per profiel. Vermeld of de waarden genormaliseerd zijn (fractie van het jaarverbruik) of absoluut (kW).

## Lokaal draaien

Open `index.html` in een browser, of start `python3 -m http.server` in deze map en ga naar http://localhost:8000.

## Status

Dit is een prototype. Alle kentallen zijn indicatief; ze staan onder "Rekenaannames" in de app. Gepland: slim laden, batterijen en scenario's vergelijken.

Hogeschool van Amsterdam, Centre of Expertise City Net Zero.
