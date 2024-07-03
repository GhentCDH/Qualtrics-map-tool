import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";
import "leaflet-draw";
import * as turf from "@turf/turf";

// import wkt
import * as Wkt from 'wicket';
import 'wicket/wicket-leaflet';

import "./style.css";

import regions from "./regions.js";


const mapRender = (
    questionId,
    mapTargetId,
    wktTargetLabel,
    regioTargetLabel,
  ) => {

    console.log("mapRender called with:", { questionId, mapTargetId, wktTargetLabel, regioTargetLabel });
  // Render Main Map
  const map = L.map(mapTargetId, {
    center: [51.0574556330301, 3.719793747490593],
    zoom: 14,
    minZoom: 1,
    maxZoom: 18,
    attributionControl: false,
  });

  L.tileLayer("https://{s}.tile.osm.org/{z}/{x}/{y}.png", {
    minZoom: 1,
    maxZoom: 20,
    id: "osm.streets",
  }).addTo(map);

  // Init Editable Layer
  const editableLayers = new L.FeatureGroup();
  map.addLayer(editableLayers);

  // Init Drawing Controls
  var drawControlFull = new L.Control.Draw({
    position: "topleft",
    draw: {
      marker: false,
      polyline: false,
      polygon: {
        allowIntersection: false, // Restricts shapes to simple polygons
        drawError: {
          color: "#e1e100", // Color the shape will turn when intersects
          message: "<strong>Oh snap!<strong> you can't draw that!", // Message that will show when intersect
        },
      },
      circle: false, // Turns off this drawing tool
      rectangle: false,
      circlemarker: false,
    },
    edit: {
      featureGroup: editableLayers, //REQUIRED!!
      remove: true,
    },
  });

  var drawControlEditOnly = new L.Control.Draw({
    position: "topleft",
    draw: false,
    edit: {
      featureGroup: editableLayers, //REQUIRED!!
      remove: true,
    },
  });


  map.addControl(drawControlFull);






  const findColumnIndices = (questionId, wktLabel, regioLabel) => {
    const q = document.getElementById(questionId);
    const ths = q.querySelectorAll('thead > tr > th[scope="col"]');
    let regioIndex = '';
    let wktIndex = '';
    let i = 0;

    // Find column indices for "Regio" and "WKT"
    Array.from(ths).forEach((item) => {
      switch (item.textContent.toLowerCase().trim()) {
        case regioLabel:
          regioIndex = i;
          break;
        case wktLabel:
          wktIndex = i;
          break;
      }
      i++;
    });

    return { wktIndex, regioIndex };
  };
    
  const { wktIndex, regioIndex } = findColumnIndices(questionId, wktTargetLabel, regioTargetLabel);

  const getMatrixCells = (questionId, colNo = null, rowNo = null) => {
    const q = document.getElementById(questionId);
    const entryRows = q.querySelectorAll("tbody > tr");
    let cells = [];
    if(rowNo == null){
      Array.from(entryRows).forEach((item) => {
        if(colNo == null){
          cells.push(item.getElementsByTagName("td"));
        } else {
          cells.push(item.getElementsByTagName("td")[colNo]);
        }
      });
    } else {
      if(colNo == null){
        cells.push(entryRows[rowNo].getElementsByTagName("td"));
      } else {
        cells.push(entryRows[rowNo].getElementsByTagName("td")[colNo]);
      }
    }
    return cells;
  };

  // convert features to wkt
  const featuresToWkt = (feature) => {

    let wkt = new Wkt.Wkt();
    let result = '';
  
    if (feature instanceof Array) {
      feature.forEach((feat) => {
        if (feat.geometry) {
          wkt.fromObject(feat.geometry);
          result += wkt.write() + '\n';
        } 
      });
    } else if (feature && feature.geometry) {
      wkt.fromObject(feature.geometry);
      result += wkt.write() + '\n';
    } 
    return result.trim();
  }

  // set wkt to target element
  const setWktToTarget = (questionId, wktIndex, wkt) => {
    const potentialTargets = getMatrixCells(questionId, wktIndex);
    let i = 0;
    for (i; i < potentialTargets.length; i++) {
      const cell = potentialTargets[i];
      let target = cell.getElementsByTagName('input')[0];
      if (target.value === '') {
        target.value = wkt;
        break;
      }
    }
    let vrijePlaatsen = true;
    if(i+1 == potentialTargets.length){
      vrijePlaatsen = false;
    }
    return { i, vrijePlaatsen};
  }

  const setRegioToTarget = (questionId, regioIndex, rowNumber, regionValue) => {
    getMatrixCells(questionId, regioIndex, rowNumber)[0].getElementsByTagName('input')[0].value = regionValue;
  }

  // Draw Created Event
  map.on(L.Draw.Event.CREATED, function (e) {
    const layer = e.layer;
    editableLayers.addLayer(layer);
    const layerGeoJSON = layer.toGeoJSON();
    const wkt = featuresToWkt(layerGeoJSON);
    let toTarget = setWktToTarget(questionId, wktIndex, wkt)
    compareWithRegions(layerGeoJSON);
    setRegioToTarget(questionId, regioIndex, toTarget.i, compareWithRegions(layerGeoJSON));
    if(toTarget.vrijePlaatsen == false){
      map.removeControl(drawControlFull);
      map.addControl(drawControlEditOnly);
    }
  });

  // Draw Edited Event
  map.on(L.Draw.Event.EDITED, function () {
    const layerGeoJSON = editableLayers.toGeoJSON();
    //const wkt = featuresToWkt(layerGeoJSON.features);
    compareWithRegions(layerGeoJSON.features);
    setWktToTarget(questionId, wktIndex, wkt);
  });

  // Draw Deleted Event
  map.on(L.Draw.Event.DELETED, function () {
    const layerGeoJSON = editableLayers.toGeoJSON();
    //const wkt = featuresToWkt(layerGeoJSON.features);
    map.removeControl(drawControlEditOnly);
    map.addControl(drawControlFull);
    compareWithRegions(layerGeoJSON.features);
    setWktToTarget(questionId, wktIndex, wkt);
  });


  // Function to compare drawn polygon with regions in regions in regions.js
  const compareWithRegions = (feature) => {
    
    
   
      let drawPoygon = turf.polygon(feature.geometry.coordinates);
      let matchingRegions = [];
      for(const region of regions) {
        let regionMultiPolygon = turf.multiPolygon(region.geometry.coordinates);
        let intersection = turf.intersect(turf.featureCollection([drawPoygon, regionMultiPolygon]));
        if (intersection) {
          let overlapPctdrawPolygon = (turf.area(intersection) / turf.area(turf.polygon(feature.geometry.coordinates))) * 100;
          let overlapPctRegion = (turf.area(intersection) / turf.area(regionMultiPolygon)) * 100;
          console.log("Your drawing number", 'AAN TE VULLEN' ,"is for", overlapPctdrawPolygon,'% drawn within', region.properties.Name,'.', overlapPctRegion,'% of' , region.properties.Name, 'is covered by this drawing.');
          if(overlapPctdrawPolygon > 15 || overlapPctRegion > 40){
            console.log("IT'S A MATCH!");
            matchingRegions.push(region.properties.ISO3166);
            console.log(matchingRegions);
          } 
        }
      }
      let result = ''
      switch(matchingRegions.length){
        case 0:
          result = 'Geen regio gevonden'
          break;
        case 1:
          switch(String(matchingRegions[0].trim())){
            case "BE":
              result = 'België'
              break;
            case "NL":
              result = 'Nederland';
              break;
            case "CW":
              result = 'Curaçao';
              break;
            case "SX":
              result = 'Sint Maarten';
              break;
            case "SR":
              result = 'Suriname';
              break;
            case "AW":
              result = 'Aruba';
              break;
          }   
        case 2:
          if(matchingRegions.includes("BE") && matchingRegions.includes("NL")){
            result = 'Europa';
            break;
          } else if(matchingRegions.includes("AW") && matchingRegions.includes("CW")){
            result = 'Caribisch gebied';
            break;
          }
        case 3:
          if(matchingRegions.includes("AW") && matchingRegions.includes("CW") && matchingRegions.includes("SX")){
            result = 'ABC-eilanden';
            break;
          }
        default:
          if(matchingRegions.includes("SR") && matchingRegions.every(c => ["AW", "CW", "SX", "SR"].includes(c)) ){
            result = 'Midden- en Zuid-Amerika';
            break;
          } else if(result == ''){
            result = 'Ongeldige selectie'
            break;
          }        
      }
    
      console.log(result);
      return result;
       
  };
  

 /* 
  const addPreviousDrawings = (wktCells) => {
    const wktLayerGroup = new L.FeatureGroup();
    wktCells.forEach(function callback(cell, index) {
      wktString = cell.getElementsByTagName('input')[0].value;
      if (wktString != '') {
        const wktObject = new Wkt.Wkt();
        wktObject.read(wktString);
        const geojsonLayer = L.geoJSON(wktObject.toJson(),{
          style: {
            "color": getRandomColor(),
            "opacity":1,
          }
        }).addTo(map);

        var labelMarker = L.marker(geojsonLayer.getBounds().getCenter(), {
          icon: L.divIcon({
              className: 'polygon-label',
              html: index,
          }),
        }).addTo(map);
        
        wktLayerGroup.addLayer(geojsonLayer);
      }   
    })
    wktLayerGroup.addTo(map);
  };
    
    


  const getRandomColor = () => {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  };

  addPreviousDrawings(getMatrixCells(questionId, wktIndex));
*/

  getMatrixCells(questionId, wktIndex).forEach(cell => {
    cell.getElementsByTagName('input')[0].disabled = true;
  });

  getMatrixCells(questionId, regioIndex).forEach(cell => {
    cell.getElementsByTagName('input')[0].disabled = true;
  });


};

window.mapRender = mapRender;
