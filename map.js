// Initialisation de la carte Leaflet — Côte d'Ivoire
const map = L.map('map', {
  center: [7.54, -5.55],
  zoom: 7,
  zoomControl: false
});

// ——— Authentification (contribuer réservé aux utilisateurs inscrits et confirmés) ———
var API_BASE = '';
var AUTH_STORAGE_KEY = 'cartoplatforme_auth';

function getToken() {
  try {
    var data = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}');
    return data.token || null;
  } catch (e) { return null; }
}

function getCurrentUser() {
  try {
    var data = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}');
    return data.user || null;
  } catch (e) { return null; }
}

function setSession(token, user) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: token, user: user }));
}

function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function isLoggedIn() {
  return !!getToken();
}

function updateAuthHeader() {
  var authButtons = document.getElementById('auth-buttons');
  var authUser = document.getElementById('auth-user');
  var authUserName = document.getElementById('auth-user-name');
  if (!authButtons || !authUser) return;
  if (isLoggedIn() && getCurrentUser()) {
    authButtons.hidden = true;
    authUser.hidden = false;
    if (authUserName) authUserName.textContent = 'Bonjour, ' + (getCurrentUser().nom_utilisateur || getCurrentUser().mail || '');
  } else {
    authButtons.hidden = false;
    authUser.hidden = true;
  }
}

function initAuth(callback) {
  var token = getToken();
  if (!token) {
    updateAuthHeader();
    if (callback) callback();
    return;
  }
  fetch(API_BASE + '/api/me', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.ok && data.user) {
        setSession(token, data.user);
      } else {
        clearSession();
      }
      updateAuthHeader();
      if (callback) callback();
    })
    .catch(function () {
      clearSession();
      updateAuthHeader();
      if (callback) callback();
    });
}

// Fonds de carte
const fondsCartes = {
  'Sombre (CARTO)': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  }),
  'Clair (CARTO Voyager)': L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  }),
  'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }),
  'Topographie (OpenTopoMap)': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OSM, SRTM &copy; OpenTopoMap',
    maxZoom: 17
  }),
  'Satellite (ESRI)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; Esri',
    maxZoom: 19
  }),
  'Terrain (ESRI)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; Esri',
    maxZoom: 13
  }),
  'Google Satellite': L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    attribution: '&copy; Google',
    subdomains: '0123',
    maxZoom: 20
  }),
  'Google Satellite Hybride': L.tileLayer('https://mt{s}.google.com/vt/lyrs=h&x={x}&y={y}&z={z}', {
    attribution: '&copy; Google',
    subdomains: '0123',
    maxZoom: 20
  })
};

// Fond par défaut : Google Satellite. Couches par défaut : Mairies (data01) + Limite Districts.
let fondActif = fondsCartes['Google Satellite'];
fondActif.addTo(map);

// Boîte choix du fond (angle gauche)
const selectFond = document.getElementById('select-fond');
selectFond.addEventListener('change', function () {
  const nom = this.value;
  if (fondsCartes[nom]) {
    map.removeLayer(fondActif);
    fondActif = fondsCartes[nom];
    fondActif.addTo(map);
  }
});

// Contrôles de zoom en bas à droite
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Couche des limites des communes (commune.js) — affichage oui/non
let communesLayer = null;
if (typeof commune !== 'undefined' && commune.features && commune.features.length) {
  communesLayer = L.geoJSON(commune, {
    style: {
      color: '#00d4aa',
      weight: 1.5,
      opacity: 0.8,
      fillColor: '#00d4aa',
      fillOpacity: 0.08
    },
    onEachFeature: function (feature, layer) {
      var props = feature.properties || {};
      layer.bindPopup('<strong>' + (props.commune || props.localite || '') + '</strong><br>' + (props.REGION || '') + (props.population != null ? '<br>Population : ' + Math.round(props.population) : ''));
    }
  });
  communesLayer.addTo(map);
  var toggleCommunes = document.getElementById('toggle-communes');
  if (toggleCommunes) {
    toggleCommunes.checked = true;
    toggleCommunes.addEventListener('change', function () {
      if (this.checked) {
        communesLayer.addTo(map);
      } else {
        map.removeLayer(communesLayer);
      }
    });
  }
}

// Couche sp03 (sous-préfectures) — FeatureCollection
let sp03Layer = null;
if (typeof sp03 !== 'undefined' && sp03.features && sp03.features.length) {
  sp03Layer = L.geoJSON(sp03, {
    style: {
      color: '#f0ad4e',
      weight: 1.2,
      opacity: 0.9,
      fillColor: '#f0ad4e',
      fillOpacity: 0.06
    },
    onEachFeature: function (feature, layer) {
      var props = feature.properties || {};
      var pop = '<strong>' + (props['SOUS-PREFE'] || '') + '</strong>';
      if (props['PREFECTURE']) pop += '<br>Préfecture : ' + props['PREFECTURE'];
      if (props['REGION']) pop += '<br>Région : ' + props['REGION'];
      if (props['DISTRICT']) pop += '<br>District : ' + props['DISTRICT'];
      layer.bindPopup(pop);
    }
  });
  var toggleSp03 = document.getElementById('toggle-sp03');
  if (toggleSp03) {
    toggleSp03.checked = false;
    toggleSp03.addEventListener('change', function () {
      if (this.checked) {
        sp03Layer.addTo(map);
      } else {
        map.removeLayer(sp03Layer);
      }
    });
  }
}

// Couche départements / préfectures (limite administrative)
let departementLayer = null;
if (typeof departement !== 'undefined' && departement.features && departement.features.length) {
  departementLayer = L.geoJSON(departement, {
    style: {
      color: '#5bc0de',
      weight: 1.5,
      opacity: 0.85,
      fillColor: '#5bc0de',
      fillOpacity: 0.05
    },
    onEachFeature: function (feature, layer) {
      var props = feature.properties || {};
      var pop = '<strong>' + (props['PREFECTURE'] || '') + '</strong>';
      if (props['REGION']) pop += '<br>Région : ' + props['REGION'];
      if (props['DISTRICT']) pop += '<br>District : ' + props['DISTRICT'];
      layer.bindPopup(pop);
    }
  });
  var toggleDepartement = document.getElementById('toggle-departement');
  if (toggleDepartement) {
    toggleDepartement.checked = false;
    toggleDepartement.addEventListener('change', function () {
      if (this.checked) departementLayer.addTo(map);
      else map.removeLayer(departementLayer);
    });
  }
}

