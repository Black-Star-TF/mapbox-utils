import mapboxgl from 'mapbox-gl'
export default class CustomLayer implements mapboxgl.CustomLayerInterface {
	id: string
	renderingMode?: '2d' | '3d'
	type: 'custom'
	constructor(id: string) {
		this.id = id
		this.type = 'custom'
		this.renderingMode = '3d'
	}

	onAdd(_map: mapboxgl.Map, _gl: WebGLRenderingContext): void {}

	onRemove(_map: mapboxgl.Map, _gl: WebGLRenderingContext): void {}

	render(_gl: WebGLRenderingContext, _matrix: number[]): void {}
}
