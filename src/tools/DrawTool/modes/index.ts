import Mode from './mode'
import DrawPoint from './draw-point'
import DrawLine from './draw-line'
import DrawPolygon from './draw-polygon'
import DrawRect from './draw-rect'
import DrawCircle from './draw-circle'
import Select from './select'
import Move from './move'
export enum ModeType {
	NONE = 'NONE',
	DRAW_POINT = 'DRAW_POINT',
	DRAW_LINE = 'DRAW_LINE',
	DRAW_POLYGON = 'DRAW_POLYGON',
	DRAW_RECT = 'DRAW_RECT',
	DRAW_CIRCLE = 'DRAW_CIRCLE',
	SELECT = 'SELECT',
	MOVE = 'MOVE'
}

export const Modes = {
	[ModeType.NONE]: Mode,
	[ModeType.DRAW_POINT]: DrawPoint,
	[ModeType.DRAW_LINE]: DrawLine,
	[ModeType.DRAW_POLYGON]: DrawPolygon,
	[ModeType.DRAW_RECT]: DrawRect,
	[ModeType.DRAW_CIRCLE]: DrawCircle,
	[ModeType.SELECT]: Select,
	[ModeType.MOVE]: Move
}