// Couche régions (limite administrative)
let regionLayer = null;
if (typeof region !== 'undefined' && region.features && region.features.length) {
  regionLayer = L.geoJSON(region, {
    style: {
      color: '#d9534f',
      weight: 2,
      opacity: 0.9,
      fillColor: '#d9534f',
      fillOpacity: 0.06
    },
    onEachFeature: function (feature, layer) {
      var props = feature.properties || {};
      var pop = '<strong>' + (props['REGION'] || '') + '</strong>';
      if (props['DISTRICT']) pop += '<br>District : ' + props['DISTRICT'];
      layer.bindPopup(pop);
    }
  });
  var toggleRegion = document.getElementById('toggle-region');
  if (toggleRegion) {
    toggleRegion.checked = false;
    toggleRegion.addEventListener('change', function () {
      if (this.checked) regionLayer.addTo(map);
      else map.removeLayer(regionLayer);
    });
  }
}

// Couche districts (limite administrative)
let districtLayer = null;
if (typeof district !== 'undefined' && district.features && district.features.length) {
  districtLayer = L.geoJSON(district, {
    style: {
      color: '#5cb85c',
      weight: 2.2,
      opacity: 0.9,
      fillColor: '#5cb85c',
      fillOpacity: 0.05
    },
    onEachFeature: function (feature, layer) {
      var props = feature.properties || {};
      var pop = '<strong>' + (props['DISTRICT'] || '') + '</strong>';
      if (props['PAYS']) pop += '<br>Pays : ' + props['PAYS'];
      layer.bindPopup(pop);
    }
  });
  districtLayer.addTo(map);
  var toggleDistrict = document.getElementById('toggle-district');
  if (toggleDistrict) {
    toggleDistrict.checked = true;
    toggleDistrict.addEventListener('change', function () {
      if (this.checked) districtLayer.addTo(map);
      else map.removeLayer(districtLayer);
    });
  }
}

// Couche localités — localite01 (chargée par script)
let localite01Layer = null;
if (typeof localite01 !== 'undefined' && localite01.features && localite01.features.length) {
  localite01Layer = L.geoJSON(localite01, {
    style: {
      color: '#9b59b6',
      weight: 1.2,
      opacity: 0.85,
      fillColor: '#9b59b6',
      fillOpacity: 0.06
    },
    onEachFeature: function (feature, layer) {
      var props = feature.properties || {};
      var pop = '<strong>' + (props['LOCALITE'] || 'Localité #' + (props['id'] || '')) + '</strong>';
      if (props['SP']) pop += '<br>Sous-préfecture : ' + props['SP'];
      if (props['PREFECTURE']) pop += '<br>Préfecture : ' + props['PREFECTURE'];
      if (props['REGION']) pop += '<br>Région : ' + props['REGION'];
      if (props['DISTRICT']) pop += '<br>District : ' + props['DISTRICT'];
      layer.bindPopup(pop);
    }
  });
  var toggleLocalite01 = document.getElementById('toggle-localite01');
  if (toggleLocalite01) {
    toggleLocalite01.checked = false;
    toggleLocalite01.addEventListener('change', function () {
      if (this.checked) localite01Layer.addTo(map);
      else map.removeLayer(localite01Layer);
    });
  }
}

// ——— Contributions localités (polygones) — stockage persistant
const DATA02_LOCALITE_STORAGE_KEY = 'cartoplatforme_data02_localite';
let data02_localite = { type: 'FeatureCollection', name: 'localites-contributions', crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } }, features: [] };
try {
  var savedLoc = localStorage.getItem(DATA02_LOCALITE_STORAGE_KEY) || sessionStorage.getItem(DATA02_LOCALITE_STORAGE_KEY);
  if (savedLoc) {
    var parsedLoc = JSON.parse(savedLoc);
    if (parsedLoc && Array.isArray(parsedLoc.features)) data02_localite = parsedLoc;
  }
} catch (e) {}
if (!data02_localite.features) data02_localite.features = [];

function saveData02Localite() {
  var json = JSON.stringify(data02_localite);
  try { localStorage.setItem(DATA02_LOCALITE_STORAGE_KEY, json); } catch (e) { console.warn('localStorage:', e); }
  try { sessionStorage.setItem(DATA02_LOCALITE_STORAGE_KEY, json); } catch (e2) {}
  if (window.location.protocol !== 'file:') {
    fetch(API_BASE + '/api/data02-localite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json
    }).catch(function () {});
  }
}

let contributionsLocaliteLayer = null;
var editingLocaliteId = null;
var modeTranslatePolygon = false;
var translatePolygonLayer = null;
var translatePolygonFeature = null;
var translateStartLatLng = null;

function refreshContributionsLocaliteLayer() {
  if (contributionsLocaliteLayer) map.removeLayer(contributionsLocaliteLayer);
  if (!data02_localite.features || !data02_localite.features.length) return;
  contributionsLocaliteLayer = L.geoJSON(data02_localite, {
    style: {
      color: '#9b59b6',
      weight: 2,
      opacity: 0.95,
      fillColor: '#e8daef',
      fillOpacity: 0.2
    },
    onEachFeature: function (feature, layer) {
      var props = feature.properties || {};
      var fid = props['id'] || '';
      var pop = '<strong>' + (props['LOCALITE'] || 'Localité (contribution)') + '</strong>';
      if (props['SP']) pop += '<br>SP : ' + props['SP'];
      if (props['PREFECTURE']) pop += '<br>Préfecture : ' + props['PREFECTURE'];
      if (props['REGION']) pop += '<br>Région : ' + props['REGION'];
      if (props['DISTRICT']) pop += '<br>District : ' + props['DISTRICT'];
      pop += '<br><button type="button" class="btn-edit-contrib" data-id="' + fid + '">Modifier</button>';
      pop += ' <button type="button" class="btn-move-contrib" data-id="' + fid + '">Déplacer le polygone</button>';
      layer.bindPopup(pop);
      layer._contribLocaliteFeature = feature;
      layer.on('popupopen', function () {
        var container = layer.getPopup() && layer.getPopup()._contentNode;
        if (!container) return;
        var btnEdit = container.querySelector('.btn-edit-contrib');
        var btnMove = container.querySelector('.btn-move-contrib');
        if (btnEdit) btnEdit.onclick = function () {
          layer.closePopup();
          ouvrirFormulaireLocalitePourEdit(feature);
        };
        if (btnMove) btnMove.onclick = function () {
          layer.closePopup();
          demarrerDeplacementPolygone(layer, feature);
        };
      });
    }
  }).addTo(map);
}

