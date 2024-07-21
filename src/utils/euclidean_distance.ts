import mapboxgl from 'mapbox-gl'
export default function (a: mapboxgl.Point, b: mapboxgl.Point) {
	const x = a.x - b.x
	const y = a.y - b.y
	return Math.sqrt(x * x + y * y)
}
