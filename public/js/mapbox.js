/* eslint-disable */

const mapBox = document.getElementById('map');
const locations = JSON.parse(mapBox.dataset.locations);

mapboxgl.accessToken =
  'pk.eyJ1IjoiZ2NraXJjaG9mZiIsImEiOiJja2x2OXVxdTgwZDZpMm9wYm45MmMyaGwwIn0.Qn6Yq4CT1ylGd0Wr23CWcQ';
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/gckirchoff/cklvamcvd2nfq17nlvhl8yg66',
  scrollZoom: false,
  //   center: [-118, 34],
  //   zoom: 4,
  //   interactive: false,
});

const bounds = new mapboxgl.LngLatBounds();

locations.forEach((loc) => {
  // Create marker
  const el = document.createElement('div');
  el.className = 'marker';

  //   Add marker
  new mapboxgl.Marker({
    element: el,
    anchor: 'bottom',
  })
    .setLngLat(loc.coordinates)
    .addTo(map);

  // Add popup
  new mapboxgl.Popup({
    offset: 30,
  })
    .setLngLat(loc.coordinates)
    .setHTML(`<p>Dat ${loc.day}: ${loc.description}</p>`)
    .addTo(map);

  // Extend map bounds to include current location
  bounds.extend(loc.coordinates);
});

map.fitBounds(bounds, {
  padding: {
    top: 200,
    bottom: 175,
    left: 100,
    right: 100,
  },
});