function ouvrirFormulaireLocalitePourEdit(feature) {
  var p = feature.properties || {};
  document.getElementById('contrib-loc-nom').value = p['LOCALITE'] || '';
  document.getElementById('contrib-loc-sp').value = p['SP'] || '';
  document.getElementById('contrib-loc-prefecture').value = p['PREFECTURE'] || '';
  document.getElementById('contrib-loc-region').value = p['REGION'] || '';
  document.getElementById('contrib-loc-district').value = p['DISTRICT'] || '';
  document.getElementById('contrib-loc-remarque').value = p['remarque'] || '';
  editingLocaliteId = p['id'] || null;
  pendingLocaliteCoords = null;
  modalContribLocalite.hidden = false;
}

function demarrerDeplacementPolygone(layer, feature) {
  if (modeTranslatePolygon) return;
  modeTranslatePolygon = true;
  translatePolygonLayer = layer;
  translatePolygonFeature = feature;
  polygonToolbar.hidden = false;
  polygonToolbar.querySelector('.polygon-toolbar-hint').textContent = 'Glissez le polygone puis cliquez sur "Terminer le déplacement".';
  polygonToolbar.querySelector('#btn-terminer-polygone').textContent = 'Terminer le déplacement';
  btnTerminerPolygone.onclick = terminerDeplacementPolygone;
  btnAnnulerPolygone.onclick = annulerDeplacementPolygone;
  var startLatLng;
  function onDown(e) {
    L.DomEvent.stop(e);
    startLatLng = e.latlng;
    map.on('mousemove', onMove);
    map.once('mouseup', onUp);
  }
  function onMove(e) {
    L.DomEvent.stop(e);
    if (!startLatLng) return;
    var dLat = e.latlng.lat - startLatLng.lat;
    var dLng = e.latlng.lng - startLatLng.lng;
    var latlngs = layer.getLatLngs();
    if (latlngs[0] && latlngs[0].length) {
      var ring = latlngs[0].map(function (ll) { return L.latLng(ll.lat + dLat, ll.lng + dLng); });
      layer.setLatLngs([ring]);
    }
    startLatLng = e.latlng;
  }
  function onUp(e) {
    L.DomEvent.stop(e);
    map.off('mousemove', onMove);
    map.off('mouseup', onUp);
  }
  map.on('mouseup', onUp);
  layer.on('mousedown', onDown);
  translatePolygonLayer._translateOnDown = onDown;
}

function terminerDeplacementPolygone() {
  if (!translatePolygonLayer || !translatePolygonFeature) return;
  var latlngs = translatePolygonLayer.getLatLngs();
  if (latlngs[0] && latlngs[0].length) {
    var ring = latlngs[0].map(function (ll) { return [ll.lng, ll.lat]; });
    ring.push(ring[0]);
    translatePolygonFeature.geometry.coordinates = [ring];
    saveData02Localite();
    refreshContributionsLocaliteLayer();
  }
  annulerDeplacementPolygone();
}

function annulerDeplacementPolygone() {
  if (translatePolygonLayer && translatePolygonLayer._translateOnDown) {
    translatePolygonLayer.off('mousedown', translatePolygonLayer._translateOnDown);
  }
  modeTranslatePolygon = false;
  translatePolygonLayer = null;
  translatePolygonFeature = null;
  polygonToolbar.hidden = true;
  polygonToolbar.querySelector('.polygon-toolbar-hint').textContent = 'Cliquez sur la carte pour ajouter les sommets du polygone.';
  polygonToolbar.querySelector('#btn-terminer-polygone').textContent = 'Terminer le polygone';
  btnTerminerPolygone.onclick = terminerPolygoneEtOuvrirFormulaire;
  btnAnnulerPolygone.onclick = annulerDessinPolygone;
  refreshContributionsLocaliteLayer();
}

refreshContributionsLocaliteLayer();

