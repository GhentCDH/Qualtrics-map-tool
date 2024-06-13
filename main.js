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
    mapTargetId,
    wktTargetId,
    regionTargetId,
  ) => {
  console.log("mapRender started");
  console.log(regions);

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
  var drawControl = new L.Control.Draw({
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
  map.addControl(drawControl);

  // convert features to wkt
  const featuresToWkt = (features) => {
    let wkt = new Wkt.Wkt();
    let result = '';
    for (const feature of features) {
        wkt.fromObject(feature.geometry)
        result += wkt.write() + '\n';
    }
    return result;
  }

  // set wkt to target element
  const setWktToTarget = (targetId, wkt) => {
    const target = window.document.getElementById(targetId);
    if (target) {
      target.value = wkt;
    }
  }

  // Draw Created Event
  map.on(L.Draw.Event.CREATED, function (e) {
    editableLayers.addLayer(e.layer);

    const layerGeoJSON = editableLayers.toGeoJSON();
    const wkt = featuresToWkt(layerGeoJSON.features);
    compareWithRegions(layerGeoJSON.features);
    setWktToTarget(wktTargetId, wkt);
  });

  // Draw Edited Event
  map.on(L.Draw.Event.EDITED, function () {
    const layerGeoJSON = editableLayers.toGeoJSON()
    const wkt = featuresToWkt(layerGeoJSON.features);
    setWktToTarget(wktTargetId, wkt);
  });

  // Draw Deleted Event
  map.on(L.Draw.Event.DELETED, function () {
    const layerGeoJSON = editableLayers.toGeoJSON();
    const wkt = featuresToWkt(layerGeoJSON.features);
    setWktToTarget(wktTargetId, wkt);
  });


  // Function to compare drawn polygon with regions in regions in regions.js
  const compareWithRegions = (features) => {
    let $i = 1;
    for (const feature of features) {
      let drawPoygon = turf.polygon(feature.geometry.coordinates);
      let matchingRegions = [];
      for(const region of regions) {
        let regionMultiPolygon = turf.multiPolygon(region.geometry.coordinates);
        let intersection = turf.intersect(turf.featureCollection([drawPoygon, regionMultiPolygon]));
        if (intersection) {
          let overlapPctdrawPolygon = (turf.area(intersection) / turf.area(turf.polygon(feature.geometry.coordinates))) * 100;
          let overlapPctRegion = (turf.area(intersection) / turf.area(regionMultiPolygon)) * 100;
          console.log("Your drawing number", $i ,"is for", overlapPctdrawPolygon,'% drawn within', region.properties.Name,'.', overlapPctRegion,'% of' , region.properties.Name, 'is covered by this drawing.');
          if(overlapPctdrawPolygon > 15 || overlapPctRegion > 40){
            console.log("IT'S A MATCH!");
            matchingRegions.push(region.properties.ISO3166);
          } else {
            console.log("No match :-(");
          }
        }
      }
      let result = ''
      switch(matchingRegions.length){
        case 0:
          break;
        case 1:
          switch(matchingRegions[0]){
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
        case > 1:
          break;         
      }
      $i++;
    }
  };


};

window.mapRender = mapRender;