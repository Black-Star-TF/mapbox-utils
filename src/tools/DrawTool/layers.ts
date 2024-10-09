import mapboxgl from 'mapbox-gl'
type DisabledProperty = 'source' | 'source-layer'
export type LayerOptions =
	| Omit<mapboxgl.CircleLayer, DisabledProperty>
	| Omit<mapboxgl.SymbolLayer, DisabledProperty>
	| Omit<mapboxgl.LineLayer, DisabledProperty>
	| Omit<mapboxgl.FillLayer, DisabledProperty>
const layers: Array<LayerOptions> = [
	{
		id: 'mapbox-utils-draw-tool-point',
		type: 'circle',
		paint: {
			'circle-color': '#fff',
			'circle-stroke-color': '#f00',
			'circle-radius': 5,
			'circle-stroke-width': 3
		},
		filter: ['==', '$type', 'Point']
	},
	{
		id: 'mapbox-utils-draw-tool-line',
		type: 'line',
		paint: {
			'line-color': '#0f0',
			'line-width': 2
		},
		filter: ['any', ['==', '$type', 'LineString'], ['==', '$type', 'Polygon']]
	},
	{
		id: 'mapbox-utils-draw-tool-fill',
		type: 'fill',
		paint: {
			'fill-color': '#f00',
			'fill-opacity': ['case', ['==', ['get', 'active'], true], 0.2, 0.4]
		},
		filter: ['==', '$type', 'Polygon']
	}
]

export default layers
