import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
//import * as turf from "@turf/turf";

// import wkt
import * as Wkt from 'wicket';
import 'wicket/wicket-leaflet';

import "./style.css";

import regions from "./regions.js";

const appendMapContainer = (parentElement) => {
  parentElement.classList.add('mapQuestion');
  const questionBody = parentElement.querySelector('.QuestionBody');
  const newDiv = document.createElement('div');
  newDiv.id = 'map';
  //newDiv.style.height = '500px';
  newDiv.classList.add('col-12', 'col-md-9');
  questionBody.appendChild(newDiv);
  //document.getElementById('HeaderContainer').remove();
  document.getElementById('LogoContainer').remove();
  document.getElementById('Wrapper').classList.add('mapQuestionGlobalWrapper');

  const tableContainer = document.createElement('div');
  tableContainer.id = 'mapTableContainer';
  tableContainer.classList.add('col-12', 'col-md-3', 'mapTableContainer');
  tableContainer.appendChild(questionBody.getElementsByTagName('table')[0]);
  //tableContainer.getElementsByTagName('input').forEach((input) => {input.disabled = true});
  questionBody.appendChild(tableContainer);
};

const mapRender = (questionId, mapTargetId,wktTargetLabel,regioTargetLabel,) => {
  // Render Main Map
  const map = L.map(mapTargetId, {
    center: [30, -30],
    zoom: 4,
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

  const getMatrixCells = (questionId, colIndex = null, rowIndex = null) => {
    const q = document.getElementById(questionId);
    const entryRows = q.querySelectorAll("#mapTableContainer tbody > tr");
    let cells = [];

    if(rowIndex == null){
      Array.from(entryRows).forEach((row) => {
        if(colIndex == null){
          cells.push(...Array.from(row.getElementsByTagName("td")));
        } else {
          cells.push(row.getElementsByTagName("td")[colIndex]);
        }
      });
    } else {
      if(colIndex == null){
        cells.push(...Array.from(entryRows[rowIndex].getElementsByTagName("td")));
      } else {
        cells.push(entryRows[rowIndex].getElementsByTagName("td")[colIndex]);
      }
    }
    return cells;
  };

  const getMatrixValues = (questionId, colIndex = null, rowIndex = null) => {
    let cells = getMatrixCells(questionId, colIndex, rowIndex);
    let cellValues = [];
    for (let i = 0; i < cells.length; i++) {
      cellValues[i] = cells[i].getElementsByTagName('input')[0].value;
    }
    return cellValues;
  };


  const adminColumnIndices = (questionId, wktLabel, regioLabel) => {
    const q = document.getElementById(questionId);
    const ths = q.querySelectorAll('thead > tr > th[scope="col"]');
    let regioIndex = '';
    let wktIndex = '';
    let i = 0;

    // Find column indices for "Regio" and "WKT"
    Array.from(ths).forEach((item) => {
      item.style.visibility = "hidden";
      item.style.display = "none";
      item.classList.add('adminfield');
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

    [wktIndex, regioIndex].forEach((index) => {
      getMatrixCells(questionId, index).forEach(cell => {
        cell.getElementsByTagName('input')[0].type = 'hidden';
        cell.classList.add('adminfield');
        cell.style.display = "none";
      });
    });
    
    return { wktIndex, regioIndex };
  };
    
  const { wktIndex, regioIndex } = adminColumnIndices(questionId, wktTargetLabel, regioTargetLabel);
  
  // convert features to wkt
  const featuresToWkt = (feature) => {

    let wkt = new Wkt.Wkt();
    let result = '';
   if (feature && feature.geometry) {
      wkt.fromObject(feature.geometry);
      result = wkt.write();
    } 
    return result.trim();
  }

  // set wkt to target element
  const getFirstEmptyRow = (questionId, wktIndex) => {
    const potentialTargets = getMatrixValues(questionId, wktIndex);
    let i = 0;
    for (i; i < potentialTargets.length; i++) {
      if (potentialTargets[i] === '') {
        break;
      }
    }
    let vrijePlaatsen = true;
    if(i+1 == potentialTargets.length){
      vrijePlaatsen = false;
    }
    return { i, vrijePlaatsen};
  }

  const setValueToTarget = (questionId, columnIndex, rowIndex, value) => {
    getMatrixCells(questionId, columnIndex, rowIndex)[0].getElementsByTagName('input')[0].value = value;
  }

  // Draw Created Event
  map.on(L.Draw.Event.CREATED, function (e) {
    const layer = e.layer;
    editableLayers.addLayer(layer);
    const layerGeoJSON = layer.toGeoJSON();
    const wkt = featuresToWkt(layerGeoJSON);
    let toTarget = getFirstEmptyRow(questionId, wktIndex);
    compareWithRegions(layerGeoJSON);
    layer.rowIndex = toTarget.i;
    showLabel(layer);
    setValueToTarget(questionId, wktIndex, layer.rowIndex, wkt);
    setValueToTarget(questionId, regioIndex, toTarget.i, compareWithRegions(layerGeoJSON));
    //en_disableRows(toTarget.i);
    if(toTarget.vrijePlaatsen == false){
      map.removeControl(drawControlFull);
      map.addControl(drawControlEditOnly);
    }
    en_disableRows();
  });

  // Draw Edited Event
  map.on(L.Draw.Event.EDITED, function (e) {
    const editedLayers = e.layers;
    editedLayers.eachLayer(function (layer) {
      let layerGeoJSON = layer.toGeoJSON();
      const wkt = featuresToWkt(layerGeoJSON);
      compareWithRegions(layerGeoJSON);
      setValueToTarget(questionId, wktIndex, layer.rowIndex, wkt);
      setValueToTarget(questionId, regioIndex, layer.rowIndex, compareWithRegions(layerGeoJSON));
      map.removeLayer(layer.labelMarker);
      showLabel(layer);
    });
    
  });

  // Draw Deleted Event
  map.on(L.Draw.Event.DELETED, function (e) {
    const layerGeoJSON = editableLayers.toGeoJSON();
    const removedLayers = e.layers;
    removedRowIndices = [];
    removedLayers.eachLayer(function (layer) {
      removedRowIndices.push(layer.rowIndex);
      map.removeLayer(layer.labelMarker);
    });
    updateOnDelete(questionId, removedRowIndices);
    map.removeControl(drawControlEditOnly);
    map.addControl(drawControlFull);
    en_disableRows();
  });

  const updateOnDelete = (questionId, removedLayerIndices) => {
    let originalIndices = [...Array(getMatrixCells(questionId, wktIndex).length).keys()];
    let updatetIndices = originalIndices.filter((index) => !removedLayerIndices.includes(index));

    for(let i = 0; i < updatetIndices.length; i++){
      if(originalIndices[i] == updatetIndices[i]){
        continue;
      }
      let rowValues = getMatrixValues(questionId, null, updatetIndices[i]);
      rowValues.forEach((value, ci) => {
        setValueToTarget(questionId, ci, i, value);
      });
      updateLayerOnDelete(updatetIndices[i], i);
    }

    originalIndices.slice(-removedLayerIndices.length).forEach((index) => {
      let cells = getMatrixCells(questionId, null, index);
      cells.forEach(cell => {
        cell.getElementsByTagName('input')[0].value = '';
      });
    });
  }

 

  const updateLayerOnDelete = (oldRowIndex, newRowIndex) => {
    map.eachLayer(layer => {
      if (layer.rowIndex === oldRowIndex) {
        layer.rowIndex = newRowIndex;
        map.removeLayer(layer.labelMarker);
        showLabel(layer);
      }
    });
  }

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
          console.log("Your drawing is for", overlapPctdrawPolygon,'% drawn within', region.properties.Name,'.', overlapPctRegion,'% of' , region.properties.Name, 'is covered by this drawing.');
          if(overlapPctdrawPolygon > 15 || overlapPctRegion > 40){
            matchingRegions.push(region.properties.ISO3166);
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
            result = 'ABC-eilanden';
            break;
          }
        case 3:
          if(matchingRegions.includes("AW") && matchingRegions.includes("CW") && matchingRegions.includes("SX")){
            result = 'Caribisch gebied';
            break;
          }
        default:
          if(matchingRegions.includes("SR") && matchingRegions.some(c => ["AW", "CW", "SX"].includes(c)) ){
            result = 'Midden- en Zuid-Amerika';
            break;
          } else if(result == ''){
            result = 'Ongeldige selectie'
            break;
          }        
      }
      return result;
  };
  
  const showLabel = (layer) => {
    rowNr = layer.rowIndex + 1;
    const centroid = layer.getBounds().getCenter();
    const labelMarker = L.marker(centroid, {
      icon: L.divIcon({
        className: 'polygon-label-icon',
        html: "<div class='polygon-label'> Regio "+rowNr+"</div>", 
        iconSize: [100, 40], 
        iconAnchor: [35, 18] 
      })
    }).addTo(map);

    layer.labelMarker = labelMarker;
  } 

  const drawExistingFeatures = (wktValues) => {
    if(wktValues){
      for (let i = 0; i < wktValues.length; i++) {
        if(wktValues[i] !== ''){
          let wkt = new Wkt.Wkt();
          wkt = wkt.read(wktValues[i]);
          let leafletLayer = wkt.toObject();
          leafletLayer.rowIndex = i;
          editableLayers.addLayer(leafletLayer);
          showLabel(leafletLayer);
        } else {
          break;
        }
      };
    }
  };
  
  drawExistingFeatures(getMatrixValues(questionId, wktIndex));

  const en_disableRows = () => {
    let trs =  Array.from(document.querySelector('#mapTableContainer tbody').getElementsByTagName('tr'));
    for(let i = 0; i < trs.length; i++){
      if(trs[i].getElementsByTagName('input')[wktIndex].value != ''){
        Array.from(trs[i].getElementsByTagName('input')).forEach((input) => {
          input.classList.add('drawing-row');;
          });
      }
      if(i !== 0 && trs[i-1].getElementsByTagName('input')[wktIndex].value == ''){
        Array.from(trs[i].getElementsByTagName('input')).forEach((input) => {
          input.disabled = true;
          });
      } else {
        Array.from(trs[i].getElementsByTagName('input')).forEach((input) => {
          input.disabled = false;
          });
      }
    }
  }

  en_disableRows();
};


window.appendMapContainer = appendMapContainer;
window.mapRender = mapRender;