// Icône personnalisée pour les mairies
const mairieIcon = L.divIcon({
  className: 'marker-mairie',
  html: '<span class="marker-mairie-dot"></span>',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

// Couche des mairies (data01) + référence des layers par id pour la recherche
let mairiesLayer = null;
const mairieLayersById = {};

function extraireLocaliteDuNom(nom) {
  if (!nom) return '';
  var m = nom.match(/(?:MAIRIE|HOTEL\s+DE\s+VILLE|HOTEL\s+COMMUNAL)\s+(?:DE\s+|D[''])?(.+)$/i);
  return m ? m[1].trim() : '';
}

/** Retourne une URL de logo pour la mairie : propriété logo/logo_url, ou logos/{id}.png, ou logos/{localite}.png, sinon logo01.png */
function getLogoUrlForMairie(props, communeNom) {
  if (!props) return 'logo01.png';
  var url = props.logo || props.logo_url;
  if (url) return url;
  var id = props.id;
  if (id != null && id !== '') return 'logos/' + id + '.png';
  var loc = communeNom || extraireLocaliteDuNom(props.name);
  if (loc) {
    var slug = (loc + '').replace(/\s+/g, '-').replace(/['']/g, '');
    if (slug) return 'logos/' + slug + '.png';
  }
  return 'logo01.png';
}

function afficherInfosCommune(feature) {
  var placeholder = document.getElementById('commune-info-placeholder');
  var content = document.getElementById('commune-info-content');
  if (!content || !placeholder) return;
  var props = feature.properties || {};
  var name = props.name || 'Mairie';
  var localite = props.localite || extraireLocaliteDuNom(name);
  var communeNom = localite || name;

  document.getElementById('commune-info-name').textContent = communeNom;

  var logoEl = document.getElementById('commune-info-logo');
  var logoPlaceholder = document.getElementById('commune-info-logo-placeholder');
  var logoUrl = getLogoUrlForMairie(props, communeNom);
  if (logoUrl === 'logo01.png') {
    logoUrl = 'logo01.png?t=' + Date.now();
  }
  logoEl.src = logoUrl;
  logoEl.hidden = false;
  if (logoPlaceholder) logoPlaceholder.hidden = true;
  logoEl.onerror = function () {
    if (logoEl.src.indexOf('logo01.png') !== -1) {
      logoEl.hidden = true;
      if (logoPlaceholder) { logoPlaceholder.hidden = false; logoPlaceholder.textContent = 'Logo'; }
      return;
    }
    logoEl.src = 'logo01.png?t=' + Date.now();
    logoEl.onerror = function () {
      logoEl.hidden = true;
      if (logoPlaceholder) { logoPlaceholder.hidden = false; logoPlaceholder.textContent = 'Logo'; }
    };
  };
  var videoEl = document.querySelector('.ma-mairie-logo-video');
  if (videoEl) videoEl.play().catch(function () {});

  function setVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val || '';
  }
  setVal('commune-info-commune', communeNom);
  setVal('commune-info-maire', props.maire);
  setVal('commune-info-population', props.population);
  setVal('commune-info-quartier', props.quartier);
  setVal('commune-info-superficie', props.superficie);
  setVal('commune-info-langues', props.langues || props.langues_parlees);

  placeholder.hidden = true;
  content.hidden = false;
}

if (typeof data01 !== 'undefined' && data01.features && data01.features.length) {
  mairiesLayer = L.geoJSON(data01, {
    pointToLayer: function (feature, latlng) {
      return L.marker(latlng, { icon: mairieIcon });
    },
    onEachFeature: function (feature, layer) {
      const name = feature.properties && feature.properties.name ? feature.properties.name : 'Mairie';
      const id = feature.properties && feature.properties.id;
      layer.bindPopup('<strong>' + name + '</strong>');
      if (id != null) mairieLayersById[id] = layer;
      layer.on('click', function () {
        map.setView(layer.getLatLng(), 15);
        afficherInfosCommune(feature);
      });
    }
  });
  var toggleData01 = document.getElementById('toggle-data01');
  if (toggleData01) {
    toggleData01.checked = true;
    if (toggleData01.checked) {
      mairiesLayer.addTo(map);
      map.fitBounds(mairiesLayer.getBounds(), { padding: [40, 40], maxZoom: 8 });
    }
    toggleData01.addEventListener('change', function () {
      if (this.checked) mairiesLayer.addTo(map);
      else map.removeLayer(mairiesLayer);
    });
  } else {
    mairiesLayer.addTo(map);
    map.fitBounds(mairiesLayer.getBounds(), { padding: [40, 40], maxZoom: 8 });
  }
}

// data02 : contributions utilisateur — localStorage = source de vérité pour que les données restent après actualisation
const DATA02_STORAGE_KEY = 'cartoplatforme_data02';
if (typeof data02 === 'undefined') {
  data02 = { type: 'FeatureCollection', name: 'mairies-contributions', crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } }, features: [] };
}
try {
  var saved = localStorage.getItem(DATA02_STORAGE_KEY) || sessionStorage.getItem(DATA02_STORAGE_KEY);
  if (saved) {
    var parsed = JSON.parse(saved);
    if (parsed && Array.isArray(parsed.features)) {
      data02 = parsed;
    }
  }
} catch (e) {}
if (!data02.features) data02.features = [];

function saveData02() {
  var json = JSON.stringify(data02);
  try {
    localStorage.setItem(DATA02_STORAGE_KEY, json);
  } catch (e) {
    console.warn('localStorage indisponible:', e);
  }
  try {
    sessionStorage.setItem(DATA02_STORAGE_KEY, json);
  } catch (e2) {}
  if (window.location.protocol !== 'file:') {
    fetch(API_BASE + '/api/data02', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json
    }).catch(function () {});
  }
}

