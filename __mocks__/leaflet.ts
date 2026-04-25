const mapInstance = {
  setView: () => mapInstance,
  on: () => mapInstance,
  remove: () => {},
  fitBounds: () => mapInstance,
}

const L = {
  map: () => mapInstance,
  tileLayer: () => ({ addTo: () => {} }),
  circleMarker: () => ({
    addTo: () => ({ bindPopup: () => ({ on: () => {} }) }),
    remove: () => {},
    setStyle: () => {},
  }),
  latLngBounds: () => ({}),
}
export default L
