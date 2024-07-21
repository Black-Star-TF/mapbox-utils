import Mode from './mode'
import DrawPoint from './draw-point'
import DrawLine from './draw-line'
import DrawPolygon from './draw-polygon'
export enum ModeType {
	NONE = 'NONE',
	DRAW_POINT = 'DRAW_POINT',
	DRAW_LINE = 'DRAW_LINE',
	DRAW_POLYGON = 'DRAW_POLYGON'
}

export const Modes = {
	[ModeType.NONE]: Mode,
	[ModeType.DRAW_POINT]: DrawPoint,
	[ModeType.DRAW_LINE]: DrawLine,
	[ModeType.DRAW_POLYGON]: DrawPolygon
}