// Icône pour les contributions (data02)
const contributionIcon = L.divIcon({
  className: 'marker-mairie marker-contribution',
  html: '<span class="marker-contribution-dot"></span>',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

let contributionsLayer = null;

var editingContribId = null; // id de la mairie en cours d'édition

function refreshContributionsLayer() {
  if (contributionsLayer) {
    map.removeLayer(contributionsLayer);
    contributionsLayer = null;
  }
  if (!data02.features || !data02.features.length) return;
  contributionsLayer = L.geoJSON(data02, {
    pointToLayer: function (feature, latlng) {
      var m = L.marker(latlng, { icon: contributionIcon, draggable: true });
      m._contribFeature = feature;
      return m;
    },
    onEachFeature: function (feature, layer) {
      var name = (feature.properties && feature.properties.name) || 'Mairie (contribution)';
      var loc = (feature.properties && feature.properties.localite) ? ' — ' + feature.properties.localite : '';
      var rem = (feature.properties && feature.properties.remarque) ? '<br><small>' + feature.properties.remarque + '</small>' : '';
      var fid = (feature.properties && feature.properties.id) || '';
      var popContent = '<strong>' + name + '</strong>' + loc + rem +
        '<br><small>Glissez le point pour déplacer.</small>' +
        '<br><button type="button" class="btn-edit-contrib" data-id="' + fid + '">Modifier</button>';
      layer.bindPopup(popContent);
      layer.on('click', function () {
        map.setView(layer.getLatLng(), 15);
        afficherInfosCommune(feature);
      });
      layer.on('dragend', function () {
        var ll = layer.getLatLng();
        feature.geometry.coordinates = [ll.lng, ll.lat];
        saveData02();
      });
      layer.on('popupopen', function () {
        var container = layer.getPopup()._contentNode;
        if (!container) return;
        var btn = container.querySelector('.btn-edit-contrib');
        if (btn) btn.onclick = function () {
          layer.closePopup();
          var id = btn.getAttribute('data-id');
          var fe = data02.features && data02.features.find(function (f) { return (f.properties && f.properties.id) === id; });
          if (fe) ouvrirFormulaireContributionPourEdit(fe);
        };
      });
    }
  });
  var toggleData02 = document.getElementById('toggle-data02');
  if (toggleData02 && toggleData02.checked) contributionsLayer.addTo(map);
}

var toggleData02Default = document.getElementById('toggle-data02');
if (toggleData02Default) toggleData02Default.checked = false;
refreshContributionsLayer();

  var toggleData02 = document.getElementById('toggle-data02');
if (toggleData02) {
  toggleData02.checked = false;
  toggleData02.addEventListener('change', function () {
    if (!contributionsLayer) return;
    if (this.checked) contributionsLayer.addTo(map);
    else map.removeLayer(contributionsLayer);
  });
}

// Charger data02 et data02_localite depuis le serveur quand on passe par le terminal (localhost)
if (window.location.protocol !== 'file:') {
  fetch(API_BASE + '/api/data02')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (d && Array.isArray(d.features)) {
        data02 = d;
        if (!data02.features) data02.features = [];
        try { localStorage.setItem(DATA02_STORAGE_KEY, JSON.stringify(data02)); } catch (e) {}
        refreshContributionsLayer();
      }
    })
    .catch(function () {});
  fetch(API_BASE + '/api/data02-localite')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (d && Array.isArray(d.features)) {
        data02_localite = d;
        if (!data02_localite.features) data02_localite.features = [];
        try { localStorage.setItem(DATA02_LOCALITE_STORAGE_KEY, JSON.stringify(data02_localite)); } catch (e) {}
        refreshContributionsLocaliteLayer();
      }
    })
    .catch(function () {});
}

// Normalisation pour la recherche (sans accents, minuscules)
function normaliser(s) {
  if (!s) return '';
  return (s + '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[\s\-']/g, '');
}

// Recherche dans data01 (mairies) + par localité (liste)
const searchInput = document.getElementById('search');
const btnSearch = document.getElementById('btn-search');

let searchMarker = null;

function zoomSurMairie(feature) {
  const coords = feature.geometry && feature.geometry.coordinates;
  if (!coords || coords.length < 2) return;
  const lon = coords[0];
  const lat = coords[1];
  map.setView([lat, lon], 15);
  const id = feature.properties && feature.properties.id;
  const layer = id != null ? mairieLayersById[id] : null;
  if (layer) {
    layer.openPopup();
  } else {
    if (searchMarker) map.removeLayer(searchMarker);
    const name = feature.properties && feature.properties.name ? feature.properties.name : 'Mairie';
    searchMarker = L.marker([lat, lon], { icon: mairieIcon }).addTo(map).bindPopup('<strong>' + name + '</strong>').openPopup();
  }
}

// Zoom sur une localité (polygone) — Limite Localités
function zoomSurLocalite(feature) {
  if (!feature || !feature.geometry) return;
  try {
    var tempLayer = L.geoJSON(feature);
    var bounds = tempLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      var props = feature.properties || {};
      var nom = props.LOCALITE || props.SP || 'Localité';
      var pop = '<strong>' + nom + '</strong>';
      if (props.PREFECTURE) pop += '<br>Préfecture : ' + props.PREFECTURE;
      if (props.REGION) pop += '<br>Région : ' + props.REGION;
      if (props.DISTRICT) pop += '<br>District : ' + props.DISTRICT;
      if (searchMarker) map.removeLayer(searchMarker);
      searchMarker = L.marker(bounds.getCenter(), { icon: mairieIcon }).addTo(map).bindPopup(pop).openPopup();
    }
  } catch (e) { console.warn('zoomSurLocalite', e); }
}

function searchMairie() {
  const query = searchInput.value.trim();
  if (!query) return;

  const nq = normaliser(query);
  let matchesMairies = [];
  let matchesLocalites = [];

  // 1) Recherche par nom de mairie dans data01
  if (data01 && data01.features && data01.features.length) {
    matchesMairies = data01.features.filter(function (f) {
      const name = (f.properties && f.properties.name) || '';
      return normaliser(name).indexOf(nq) !== -1;
    });
  }

  // 2) Si aucun résultat mairie : recherche par localité (liste) → mairies
  if (matchesMairies.length === 0 && typeof listeLocalites !== 'undefined' && listeLocalites.length && data01 && data01.features) {
    for (var i = 0; i < listeLocalites.length; i++) {
      var loc = listeLocalites[i];
      var nloc = normaliser(loc);
      if (nloc.indexOf(nq) !== -1 || nq.indexOf(nloc) !== -1) {
        matchesMairies = data01.features.filter(function (f) {
          var name = (f.properties && f.properties.name) || '';
          return normaliser(name).indexOf(nloc) !== -1;
        });
        if (matchesMairies.length > 0) break;
      }
    }
  }

  // 3) Recherche dans la couche Limite Localités (localite01)
  if (typeof localite01 !== 'undefined' && localite01.features && localite01.features.length) {
    matchesLocalites = localite01.features.filter(function (f) {
      var p = f.properties || {};
      var localite = (p.LOCALITE || '') + ' ' + (p.SP || '') + ' ' + (p.PREFECTURE || '') + ' ' + (p.REGION || '') + ' ' + (p.DISTRICT || '');
      return normaliser(localite).indexOf(nq) !== -1;
    });
  }

  // Priorité : d'abord une mairie, sinon une localité
  if (matchesMairies.length > 0) {
    zoomSurMairie(matchesMairies[0]);
    afficherInfosCommune(matchesMairies[0]);
    if (matchesMairies.length > 1) console.log(matchesMairies.length + ' mairie(s) trouvée(s). Affichage du premier.');
    return;
  }
  if (matchesLocalites.length > 0) {
    zoomSurLocalite(matchesLocalites[0]);
    if (matchesLocalites.length > 1) console.log(matchesLocalites.length + ' localité(s) trouvée(s). Affichage de la première.');
    return;
  }

  alert('Aucune mairie ou localité trouvée pour « ' + query + ' ».');
}

