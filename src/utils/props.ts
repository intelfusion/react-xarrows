import { xarrowPropsType } from '../types';

export const parseProps = (props: xarrowPropsType) => {
  let {
    startAnchor = 'auto',
    endAnchor = 'auto',
    label = null,
    color = 'CornflowerBlue',
    lineColor = null,
    headColor = null,
    tailColor = null,
    strokeWidth = 4,
    showHead = true,
    headSize = 6,
    showTail = false,
    tailSize = 6,
    path = 'smooth',
    curveness = 0.8,
    gridBreak = '50%',
    // gridRadius = strokeWidth * 2, //todo
    dashness = false,
    headShape = 'arrow1',
    tailShape = 'arrow1',
    showXarrow = true,
    animateDrawing = false,
    passProps = {},
    arrowBodyProps = {},
    arrowHeadProps = {},
    arrowTailProps = {},
    SVGcanvasProps = {},
    divContainerProps = {},
    divContainerStyle = {},
    SVGcanvasStyle = {},
    _extendSVGcanvas = 0,
    _debug = false,
    _pathMargin = 20,
    ...extraProps
  } = props;
};
