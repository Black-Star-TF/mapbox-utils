import type mapboxgl from 'mapbox-gl'
import { getId } from '../../utils'
import CanHighlighLayer from '../CanHighlighLayer'
import type {
	Options,
	LayerOmitProperty,
	CommonEventType,
	CommonEventMap
} from '../CanHighlighLayer'
type LayerType =
	| Omit<mapboxgl.LineLayer, LayerOmitProperty>
	| Omit<mapboxgl.FillLayer, LayerOmitProperty>
type LayerPool = Record<string, LayerType>
interface PolygonLayerOptions extends Options {
	layerPool: LayerPool
}
export default class PolygonLayer extends CanHighlighLayer {
	constructor(options: PolygonLayerOptions) {
		super(options)
		this._sourceId = getId('polygon')
	}

	on<T extends CommonEventType>(type: T, fn: (e: CommonEventMap[T] & { type: T }) => void) {
		this._ev?.on(type, fn)
	}
}