btnSearch.addEventListener('click', searchMairie);
searchInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') searchMairie();
});

// ——— Contribution (data02) : mode clic + formulaire ———
var modeContribuer = false;
var contributionClickHandler = null;

var modalContribution = document.getElementById('modal-contribution');
var formContribution = document.getElementById('form-contribution');
var contribNom = document.getElementById('contrib-nom');
var contribLocalite = document.getElementById('contrib-localite');
var contribRemarque = document.getElementById('contrib-remarque');
var contribLat = document.getElementById('contrib-lat');
var contribLon = document.getElementById('contrib-lon');
var btnContribuer = document.getElementById('btn-contribuer');
var btnAnnulerContrib = document.getElementById('btn-annuler-contrib');

function ouvrirFormulaireContribution(lat, lon) {
  editingContribId = null;
  contribLat.value = lat;
  contribLon.value = lon;
  contribNom.value = '';
  contribLocalite.value = '';
  contribRemarque.value = '';
  modalContribution.hidden = false;
}

function ouvrirFormulaireContributionPourEdit(feature) {
  var coords = feature.geometry && feature.geometry.coordinates;
  if (coords && coords.length >= 2) {
    contribLon.value = coords[0];
    contribLat.value = coords[1];
  }
  contribNom.value = (feature.properties && feature.properties.name) || '';
  contribLocalite.value = (feature.properties && feature.properties.localite) || '';
  contribRemarque.value = (feature.properties && feature.properties.remarque) || '';
  editingContribId = (feature.properties && feature.properties.id) || null;
  modalContribution.hidden = false;
}

function fermerFormulaireContribution() {
  modalContribution.hidden = true;
  editingContribId = null;
}

var modalChoixContrib = document.getElementById('modal-choix-contribution');
var btnChoixMairie = document.getElementById('btn-choix-mairie');
var btnChoixLocalite = document.getElementById('btn-choix-localite');
var btnAnnulerChoix = document.getElementById('btn-annuler-choix');

btnContribuer.addEventListener('click', function () {
  if (modeContribuer) {
    modeContribuer = false;
    map.off('click', contributionClickHandler);
    btnContribuer.classList.remove('mode-actif');
    document.body.classList.remove('mode-contribuer');
    return;
  }
  if (modeContribuerLocalite) {
    annulerDessinPolygone();
    return;
  }
  if (!isLoggedIn()) {
    document.getElementById('modal-contribuer-auth-required').hidden = false;
    return;
  }
  modalChoixContrib.hidden = false;
});

btnAnnulerChoix.addEventListener('click', function () {
  modalChoixContrib.hidden = true;
});

btnChoixMairie.addEventListener('click', function () {
  modalChoixContrib.hidden = true;
  modeContribuer = true;
  btnContribuer.classList.add('mode-actif');
  document.body.classList.add('mode-contribuer');
  contributionClickHandler = function (e) {
    map.off('click', contributionClickHandler);
    modeContribuer = false;
    btnContribuer.classList.remove('mode-actif');
    document.body.classList.remove('mode-contribuer');
    ouvrirFormulaireContribution(e.latlng.lat, e.latlng.lng);
  };
  map.on('click', contributionClickHandler);
});

btnChoixLocalite.addEventListener('click', function () {
  modalChoixContrib.hidden = true;
  demarrerDessinPolygoneLocalite();
});

btnAnnulerContrib.addEventListener('click', function () {
  fermerFormulaireContribution();
});

formContribution.addEventListener('submit', function (e) {
  e.preventDefault();
  var lat = parseFloat(contribLat.value);
  var lon = parseFloat(contribLon.value);
  var nom = (contribNom.value || '').trim();
  if (!nom) {
    alert('Veuillez renseigner le nom de la mairie.');
    return;
  }
  if (isNaN(lat) || isNaN(lon)) {
    fermerFormulaireContribution();
    return;
  }
  if (editingContribId) {
    var existing = data02.features && data02.features.find(function (f) { return (f.properties && f.properties.id) === editingContribId; });
    if (existing) {
      existing.geometry = { type: 'Point', coordinates: [lon, lat] };
      existing.properties.name = nom;
      existing.properties.localite = (contribLocalite.value || '').trim() || undefined;
      existing.properties.remarque = (contribRemarque.value || '').trim() || undefined;
      saveData02();
      refreshContributionsLayer();
    }
    fermerFormulaireContribution();
    return;
  }
  var feature = {
    type: 'Feature',
    properties: {
      name: nom,
      id: 'c_' + Date.now(),
      localite: (contribLocalite.value || '').trim() || undefined,
      remarque: (contribRemarque.value || '').trim() || undefined
    },
    geometry: { type: 'Point', coordinates: [lon, lat] }
  };
  if (!data02.features) data02.features = [];
  data02.features.push(feature);
  saveData02();
  refreshContributionsLayer();
  fermerFormulaireContribution();
});

// ——— Contribution localité : numérisation polygone + formulaire + enregistrement
var modeContribuerLocalite = false;
var polygonPoints = [];
var tempPolyline = null;
var tempPolygon = null;
var polygonClickHandler = null;
var pendingLocaliteCoords = null; // [[lng, lat], ...] pour le formulaire

var polygonToolbar = document.getElementById('polygon-toolbar');
var btnContribuerLocalite = document.getElementById('btn-contribuer-localite');
var btnTerminerPolygone = document.getElementById('btn-terminer-polygone');
var btnAnnulerPolygone = document.getElementById('btn-annuler-polygone');
var modalContribLocalite = document.getElementById('modal-contribution-localite');
var formContribLocalite = document.getElementById('form-contribution-localite');
var btnAnnulerContribLocalite = document.getElementById('btn-annuler-contrib-localite');

function clearTempPolygonLayers() {
  if (tempPolyline) { map.removeLayer(tempPolyline); tempPolyline = null; }
  if (tempPolygon) { map.removeLayer(tempPolygon); tempPolygon = null; }
  polygonPoints = [];
}

