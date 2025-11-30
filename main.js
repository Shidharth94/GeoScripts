// OPENLAYERS PART
const basemap = new ol.layer.Tile({
  source: new ol.source.OSM(),
});

const json = new ol.source.Vector({
    url: './shp/India_Census_2011.geojson',
    format: new ol.format.GeoJSON(),
});

const vectorLayer = new ol.layer.Vector({
  source: json,
  style: new ol.style.Style({
    stroke: new ol.style.Stroke({ color: 'red', width: 2 }),
    fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0)' })
  })
});

const style = new ol.style.Style({
  fill: new ol.style.Fill({
    color: 'black',
  }),
});

const olMap = new ol.Map({
  layers: [basemap, vectorLayer],
  target: 'map-container',
  view: new ol.View({
    projection: 'EPSG:3857', // Use Web Mercator for compatibility with OSM
    center: ol.proj.transform([78, 23], 'EPSG:4326', 'EPSG:3857'), // Temporary placeholder
    zoom: 4.5,
  }),
});

// CENTROID LABEL GEOJSON
const centroidSource = new ol.source.Vector({
  url: './shp/India_Census_2011_label.geojson',
  format: new ol.format.GeoJSON(),
});

// STYLE FUNCTION FOR CENTROIDS (NO extra helper needed)
const centroidLabelLayer = new ol.layer.Vector({
  source: centroidSource,
  declutter: true,
  style: function (feature) {
    const stSel = stateSelect.value;
    const distSel = districtSelect.value;

    const st = feature.get('STATE') || feature.get('ST_NM') || feature.get('state_name');
    const dist = feature.get('DISTRICT') || feature.get('District') || feature.get('DISTRICT_NAME');

    // 1) No state selected → show nothing
    if (!stSel) return null;

    // 2) Filter by state / district
    if (stSel && st !== stSel) return null;
    if (distSel && dist !== distSel) return null;

    // 3) Draw label
    return new ol.style.Style({
      text: new ol.style.Text({
        font: 'bold 12px sans-serif',
        text: dist,
        fill: new ol.style.Fill({ color: 'white' }),
        stroke: new ol.style.Stroke({ color: 'black', width: 3 }),
        textAlign: 'center',
        textBaseline: 'middle',
        overflow: true
      })
    });
  }
});

olMap.addLayer(centroidLabelLayer);



// DROPDOWN REFERENCES
const stateSelect = document.getElementById('stateFilter');
const divisionSelect = document.getElementById('divisionFilter');
const districtSelect = document.getElementById('districtFilter');

// HELPER: FILTER CENTROID LABELS
function updateCentroidLabels() {
  const stSel = stateSelect.value;
  const distSel = districtSelect.value;

  // no state selected → hide all labels
  if (!stSel) {
    centroidSource.getFeatures().forEach(f => f.setStyle(new ol.style.Style({})));
    return;
  }

  centroidSource.getFeatures().forEach(f => {
    const st = f.get('STATE') || f.get('ST_NM') || f.get('state_name');
    const dist = f.get('DISTRICT') || f.get('District') || f.get('DISTRICT_NAME');

    let visible = true;
    if (stSel && st !== stSel) visible = false;
    if (distSel && dist !== distSel) visible = false;

    f.setStyle(visible ? null : new ol.style.Style({}));
  });
}

// run once when centroid source is ready
centroidSource.on('change', function (e) {
  const src = e.target;
  if (src.getState && src.getState() === 'ready') {
    updateCentroidLabels();
  }
});



const divisionsByState = {};
const districtsByStateDiv = {};
let populated = false;

