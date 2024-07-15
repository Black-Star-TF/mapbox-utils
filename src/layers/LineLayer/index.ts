import type mapboxgl from 'mapbox-gl'
import { getId } from '../../utils'
import CanHighlighLayer from '../CanHighlighLayer'
import type {
	Options,
	LayerOmitProperty,
	CommonEventType,
	CommonEventMap
} from '../CanHighlighLayer'
type LayerType = Omit<mapboxgl.LineLayer, LayerOmitProperty>
type LayerPool = Record<string, LayerType>
interface LineLayerOptions extends Options {
	layerPool: LayerPool
}
export default class LineLayer extends CanHighlighLayer {
	constructor(options: LineLayerOptions) {
		super(options)
		this._sourceId = getId('line')
	}

	on<T extends CommonEventType>(type: T, fn: (e: CommonEventMap[T] & { type: T }) => void) {
		this._ev?.on(type, fn)
	}
}