function addPolygonPoint(e) {
  polygonPoints.push(e.latlng);
  if (tempPolyline) map.removeLayer(tempPolyline);
  var latlngs = polygonPoints.map(function (p) { return [p.lat, p.lng]; });
  tempPolyline = L.polyline(latlngs, { color: '#9b59b6', weight: 2, dashArray: '5,10' }).addTo(map);
}

function terminerPolygoneEtOuvrirFormulaire() {
  if (polygonPoints.length < 3) {
    alert('Ajoutez au moins 3 points pour former un polygone.');
    return;
  }
  map.off('click', polygonClickHandler);
  modeContribuerLocalite = false;
  btnContribuer.classList.remove('mode-actif');
  document.body.classList.remove('mode-contribuer-localite');
  polygonToolbar.hidden = true;

  var ring = polygonPoints.map(function (p) { return [p.lng, p.lat]; });
  ring.push([polygonPoints[0].lng, polygonPoints[0].lat]);
  pendingLocaliteCoords = ring;

  clearTempPolygonLayers();

  document.getElementById('contrib-loc-nom').value = '';
  document.getElementById('contrib-loc-sp').value = '';
  document.getElementById('contrib-loc-prefecture').value = '';
  document.getElementById('contrib-loc-region').value = '';
  document.getElementById('contrib-loc-district').value = '';
  document.getElementById('contrib-loc-remarque').value = '';
  modalContribLocalite.hidden = false;
}

function annulerDessinPolygone() {
  map.off('click', polygonClickHandler);
  modeContribuerLocalite = false;
  btnContribuer.classList.remove('mode-actif');
  document.body.classList.remove('mode-contribuer-localite');
  polygonToolbar.hidden = true;
  clearTempPolygonLayers();
}

function demarrerDessinPolygoneLocalite() {
  modeContribuerLocalite = true;
  btnContribuer.classList.add('mode-actif');
  document.body.classList.add('mode-contribuer-localite');
  polygonToolbar.hidden = false;
  clearTempPolygonLayers();
  polygonClickHandler = function (e) { addPolygonPoint(e); };
  map.on('click', polygonClickHandler);
}

btnTerminerPolygone.addEventListener('click', terminerPolygoneEtOuvrirFormulaire);
btnAnnulerPolygone.addEventListener('click', annulerDessinPolygone);

btnAnnulerContribLocalite.addEventListener('click', function () {
  modalContribLocalite.hidden = true;
  pendingLocaliteCoords = null;
  editingLocaliteId = null;
});

formContribLocalite.addEventListener('submit', function (e) {
  e.preventDefault();
  var nom = (document.getElementById('contrib-loc-nom').value || '').trim();
  if (!nom) {
    alert('Veuillez renseigner le nom de la localité.');
    return;
  }
  if (editingLocaliteId) {
    var existingLoc = data02_localite.features && data02_localite.features.find(function (f) { return (f.properties && f.properties.id) === editingLocaliteId; });
    if (existingLoc && existingLoc.properties) {
      existingLoc.properties.LOCALITE = nom;
      existingLoc.properties.SP = (document.getElementById('contrib-loc-sp').value || '').trim() || undefined;
      existingLoc.properties.PREFECTURE = (document.getElementById('contrib-loc-prefecture').value || '').trim() || undefined;
      existingLoc.properties.REGION = (document.getElementById('contrib-loc-region').value || '').trim() || undefined;
      existingLoc.properties.DISTRICT = (document.getElementById('contrib-loc-district').value || '').trim() || undefined;
      existingLoc.properties.remarque = (document.getElementById('contrib-loc-remarque').value || '').trim() || undefined;
      saveData02Localite();
      refreshContributionsLocaliteLayer();
    }
    modalContribLocalite.hidden = true;
    editingLocaliteId = null;
    return;
  }
  if (!pendingLocaliteCoords || pendingLocaliteCoords.length < 4) {
    modalContribLocalite.hidden = true;
    pendingLocaliteCoords = null;
    return;
  }
  var feature = {
    type: 'Feature',
    properties: {
      id: 'loc_c_' + Date.now(),
      LOCALITE: nom,
      SP: (document.getElementById('contrib-loc-sp').value || '').trim() || undefined,
      PREFECTURE: (document.getElementById('contrib-loc-prefecture').value || '').trim() || undefined,
      REGION: (document.getElementById('contrib-loc-region').value || '').trim() || undefined,
      DISTRICT: (document.getElementById('contrib-loc-district').value || '').trim() || undefined,
      remarque: (document.getElementById('contrib-loc-remarque').value || '').trim() || undefined
    },
    geometry: { type: 'Polygon', coordinates: [pendingLocaliteCoords] }
  };
  if (!data02_localite.features) data02_localite.features = [];
  data02_localite.features.push(feature);
  saveData02Localite();
  refreshContributionsLocaliteLayer();
  modalContribLocalite.hidden = true;
  pendingLocaliteCoords = null;
});

// ——— Barre d'outils verticale (style OpenStreetMap) ———
const mapFondBox = document.getElementById('map-fond-box');
if (mapFondBox) {
  document.getElementById('toolbar-layers').addEventListener('click', function () {
    mapFondBox.classList.toggle('map-fond-box--hidden');
  });
}

document.getElementById('toolbar-zoom-in').addEventListener('click', function () { map.zoomIn(); });
document.getElementById('toolbar-zoom-out').addEventListener('click', function () { map.zoomOut(); });

document.getElementById('toolbar-locate').addEventListener('click', function () {
  if (!navigator.geolocation) {
    alert('La géolocalisation n’est pas supportée par votre navigateur.');
    return;
  }
  map.locate({ setView: true, maxZoom: 14 });
});
map.on('locationerror', function () {
  alert('Impossible d’obtenir votre position. Vérifiez les autorisations du navigateur.');
});

