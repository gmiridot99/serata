const L = {
  map: () => ({
    setView: () => ({ on: () => {} }),
    remove: () => {},
  }),
  tileLayer: () => ({ addTo: () => {} }),
  circleMarker: () => ({
    addTo: () => ({ bindPopup: () => ({ on: () => {} }) }),
    remove: () => {},
    setStyle: () => {},
  }),
}
export default L
