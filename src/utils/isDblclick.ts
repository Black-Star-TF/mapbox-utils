import euclideanDistance from './euclidean_distance'
const FINE_TOLERANCE = 4
const GROSS_TOLERANCE = 12
const INTERVAL = 300

type Options = {
	fineTolerance?: number
	grossTolerance?: number
	interval?: number
}
export default function isDblClick<T extends { timestamp: number; point: mapboxgl.Point }>(
	end: T,
	start?: T,
	options: Options = {}
) {
	if (!start) return false
	const fineTolerance = options.fineTolerance ?? FINE_TOLERANCE
	const grossTolerance = options.grossTolerance ?? GROSS_TOLERANCE
	const interval = options.interval ?? INTERVAL
	start.point = start.point || end.point
	start.timestamp = start.timestamp || end.timestamp
	const moveDistance = euclideanDistance(start.point, end.point)
	return (
		moveDistance < fineTolerance &&
		moveDistance < grossTolerance &&
		end.timestamp - start.timestamp < interval
	)
}
