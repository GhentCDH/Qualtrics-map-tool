# Qualtrics Map Tool

An interactive map widget for embedding polygon-drawing functionality into Qualtrics surveys. Respondents can draw one or more geographic areas on a map; the tool stores each area as WKT (Well-Known Text) and automatically assigns a region label based on geographic overlap.

## Features

- Draw polygons on an OpenStreetMap base layer
- Geocoder search bar (powered by Esri) to navigate to any place
- Automatic region detection: drawn polygons are matched against predefined regions (in this case: Belgium, Netherlands, Aruba, Curaçao, Sint Maarten, Suriname) and labelled accordingly
- Supports multiple drawings per question (one per matrix row)
- Persists drawings when navigating back to a previously answered question
- Hidden WKT and region fields in the Qualtrics matrix are written automatically — no manual data entry required

## Detected regions

| ISO code | Label shown |
|----------|-------------|
| BE | België |
| NL | Nederland |
| BE + NL | Europa |
| AW | Aruba |
| CW | Curaçao |
| SX | Sint Maarten |
| AW + CW | ABC-eilanden |
| AW/CW/SX (any combination) | Caribisch gebied |
| SR + Caribbean island | Midden- en Zuid-Amerika |

## How it works

The tool is built as a Vite bundle and loaded into a Qualtrics survey via a hosted JavaScript file. Three functions are exposed on `window` and called from Qualtrics question JavaScript:

| Function | Purpose |
|---|---|
| `appendMapContainer(parentElement)` | Restructures the Qualtrics question DOM to make room for the map |
| `mapRender(questionId, mapTargetId, wktLabel, regioLabel)` | Initialises the Leaflet map and wires up draw events to the matrix inputs |
| `setRegionMatch(question, columnN)` | Reads drawn region values and stores them as Qualtrics embedded data (`regionMatch`) |

When a polygon is drawn, edited, or deleted the tool:
1. Converts the geometry to WKT and writes it to the hidden **WKT** column of the matrix
2. Computes overlap with each predefined region and writes a human-readable label to the hidden **Regio** column
3. Shows a numbered label (`Regio 1`, `Regio 2`, …) at the centroid of each polygon
4. Disables the draw control once all matrix rows are filled, and re-enables it when a polygon is deleted

## Tech stack

| Library | Role |
|---|---|
| [Leaflet](https://leafletjs.com/) | Map rendering |
| [leaflet-draw](https://github.com/Leaflet/Leaflet.draw) | Polygon draw/edit/delete controls |
| [leaflet-geosearch](https://github.com/smeijer/leaflet-geosearch) | Place-name search (Esri provider) |
| [Wicket](https://github.com/arthur-e/Wicket) | GeoJSON ↔ WKT conversion |
| [@turf/turf](https://turfjs.org/) | Geometric intersection and area calculations for region matching |
| [Vite](https://vitejs.dev/) | Build tooling |

## Development

### Requirements

- Node.js >= 18
- pnpm (or npm)

### Setup

```bash
git clone https://github.com/GhentCDH/Qualtrics-map-tool
cd Qualtrics-map-tool
pnpm install
pnpm run dev
```

### Build

```bash
pnpm run build
```

The build output is written to `dist/assets/` with fixed filenames (no content hash) so the hosted URL remains stable after each rebuild:

```
Qualtrics-map-tool/dist/assets/main.js
Qualtrics-map-tool/dist/assets/main.css
```

Host these files (e.g. on GitHub Pages) and reference them from your Qualtrics survey's **Look & Feel → Header** or **question JavaScript**.

## Qualtrics integration

### 1. Load the assets

In **Survey → Look & Feel → General →Header**, add:

```html
<link crossorigin="anonymous" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" /><script src="https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js"></script><link href="https://apps.flw.ugent.be/Qualtrics-map-tool/dist/assets/index.css" rel="stylesheet" /><script type="module" crossorigin src="https://apps.flw.ugent.be/Qualtrics-map-tool/dist/assets/index.js"></script>
```

### 2. Configure the matrix question

Create a **Matrix / Text entry** question with at least these two columns (exact label text matters):

- A column whose header matches the `wktLabel` argument (e.g. `wkt`) — stores the WKT geometry
- A column whose header matches the `regioLabel` argument (e.g. `regio`) — stores the region label
- (optional) A column `answer` — text field for the respondents to add information about each drawn polygon

The columns 'wkt' and 'regio' are hidden from the respondent automatically at runtime.

### 3. Add question JavaScript

In the question's **JavaScript** tab:

```javascript
Qualtrics.SurveyEngine.addOnload(function(){
	window.appendMapContainer(this.getQuestionContainer(), this.questionId, 'wkt', 'regio');
});

Qualtrics.SurveyEngine.addOnReady(function(){
	window.mapRender(this.questionId, 'map', 'wkt', 'regio');
	

	console.log(Qualtrics.SurveyEngine.getEmbeddedData("regionMatch")); 
});


Qualtrics.SurveyEngine.addOnPageSubmit(function(){
	setRegionMatch(this, <regio-column-number>)
});
```

Replace `<regio-column-number>` with the 1-based column index of the **regio** column.

## Credits

Development by [Ghent Centre for Digital Humanities - Ghent University](https://www.ghentcdh.ugent.be/). Funded by the [GhentCDH research projects](https://www.ghentcdh.ugent.be/projects).

<img src="https://www.ghentcdh.ugent.be/ghentcdh_logo_blue_text_transparent_bg_landscape.svg" alt="Landscape" width="500">