// Langue : ouvrir modale
document.getElementById('toolbar-langue').addEventListener('click', function () {
  document.getElementById('modal-toolbar-langue').hidden = false;
});
document.querySelectorAll('.btn-langue').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.btn-langue').forEach(function (b) { b.classList.remove('active'); });
    this.classList.add('active');
  });
});
document.getElementById('close-modal-langue').addEventListener('click', function () {
  document.getElementById('modal-toolbar-langue').hidden = true;
});

// Info (à propos / copyright)
document.getElementById('toolbar-info').addEventListener('click', function () {
  document.getElementById('modal-toolbar-info').hidden = false;
});
document.getElementById('close-modal-info').addEventListener('click', function () {
  document.getElementById('modal-toolbar-info').hidden = true;
});

// Partager : lien de la vue actuelle
function getShareLink() {
  var c = map.getCenter();
  var z = map.getZoom();
  return window.location.origin + window.location.pathname + '#map=' + z + '/' + c.lat.toFixed(4) + '/' + c.lng.toFixed(4);
}
document.getElementById('toolbar-share').addEventListener('click', function () {
  var input = document.getElementById('share-link-input');
  input.value = getShareLink();
  document.getElementById('modal-toolbar-share').hidden = false;
});
document.getElementById('copy-share-link').addEventListener('click', function () {
  var input = document.getElementById('share-link-input');
  input.select();
  document.execCommand('copy');
  this.textContent = 'Copié !';
  var t = this;
  setTimeout(function () { t.textContent = 'Copier'; }, 2000);
});
document.getElementById('close-modal-share').addEventListener('click', function () {
  document.getElementById('modal-toolbar-share').hidden = true;
});

// Commentaires / feedback
document.getElementById('toolbar-feedback').addEventListener('click', function () {
  document.getElementById('modal-toolbar-feedback').hidden = false;
});
document.getElementById('close-modal-feedback').addEventListener('click', function () {
  document.getElementById('modal-toolbar-feedback').hidden = true;
});
document.getElementById('form-feedback').addEventListener('submit', function (e) {
  e.preventDefault();
  alert('Merci pour votre message. Cette fonctionnalité sera connectée à un serveur prochainement.');
  document.getElementById('modal-toolbar-feedback').hidden = true;
});

// Aide
document.getElementById('toolbar-help').addEventListener('click', function () {
  document.getElementById('modal-toolbar-help').hidden = false;
});
document.getElementById('close-modal-help').addEventListener('click', function () {
  document.getElementById('modal-toolbar-help').hidden = true;
});

// Restaurer la vue depuis le hash (#map=z/lat/lng)
(function () {
  var hash = window.location.hash;
  var m = hash && hash.match(/#map=(\d+)\/([-\d.]+)\/([-\d.]+)/);
  if (m) {
    var z = parseInt(m[1], 10);
    var lat = parseFloat(m[2]);
    var lng = parseFloat(m[3]);
    if (!isNaN(z) && !isNaN(lat) && !isNaN(lng)) map.setView([lat, lng], z);
  }
})();

// ——— Modales auth : Connexion / Inscription ———
var modalContribuerAuthRequired = document.getElementById('modal-contribuer-auth-required');
var modalLogin = document.getElementById('modal-login');
var modalRegister = document.getElementById('modal-register');

document.getElementById('btn-se-connecter').addEventListener('click', function (e) {
  e.preventDefault();
  modalLogin.hidden = false;
  document.getElementById('login-error').hidden = true;
});
document.getElementById('btn-s-inscrire').addEventListener('click', function (e) {
  e.preventDefault();
  modalRegister.hidden = false;
  document.getElementById('register-error').hidden = true;
});

document.getElementById('btn-deconnexion').addEventListener('click', function (e) {
  e.preventDefault();
  clearSession();
  updateAuthHeader();
});

document.getElementById('btn-open-login-from-contrib').addEventListener('click', function () {
  if (modalContribuerAuthRequired) modalContribuerAuthRequired.hidden = true;
  modalLogin.hidden = false;
  document.getElementById('login-error').hidden = true;
});
document.getElementById('btn-open-register-from-contrib').addEventListener('click', function () {
  if (modalContribuerAuthRequired) modalContribuerAuthRequired.hidden = true;
  modalRegister.hidden = false;
  document.getElementById('register-error').hidden = true;
});

document.getElementById('btn-close-login').addEventListener('click', function () { modalLogin.hidden = true; });
document.getElementById('btn-close-register').addEventListener('click', function () { modalRegister.hidden = true; });

document.getElementById('form-login').addEventListener('submit', function (e) {
  e.preventDefault();
  var mail = document.getElementById('login-mail').value.trim();
  var mot_de_passe = document.getElementById('login-password').value;
  var errEl = document.getElementById('login-error');
  errEl.hidden = true;
  fetch(API_BASE + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mail: mail, mot_de_passe: mot_de_passe })
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.ok) {
        setSession(data.token, data.user);
        updateAuthHeader();
        modalLogin.hidden = true;
        return;
      }
      errEl.textContent = data.message || 'Erreur de connexion.';
      errEl.hidden = false;
    })
    .catch(function () {
      errEl.textContent = 'Erreur réseau. Vérifiez que le serveur est démarré (npm start dans le dossier server).';
      errEl.hidden = false;
    });
});

document.getElementById('form-register').addEventListener('submit', function (e) {
  e.preventDefault();
  var nom_utilisateur = document.getElementById('register-nom').value.trim();
  var mail = document.getElementById('register-mail').value.trim();
  var mot_de_passe = document.getElementById('register-password').value;
  var errEl = document.getElementById('register-error');
  errEl.hidden = true;
  fetch(API_BASE + '/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom_utilisateur: nom_utilisateur, mail: mail, mot_de_passe: mot_de_passe })
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.ok) {
        modalRegister.hidden = true;
        alert(data.message || 'Inscription réussie. Consultez votre boîte mail pour confirmer votre compte.');
        return;
      }
      errEl.textContent = data.message || 'Erreur d\'inscription.';
      errEl.hidden = false;
    })
    .catch(function () {
      errEl.textContent = 'Erreur réseau. Vérifiez que le serveur est démarré (npm start dans le dossier server).';
      errEl.hidden = false;
    });
});

// Vérifier la session au chargement
initAuth();