// POPULATE - DISTRICTS EVEN WHEN DIVISION NULL
const populateOnce = () => {
  if (populated) return;
  populated = true;

  const features = json.getFeatures();
  if (features.length === 0) return;

  console.log(`Found ${features.length} total features`);

  const states = new Set();
  features.forEach((f, i) => {
    const props = f.getProperties();
    if (i === 0) console.log('FIRST FEATURE PROPERTIES:', props);

    const st = props.ST_NM || props.State || props.STATE || props.st_nm || props.state_name || props.NAME_1 || '';
    const div = props.division || props.Division || props.DIVISION || props.div_name || props.NAME_2 || '';
    const dist = props.DISTRICT || props.District || props.DISTRICT_NAME || props.dist_name || props.NAME_3 || '';

    if (st) {
      states.add(st);

      const divKey = div || 'No Division';
      if (!divisionsByState[st]) divisionsByState[st] = new Set();
      divisionsByState[st].add(divKey);

      let key;
      if (div) key = st + '|' + div;
      else key = st + '|No Division';

      if (dist) {
        if (!districtsByStateDiv[key]) districtsByStateDiv[key] = new Set();
        districtsByStateDiv[key].add(dist);
      }
    }
  });

  console.log(`Found ${states.size} unique states`);

  Array.from(states).sort().forEach(st => {
    const opt = document.createElement('option');
    opt.value = st;
    opt.textContent = st;
    stateSelect.appendChild(opt);
  });
};

// RUN POPULATION
setTimeout(populateOnce, 2000);
json.on('change', () => {
  if (!populated && json.getState() === 'ready') populateOnce();
});

// STYLE FUNCTION
// CHOROPLETH COLORS FOR LITERACY RANGES
const getLiteracyColor = (literacy) => {
  if (!literacy || isNaN(literacy)) return 'rgba(200, 200, 200, 0.3)';
  if (literacy < 60) return 'rgba(255, 0, 0, 0.6)';
  if (literacy < 70) return 'rgba(255, 165, 0, 0.6)';
  if (literacy < 75) return 'rgba(255, 255, 0, 0.6)';
  if (literacy < 80) return 'rgba(0, 255, 0, 0.6)';
  return 'rgba(0, 100, 255, 0.6)';
};

// LITERACY CHOROPLETH STYLE (NO TEXT HERE)
vectorLayer.setStyle(function (feature) {
  const stSel = stateSelect.value;
  const divSel = divisionSelect.value;
  const distSel = districtSelect.value;

  const p = feature.getProperties();

  const literacy = p.Literacy || p.literacy || p.LITERACY || p.Literacy_Rate ||
                   p.literacy_rate || parseFloat(p.Literacy) || null;
  const st = p.ST_NM || p.State || p.STATE || p.st_nm || p.state_name || p.NAME_1 || '';
  const div = p.division || p.Division || p.DIVISION || p.div_name || p.NAME_2 || '';
  const dist = p.DISTRICT || p.District || p.DISTRICT_NAME || p.dist_name || p.NAME_3 || '';

  if (stSel && st !== stSel) return null;
  if (divSel && div !== divSel && divSel !== 'No Division') return null;
  if (distSel && dist !== distSel) return null;

  return new ol.style.Style({
    stroke: new ol.style.Stroke({ color: 'black', width: 1 }),
    fill: new ol.style.Fill({ color: getLiteracyColor(literacy) })
  });
});

// ZOOM FUNCTION
function zoomToSelection() {
  const stSel = stateSelect.value;
  const divSel = divisionSelect.value;
  const distSel = districtSelect.value;

  const feats = json.getFeatures();
  const matches = feats.filter(f => {
    const p = f.getProperties();
    const st = p.ST_NM || p.State || p.STATE || p.st_nm || p.state_name || p.NAME_1 || '';
    const divv = p.division || p.Division || p.DIVISION || p.div_name || p.NAME_2 || '';
    const distt = p.DISTRICT || p.District || p.DISTRICT_NAME || p.dist_name || p.NAME_3 || '';

    if (distSel) return st === stSel && distt === distSel;
    if (divSel)  return st === stSel && (divv === divSel || (divSel === 'No Division' && !divv));
    if (stSel)   return st === stSel;
    return true;
  });

  if (!matches.length) return;

  let extent = ol.extent.createEmpty();
  matches.forEach(f => ol.extent.extend(extent, f.getGeometry().getExtent()));
  olMap.getView().fit(extent, { duration: 500, padding: [20, 20, 20, 20] });
}

