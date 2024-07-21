import euclideanDistance from './euclidean_distance'
const FINE_TOLERANCE = 4
const GROSS_TOLERANCE = 12
const INTERVAL = 500

type Options = {
	fineTolerance?: number
	grossTolerance?: number
	interval?: number
}
export default function isClick<T extends { timestamp: number; point: mapboxgl.Point }>(
	start: T,
	end: T,
	options: Options = {}
) {
	const fineTolerance = options.fineTolerance ?? FINE_TOLERANCE
	const grossTolerance = options.grossTolerance ?? GROSS_TOLERANCE
	const interval = options.interval ?? INTERVAL
	const moveDistance = euclideanDistance(start.point, end.point)
	return (
		moveDistance < fineTolerance &&
		moveDistance < grossTolerance &&
		end.timestamp - start.timestamp < interval
	)
}
