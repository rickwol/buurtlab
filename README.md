# Buurtlab

Een 3D-ontwerpomgeving in de browser voor de piekvraag op het laagspanningsnet. Je ontwerpt een nieuwe buurt op een kavelgrid, of importeert een bestaande buurt uit de BAG en ontwerpt daarop verder. Per object stel je de omvang, de functie, het energielabel, de verwarming, de zonnepanelen en de laadpunten in. Daarna vergelijk je laadstrategieën en batterijen.

**Live:** https://rickwol.github.io/buurtlab/

Buurtlab is de ontwerptegenhanger van [SlimLadenStreamlit](https://github.com/rickwol/SlimLadenStreamlit). SlimLaden analyseert bestaande MSR's; Buurtlab gebruikt dezelfde kwartierprofielen en laadstrategieën, maar dan per gebouw en ontwerpbaar.

## Wat het rekent

- Kwartierwaarden over 2024 (35.040 kwartieren) per object: basisverbruik, warmte, laden en zon. Een batterij werkt in op het buurtsaldo.
- Basisverbruik: de genormaliseerde LIEV WP4-profielen per gebruiksfunctie.
- Warmte: label, verwarmingstype en de KNMI-temperatuur van De Bilt in 2024. De COP hangt af van de temperatuur.
- Laden met losse sessies per laadpunt, zodat de gelijktijdigheid ook bij kleine aantallen klopt. De ElaadNL-gemiddelde profielen kun je kiezen om te vergelijken met SlimLaden.
- Laadstrategieën: ongestuurd, netbewust (begrensd tussen 16 en 21 uur), dynamisch (valley filling op de buurtbelasting) en de vier ElaadNL-profielen.
- Batterij: peak shaving op een doelvermogen, eigen verbruik van zonnestroom, of sturen op de day-ahead-prijs.

## BAG-import

Zoekt een CBS-buurt op en haalt via PDOK de panden en verblijfsobjecten uit de BAG op:
- Aaneengesloten woningen (gedeelde gevelpunten) worden rijen.
- Panden met 4 of meer woningen worden appartementen.
- Utiliteit krijgt een object per functie.

Blokken in dezelfde rastercel en met hetzelfde label worden samengevoegd, en het grid schaalt mee met de buurt. Energielabels komen per pand uit EP-Online via de RIVM-dienst `rvo_energielabels`. Waar geen label geregistreerd is, schat Buurtlab het uit het bouwjaar. In het Liander-gebied komen de trafocapaciteit, de NBL-limiet en de gemeten piek mee.

## Bestanden

- `index.html`: opmaak
- `app.js`: model, 3D (Three.js via CDN), editor en import
- `profielen/profielen_2024.csv`: kwartierprofielen (gemiddelde = 1), temperatuur en day-ahead-prijs
- `profielen/ev_msr.json`: per MSR uit SlimLaden `[lon, lat, adrespunten (max 100), EV's, personenauto's]`
- `profielen/trafos_liander.json`: per buurtcode `[aantal trafo's, capaciteit kW, NBL kW, som gemeten pieken kW]`

## Lokaal draaien

De profielen worden met `fetch` geladen, dus open de app via een webserver: `python3 -m http.server` in deze map, en dan http://localhost:8000.

## Status

Dit is een prototype voor onderwijs en verkenning. Alle kentallen zijn indicatief; ze staan onder "Bronnen en rekenaannames" in de app.

Hogeschool van Amsterdam, Centre of Expertise City Net Zero.