// LABEL
const selectionInfo = document.getElementById('selectionInfo');

function updateSelectionInfo() {
  if (!selectionInfo) return;

  const stSel  = stateSelect.value || '';
  const divSel = divisionSelect.value || '';
  const distSel = districtSelect.value || '';

  if (!stSel) {
    selectionInfo.textContent = 'District-level Literacy Rate, Census 2011';
    return;
  }

  const districtText = distSel || 'All districts';
  const divisionText = divSel && divSel !== 'No Division' ? ` (${divSel})` : '';
  const stateText    = stSel;

  selectionInfo.textContent = `${districtText}${divisionText}, ${stateText}`;
}

// EVENT HANDLERS
stateSelect.addEventListener('change', function () {
  const st = this.value;
  divisionSelect.innerHTML = '<option value="">All Divisions</option>';
  districtSelect.innerHTML = '<option value="">All Districts</option>';

  if (st && divisionsByState[st]) {
    Array.from(divisionsByState[st]).sort().forEach(div => {
      divisionSelect.insertAdjacentHTML('beforeend', `<option value="${div}">${div}</option>`);
    });
  }

  vectorLayer.changed();
  zoomToSelection();
  updateSelectionInfo();
});

divisionSelect.addEventListener('change', function () {
  const st = stateSelect.value;
  const div = this.value;
  districtSelect.innerHTML = '<option value="">All Districts</option>';

  if (st && div) {
    const key = st + '|' + (div === 'No Division' ? div : div);
    if (districtsByStateDiv[key]) {
      Array.from(districtsByStateDiv[key]).sort().forEach(dist => {
        districtSelect.insertAdjacentHTML('beforeend', `<option value="${dist}">${dist}</option>`);
      });
    }
  }

  vectorLayer.changed();
  zoomToSelection();
  updateSelectionInfo();
});

districtSelect.addEventListener('change', function () {
  vectorLayer.changed();
  zoomToSelection();
  updateSelectionInfo();
});

// HOVER ATTRIBUTES
const hoverInfo = document.getElementById('hoverInfo');

olMap.on('pointermove', function (evt) {
  if (!hoverInfo) return;
  if (evt.dragging) {
    hoverInfo.style.visibility = 'hidden';
    return;
  }

  const stSel = stateSelect.value;
  if (!stSel) {
    // no state selected → no tooltip
    hoverInfo.style.visibility = 'hidden';
    return;
  }

  const pixel = evt.pixel;

  let found = false;
  olMap.forEachFeatureAtPixel(pixel, function (feature, layer) {
    if (layer !== vectorLayer) return;

    const p = feature.getProperties();
    const st   = p.ST_NM || p.State || p.STATE || p.st_nm || p.state_name || p.NAME_1 || '';
    if (st !== stSel) return;

    const div  = p.division || p.Division || p.DIVISION || p.div_name || p.NAME_2 || '';
    const dist = p.DISTRICT || p.District || p.DISTRICT_NAME || p.dist_name || p.NAME_3 || '';
    const lit  = p.Literacy || p.literacy || p.LITERACY || p.Literacy_Rate || p.literacy_rate;

    // build attribute text – add more fields if needed
    const lines = [
      `State: ${st}`,
      dist ? `District: ${dist}` : '',
      div  ? `Division: ${div}` : '',
      lit != null ? `Literacy: ${lit}%` : ''
    ].filter(Boolean);

    hoverInfo.innerHTML = lines.join('<br>');
    hoverInfo.style.left = (pixel[0] + 10) + 'px';
    hoverInfo.style.top  = (pixel[1] + 10) + 'px';
    hoverInfo.style.visibility = 'visible';

    found = true;
    return true; // stop after first feature
  });

  if (!found) {
    hoverInfo.style.visibility = 'hidden';
  }
});
