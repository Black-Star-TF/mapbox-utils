const Electronic = {
	version: 8,
	sources: {
		baseMap: {
			type: 'raster',
			tiles: [
				'http://t0.tianditu.gov.cn/DataServer?T=vec_w&X={x}&Y={y}&L={z}&tk=793ad40dc6f5250e3d93ef43a204b175'
			],
			tileSize: 256
		},
		baseMapLabel: {
			type: 'raster',
			tiles: [
				'http://t0.tianditu.gov.cn/DataServer?T=cva_w&X={x}&Y={y}&L={z}&tk=793ad40dc6f5250e3d93ef43a204b175'
			],
			tileSize: 256
		}
	},
	layers: [
		{
			id: 'baseMap',
			source: 'baseMap',
			type: 'raster',
			minzoom: 0,
			maxzoom: 18,
			paint: {
				'raster-brightness-min': 0.1,
				'raster-brightness-max': 1
			}
		},
		{
			id: 'baseMapLabel',
			source: 'baseMapLabel',
			type: 'raster',
			minzoom: 0,
			maxzoom: 18,
			paint: {
				'raster-brightness-min': 0.1,
				'raster-brightness-max': 1
			}
		}
	]
}

const Satellite = {
	version: 8,
	sources: {
		baseMap: {
			type: 'raster',
			tiles: [
				'http://t0.tianditu.gov.cn/DataServer?T=img_w&X={x}&Y={y}&L={z}&tk=793ad40dc6f5250e3d93ef43a204b175'
			],
			tileSize: 256
		},
		baseMapLabel: {
			type: 'raster',
			tiles: [
				'http://t0.tianditu.gov.cn/DataServer?T=img_w&X={x}&Y={y}&L={z}&tk=793ad40dc6f5250e3d93ef43a204b175'
			],
			tileSize: 256
		}
	},
	layers: [
		{
			id: 'baseMap',
			source: 'baseMap',
			type: 'raster',
			minzoom: 0,
			maxzoom: 18,
			paint: {
				'raster-brightness-min': 0.1,
				'raster-brightness-max': 1
			}
		},
		{
			id: 'baseMapLabel',
			source: 'baseMapLabel',
			type: 'raster',
			minzoom: 0,
			maxzoom: 18,
			paint: {
				'raster-brightness-min': 0.1,
				'raster-brightness-max': 1
			}
		}
	]
}

var mapStyles = {
	Electronic,
	Satellite
}
