import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import isEqual from 'lodash.isequal';
import pick from 'lodash.pick';
import omit from 'lodash.omit';
import { getElementByPropGiven, getElemPos, xStr2absRelative } from './utils';
import { smoothBezierPoints } from './utils/buzierSmooth';
import PT from 'prop-types';
import { buzzierMinSols, bzFunction } from './utils/buzzier';
import { getShortestLine, prepareAnchor } from './utils/anchors';
import {
  _faceDirType,
  _prevPosType,
  _xarrowVarPropsType,
  arrowShapes,
  labelsType,
  labelType,
  svgCustomEdgeType,
  svgEdgeShapeType,
  tAnchorEdge,
  tArrowShapes,
  tFacingDir,
  tPaths,
  tSvgElems,
  xarrowPropsType,
} from './types';
import { chooseSimplestPath, EAD, points2Vector, pointsToLines, SAD, SmartGrid, Vector } from './utils/paths';

// const pathMargin = 30;

const Xarrow: React.FC<xarrowPropsType> = (props: xarrowPropsType) => {
  const varProps = omit(props, ['start', 'end']) as _xarrowVarPropsType;
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
  } = varProps;

  const svgRef = useRef(null);
  const lineRef = useRef(null);
  const headRef = useRef(null);
  const tailRef = useRef(null);
  const lineDrawAnimRef = useRef(null);
  const lineDashAnimRef = useRef(null);
  const headOpacityAnimRef = useRef<SVGAnimationElement>(null);

  const startRef = useRef(null);
  const endRef = useRef(null);

  const prevPosState = useRef<_prevPosType>(null);
  const prevProps = useRef<_xarrowVarPropsType>(null);

  const headBox = useRef({ x: 0, y: 0, width: 1, height: 1 });
  const tailBox = useRef({ x: 0, y: 0, width: 1, height: 1 });

  const [drawAnimEnded, setDrawAnimEnded] = useState(!animateDrawing);

  const [st, setSt] = useState({
    //initial state
    cx0: 0, //x start position of the canvas
    cy0: 0, //y start position of the canvas
    cw: 0, // the canvas width
    ch: 0, // the canvas height
    x1: 0, //the x starting point of the line inside the canvas
    y1: 0, //the y starting point of the line inside the canvas
    x2: 0, //the x ending point of the line inside the canvas
    y2: 0, //the y ending point of the line inside the canvas
    dx: 0, // the x difference between 'start' anchor to 'end' anchor
    dy: 0, // the y difference between 'start' anchor to 'end' anchor
    absDx: 0, // the x length(positive) difference
    absDy: 0, // the y length(positive) difference
    headOrient: 0, // determines to what side the arrowhead will point
    tailOrient: 0, // determines to what side the arrow tail will point
    headOffset: { x: 0, y: 0 },
    tailOffset: { x: 0, y: 0 },
    // arrowHeadOffset: { x: 0, y: 0 },
    // arrowTailOffset: { x: 0, y: 0 },
    excRight: 0, //expand canvas to the right
    excLeft: 0, //expand canvas to the left
    excUp: 0, //expand canvas upwards
    excDown: 0, // expand canvas downward
    startPoints: [],
    endPoints: [],
    mainDivPos: { x: 0, y: 0 },
    xSign: 1,
    ySign: 1,
    lineLength: 0,
    fHeadSize: 1,
    fTailSize: 1,
    arrowPath: ``,
    labelStartPos: { x: 0, y: 0 },
    labelMiddlePos: { x: 0, y: 0 },
    labelEndPos: { x: 0, y: 0 },
    labelsPos: [] as { pos: { x: number; y: number }; label: labelType }[],
    smartGrid: null as SmartGrid,
  });

  // // debug
  // if (process.env.NODE_ENV === 'development') {
  //   var _render = useRef(0);
  //   var _call = useRef(-1);
  //   _call.current += 1;
  //   var consoleState = () => `{call:${_call.current},render:${_render.current}}`;
  //   var log = (...args) => console.log(...args, consoleState());
  // }

  /**
   * determine if an update is needed and update if so.
   * update is needed if one of the connected elements position was changed since last render,
   * or if the ref to one of the elements has changed(it points to a different element)
   * or if one of the given props has changed
   */
  const updateIfNeeded = () => {
    // in case one of the elements does not mounted skip any update
    if (startRef.current == null || endRef.current == null || showXarrow == false) return;

    if (!isEqual(varProps, prevProps.current)) {
      //first check if any properties changed
      if (prevProps.current) {
        prevProps.current = varProps;
        prevPosState.current = getElemsPos();
        updatePosition();
      }
    } else {
      //if the properties did not changed - update position if needed
      let posState = getElemsPos();
      if (!isEqual(prevPosState.current, posState)) {
        prevPosState.current = posState;
        updatePosition();
      }
    }
  };

  headSize = Number(headSize);
  strokeWidth = Number(strokeWidth);
  headColor = headColor ? headColor : color;
  tailColor = tailColor ? tailColor : color;
  lineColor = lineColor ? lineColor : color;

  let labels: labelsType = {};
  if (label) {
    if (typeof label === 'string' || React.isValidElement(label)) labels = { middle: label };
    else labels = { ...(label as labelsType) };
  }

  const defaultEdge = (svgEdge): svgCustomEdgeType => {
    if (typeof svgEdge == 'string') {
      if (svgEdge in arrowShapes) svgEdge = arrowShapes[svgEdge as svgEdgeShapeType];
      else {
        console.warn(
          `'${svgEdge}' is not supported arrow shape. the supported arrow shapes is one of ${tArrowShapes}.
           reverting to default shape.`
        );
        svgEdge = arrowShapes['arrow1'];
      }
    }
    svgEdge = svgEdge as svgCustomEdgeType;
    if (svgEdge?.offsetForward === undefined) svgEdge.offsetForward = 0.75;
    if (svgEdge?.svgElem === undefined) svgEdge.svgElem = 'path';
    if (svgEdge?.svgProps === undefined) svgEdge.svgProps = arrowShapes.arrow1.svgProps;
    return svgEdge;
  };
  headShape = defaultEdge(headShape);
  tailShape = defaultEdge(tailShape);

  const getSvgPos = () => {
    // if (!mainDivRef.current) return { x: 0, y: 0 };
    let { left: svgX, top: svgY } = svgRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
    let svgStyleLeft = 0,
      svgStyleTop = 0;
    if (svgRef.current) {
      let svgStyle = getComputedStyle(svgRef.current);
      svgStyleLeft = Number(svgStyle.left.slice(0, -2));
      svgStyleTop = Number(svgStyle.top.slice(0, -2));
    }
    return {
      x: svgX - svgStyleLeft,
      y: svgY - svgStyleTop,
    };
  };

  const getElemsPos = (): _prevPosType => {
    let start = getElemPos(startRef.current);
    let end = getElemPos(endRef.current);
    return { start, end };
  };

  /**
   * The Main logic of path calculation for the arrow.
   * calculate new path, adjusting canvas, and set state based on given properties.
   * */
  const updatePosition = (positions: _prevPosType = prevPosState.current): void => {
    let { start: sPos } = positions;
    let { end: ePos } = positions;
    let startWidth = sPos.right - sPos.x;
    let startHeight = sPos.bottom - sPos.y;
    let endWidth = ePos.right - ePos.x;
    let endHeight = ePos.bottom - ePos.y;

    let headOrient: number = 0;
    let tailOrient: number = 0;

    // convert startAnchor and endAnchor to list of objects represents allowed anchors.
    let startPoints = prepareAnchor(startAnchor, sPos);
    let endPoints = prepareAnchor(endAnchor, ePos);

    // choose the smallest path for 2 ponts from these possibilities.
    let { chosenStart, chosenEnd } = getShortestLine(startPoints, endPoints);

    let startPoint = pick(chosenStart, ['x', 'y']),
      endPoint = pick(chosenEnd, ['x', 'y']);

    headShape = headShape as svgCustomEdgeType;
    tailShape = tailShape as svgCustomEdgeType;

    let mainDivPos = getSvgPos();
    let cx0 = Math.min(startPoint.x, endPoint.x) - mainDivPos.x;
    let cy0 = Math.min(startPoint.y, endPoint.y) - mainDivPos.y;
    let dx = endPoint.x - startPoint.x;
    let dy = endPoint.y - startPoint.y;
    let absDx = Math.abs(dx);
    let absDy = Math.abs(dy);
    let xSign = dx > 0 ? 1 : -1;
    let ySign = dy > 0 ? 1 : -1;
    let xRev = dx < 0 ? 1 : 0;
    let yRev = dy < 0 ? 1 : 0;
    let fHeadSize = headSize * strokeWidth; //factored head size
    let fTailSize = tailSize * strokeWidth; //factored head size

    let cu = Number(curveness);
    // gridRadius = Number(gridRadius);
    if (!tPaths.includes(path)) path = 'smooth';
    if (path === 'straight') {
      cu = 0;
      path = 'smooth';
    }

    let biggerSide = headSize > tailSize ? headSize : tailSize;
    let _calc = strokeWidth + (strokeWidth * biggerSide) / 2;
    let excRight = _calc + Number(_extendSVGcanvas);
    let excLeft = _calc + Number(_extendSVGcanvas);
    let excUp = _calc + Number(_extendSVGcanvas);
    let excDown = _calc + Number(_extendSVGcanvas);
    excRight = 50;
    excLeft = 50;
    excUp = 50;
    excDown = 50;

    ////////////////////////////////////
    // arrow point to point calculations
    let x1 = excLeft + xRev * -dx,
      x2 = absDx + excLeft + xRev * dx,
      y1 = excUp + yRev * -dy,
      y2 = absDy + excUp + yRev * dy;

    let sv: Vector, ev: Vector;
    let sSides = chosenStart.anchor.facingDir as _faceDirType[],
      eSides = chosenEnd.anchor.facingDir as _faceDirType[];
    sSides = sSides.map((side) => (side === 'auto' ? 'outwards' : side));
    eSides = eSides.map((side) => (side === 'auto' ? 'inwards' : side));

    // figure the different possibilities to connect
    sv = points2Vector(x1, y1, chosenStart.anchor.position, sSides as Exclude<_faceDirType, 'auto'>[]);
    ev = points2Vector(x2, y2, chosenEnd.anchor.position, eSides as Exclude<_faceDirType, 'auto'>[]);
    // choose the simplest one
    let [sd, ed] = chooseSimplestPath(sv, ev, _pathMargin);
    sv = sv.setDirs(sd);
    ev = ev.setDirs(ed);
    let sdd = sd[0];
    let edd = ed[0];

    // offset head and tail function
    const getEdgeOffset = (edgeBox, fEdgeSize, edgeDir) => {
      let { x: xBoxEdge, y: yBoxEdge, width: widthBoxEdge, height: heightBoxEdge } = edgeBox.current;
      fEdgeSize /= Math.min(widthBoxEdge, heightBoxEdge);
      //offset the svg of the head
      let edgeOffsetVector = new Vector(0, 0)
        .add(edgeDir.mul(-(xBoxEdge + widthBoxEdge) * fEdgeSize))
        .add(edgeDir.rotate(90).mul(-(yBoxEdge + heightBoxEdge / 2) * fEdgeSize));
      let edgeOffset = pick(edgeOffsetVector, ['x', 'y']);
      return [fEdgeSize, edgeOffset, -widthBoxEdge * fEdgeSize];
    };

    let headOffset = { x: 0, y: 0 },
      perHeadOffset;
    if (headRef.current) {
      [fHeadSize, headOffset, perHeadOffset] = getEdgeOffset(headBox, fHeadSize, edd);
      ev = ev.add(edd.mul(perHeadOffset * headShape.offsetForward));
    }

    let tailOffset = { x: 0, y: 0 },
      perTailOffset;
    if (tailRef.current) {
      [fTailSize, tailOffset, perTailOffset] = getEdgeOffset(tailBox, fTailSize, sdd.reverse());
      sv = sv.add(sdd.reverse().mul(perTailOffset * tailShape.offsetForward));
    }

    // console.log(sv, ev, [], pathMargin);
    let resGridBreak = xStr2absRelative(gridBreak);
    if (!resGridBreak) resGridBreak = { relative: 50, abs: 0 };
    let smartGrid = new SmartGrid(sv, ev, [], _pathMargin, { zGridBreak: resGridBreak });
    let headVector = ev;
    let tailVector = sv;
    let headDir = headVector.faceDirs[0];
    let tailDir = tailVector.faceDirs[0].reverse();
    headOrient = headDir.toDegree();
    tailOrient = tailDir.toDegree();

    let points = smartGrid.getPoints();
    let arrowPath = pointsToLines(points);

    // let maxX = Math.max(...points.map((p) => p[0]));
    // let maxY = Math.max(...points.map((p) => p[1]));
    // let minX = Math.min(...points.map((p) => p[0]));
    // let minY = Math.min(...points.map((p) => p[1]));
    // console.log(maxX, maxY, minX, minY);
    // console.log(absDx + excLeft);
    // let f = strokeWidth;
    // if (maxX + f > absDx + excLeft + excRight) excRight = maxX - (absDx + excLeft) + f;
    // if (maxY + f > absDy + excUp + excDown) excDown = maxY - (absDy + excUp) + f;
    // if (minX < 0) excLeft -= minX;
    // if (minY < absDy - (excUp + excDown)) excDown = minY - (absDy + excUp) + f;

    // if (sd.length > 1) {
    //   console.log(sv, ev, sd);
    //   console.log(points);
    // }

    const cw = absDx + excLeft + excRight,
      ch = absDy + excUp + excDown;
    cx0 -= excLeft;
    cy0 -= excUp;

    let lineLength = smartGrid.getLength();
    const labelStartPos = labels.start ? pick(smartGrid.getPointOnGrid(10), ['x', 'y']) : null;
    const labelMiddlePos = labels.middle ? pick(smartGrid.getPointOnGrid(lineLength * 0.5), ['x', 'y']) : null;
    const labelEndPos = labels.end ? pick(smartGrid.getPointOnGrid(lineLength - 10), ['x', 'y']) : null;

    // handle custom labels
    const labelsPos: { pos: { x: number; y: number }; label: labelType }[] = [];
    for (let key in labels) {
      let res = xStr2absRelative(key);
      if (res) {
        let { relative: percentLen, abs: absLen } = res;
        labelsPos.push({
          pos: pick(smartGrid.getPointOnGrid(lineLength * percentLen + absLen), ['x', 'y']),
          label: labels[key],
        });
      }
    }

    setSt({
      cx0,
      cy0,
      x1,
      x2,
      y1,
      y2,
      cw,
      ch,
      dx,
      dy,
      absDx,
      absDy,
      headOrient,
      tailOrient,
      excLeft,
      excRight,
      excUp,
      excDown,
      headOffset,
      tailOffset,
      startPoints,
      endPoints,
      mainDivPos,
      xSign,
      ySign,
      lineLength,
      fHeadSize,
      fTailSize,
      arrowPath,
      labelStartPos,
      labelMiddlePos,
      labelEndPos,
      labelsPos,
      smartGrid,
    });
  };

  let dashStroke = 0,
    dashNone = 0,
    animDashSpeed,
    animDirection = 1;
  if (dashness) {
    if (typeof dashness === 'object') {
      dashStroke = dashness.strokeLen ? Number(dashness.strokeLen) : Number(strokeWidth) * 2;
      dashNone = dashness.strokeLen ? Number(dashness.nonStrokeLen) : Number(strokeWidth);
      animDashSpeed = dashness.animation ? Number(dashness.animation) : null;
    } else if (typeof dashness === 'boolean') {
      dashStroke = Number(strokeWidth) * 2;
      dashNone = Number(strokeWidth);
      animDashSpeed = null;
    }
  }

  let dashoffset = dashStroke + dashNone;
  if (animDashSpeed < 0) {
    animDashSpeed *= -1;
    animDirection = -1;
  }
  let dashArray,
    animation,
    animRepeatCount,
    animStartValue,
    animEndValue = 0;

  if (animateDrawing && drawAnimEnded == false) {
    if (typeof animateDrawing === 'boolean') animateDrawing = 1;
    animation = animateDrawing + 's';
    dashArray = st.lineLength;
    animStartValue = st.lineLength;
    animRepeatCount = 1;
    if (animateDrawing < 0) {
      [animStartValue, animEndValue] = [animEndValue, animStartValue];
      animation = animateDrawing * -1 + 's';
    }
  } else {
    dashArray = `${dashStroke} ${dashNone}`;
    animation = `${1 / animDashSpeed}s`;
    animStartValue = dashoffset * animDirection;
    animRepeatCount = 'indefinite';
    animEndValue = 0;
  }

  // console.log(st.lineLength);

  // update refs to elements if needed
  useLayoutEffect(() => {
    startRef.current = getElementByPropGiven(props.start);
  }, [props.start]);
  useLayoutEffect(() => {
    endRef.current = getElementByPropGiven(props.end);
  }, [props.end]);

  // handle draw animation
  useLayoutEffect(() => {
    // if (lineRef.current) setSt((prevSt) => ({ ...prevSt, lineLength: lineRef.current.getTotalLength() }));
    if (lineRef.current) setSt((prevSt) => ({ ...prevSt, lineLength: st.lineLength }));
  }, [lineRef.current]);

  // for adjustments of custom svg shapes
  useLayoutEffect(() => {
    headBox.current = headRef.current?.getBBox({ stroke: true }) ?? { x: 0, y: 0, width: 1, height: 1 };
  }, [props.headShape]);
  useLayoutEffect(() => {
    tailBox.current = tailRef.current?.getBBox({ stroke: true }) ?? { x: 0, y: 0, width: 1, height: 1 };
  }, [props.tailShape]);

  useLayoutEffect(() => {
    updateIfNeeded();

    // // debug
    // if (process.env.NODE_ENV === 'development') {
    //   // log('xarrow has rendered!');
    //   _render.current += 1;
    // }
  });

  // set all props on first render
  useEffect(() => {
    if (showXarrow) {
      prevProps.current = varProps;
      startRef.current = getElementByPropGiven(props.start);
      endRef.current = getElementByPropGiven(props.end);
      updateIfNeeded();
    }

    const monitorDOMchanges = () => {
      window.addEventListener('resize', updateIfNeeded);

      const handleDrawAmimEnd = () => {
        setDrawAnimEnded(true);
        // @ts-ignore
        headOpacityAnimRef.current?.beginElement();
        lineDashAnimRef.current?.beginElement();
      };
      const handleDrawAmimBegin = () => (headRef.current.style.opacity = '0');
      if (lineDrawAnimRef.current && headRef.current) {
        lineDrawAnimRef.current.addEventListener('endEvent', handleDrawAmimEnd);
        lineDrawAnimRef.current.addEventListener('beginEvent', handleDrawAmimBegin);
      }
      return () => {
        window.removeEventListener('resize', updateIfNeeded);
        if (lineDrawAnimRef.current) {
          lineDrawAnimRef.current.removeEventListener('endEvent', handleDrawAmimEnd);
          if (headRef.current) lineDrawAnimRef.current.removeEventListener('beginEvent', handleDrawAmimBegin);
        }
      };
    };

    const cleanMonitorDOMchanges = monitorDOMchanges();
    return () => {
      setDrawAnimEnded(false);
      cleanMonitorDOMchanges();
    };
  }, [showXarrow]);

  //todo: could make some advanced generic typescript inferring. for example get type from headShape.elem:T and
  // tailShape.elem:K force the type for passProps,arrowHeadProps,arrowTailProps property. for now `as any` is used to
  // avoid typescript conflicts
  // so todo- fix all the `passProps as any` assertions

  return (
    <div {...divContainerProps} style={{ position: 'absolute', ...divContainerStyle }} {...extraProps}>
      {showXarrow ? (
        <>
          <svg
            ref={svgRef}
            width={st.cw}
            height={st.ch}
            style={{
              position: 'absolute',
              left: st.cx0,
              top: st.cy0,
              pointerEvents: 'none',
              border: _debug ? '1px dashed yellow' : null,
              ...SVGcanvasStyle,
              // overflow: "hidden",
            }}
            overflow="auto"
            {...SVGcanvasProps}>
            {/* body of the arrow */}
            <path
              ref={lineRef}
              d={st.arrowPath}
              stroke={lineColor}
              strokeDasharray={dashArray}
              // strokeDasharray={'0 0'}
              strokeWidth={strokeWidth}
              fill="transparent"
              // strokeLinejoin={'round'}
              // strokeLinecap={'round'}
              pointerEvents="visibleStroke"
              {...(passProps as any)}
              {...arrowBodyProps}>
              <>
                {drawAnimEnded ? (
                  <>
                    {/* moving dashed line animation */}
                    {animDashSpeed ? (
                      <animate
                        ref={lineDashAnimRef}
                        attributeName="stroke-dashoffset"
                        values={`${dashoffset * animDirection};0`}
                        dur={`${1 / animDashSpeed}s`}
                        repeatCount="indefinite"
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    {/* the creation of the line animation */}
                    {animateDrawing ? (
                      <animate
                        ref={lineDrawAnimRef}
                        id={`svgEndAnimate`}
                        attributeName="stroke-dashoffset"
                        values={`${animStartValue};${animEndValue}`}
                        dur={animation}
                        repeatCount={animRepeatCount}
                      />
                    ) : null}
                  </>
                )}
              </>
            </path>
            {/* arrow tail */}
            {showTail ? (
              <tailShape.svgElem
                // d={normalArrowShape}
                ref={tailRef as any}
                fill={tailColor}
                pointerEvents="auto"
                transform={`translate(${st.x1 + st.tailOffset.x},${st.y1 + st.tailOffset.y}) rotate(${
                  st.tailOrient
                }) scale(${st.fTailSize})`}
                {...tailShape.svgProps}
                {...(passProps as any)}
                {...arrowTailProps}
              />
            ) : null}

            {/* head of the arrow */}
            {showHead ? (
              <headShape.svgElem
                ref={headRef as any}
                fill={headColor}
                pointerEvents="auto"
                transform={`translate(${st.x2 + st.headOffset.x},${st.y2 + st.headOffset.y}) rotate(${
                  st.headOrient
                }) scale(${st.fHeadSize})`}
                opacity={animateDrawing && !drawAnimEnded ? 0 : 1}
                {...headShape.svgProps}
                {...(passProps as any)}
                {...arrowHeadProps}>
                <animate
                  ref={headOpacityAnimRef}
                  dur={'0.4'}
                  attributeName="opacity"
                  from="0"
                  to="1"
                  begin={`indefinite`}
                  repeatCount="0"
                  fill="freeze"
                />
                ) : null
              </headShape.svgElem>
            ) : null}
            {/* debug elements */}
            {_debug ? (
              <>
                {/* start to end rectangle wrapper */}
                <rect
                  x={st.excLeft}
                  y={st.excUp}
                  width={st.absDx}
                  height={st.absDy}
                  fill="none"
                  stroke="pink"
                  strokeWidth="2px"
                />
              </>
            ) : null}
          </svg>

          {/*from here labels and debug elements*/}
          {/*************************************/}
          {labels.start ? (
            <div
              style={{
                // transform: st.dx < 0 ? 'translate(-100% , -50%)' : 'translate(-0% , -50%)',
                transform: `translate(${st.smartGrid?.sources[0].faceDirs[0].x < 0 ? -100 : 0}% , ${
                  st.dy > 0 ? '+' : '-'
                }50%)`,
                width: 'max-content',
                position: 'absolute',
                left: st.cx0 + st.labelStartPos.x,
                top: st.cy0 + st.labelStartPos.y - strokeWidth - 5,
              }}>
              {labels.start}
            </div>
          ) : null}
          {labels.middle ? (
            <div
              style={{
                display: 'table',
                width: 'max-content',
                transform: 'translate(-50% , -50%)',
                position: 'absolute',
                left: st.cx0 + st.labelMiddlePos.x,
                top: st.cy0 + st.labelMiddlePos.y,
              }}>
              {labels.middle}
            </div>
          ) : null}
          {labels.end ? (
            <div
              style={{
                // transform: st.dx > 0 ? 'translate(-100% , -50%)' : 'translate(-0% , -50%)',
                transform: `translate(${st.smartGrid?.getTarget().faceDirs[0].x > 0 ? -100 : 0}% , ${
                  st.dy < 0 ? '-50' : '-150'
                }%)`,
                width: 'max-content',
                position: 'absolute',
                left: st.cx0 + st.labelEndPos.x,
                top: st.cy0 + st.labelEndPos.y + strokeWidth + 5,
              }}>
              {labels.end}
            </div>
          ) : null}
          {/* custom labels (like label={30%50:"some label"})*/}
          {st.labelsPos.map((l, i) => (
            <div
              key={i}
              style={{
                width: 'max-content',
                transform: 'translate(-50% , -50%)',
                position: 'absolute',
                left: st.cx0 + l.pos.x,
                top: st.cy0 + l.pos.y,
              }}>
              {l.label}
            </div>
          ))}
          {_debug ? (
            <>
              {/* possible anchor connections */}
              {[...st.startPoints, ...st.endPoints].map((p, i) => {
                return (
                  <div
                    key={i}
                    style={{
                      background: 'gray',
                      opacity: 0.5,
                      borderRadius: '50%',
                      transform: 'translate(-50%, -50%)',
                      height: 5,
                      width: 5,
                      position: 'absolute',
                      left: p.x - st.mainDivPos.x,
                      top: p.y - st.mainDivPos.y,
                    }}
                  />
                );
              })}
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

//////////////////////////////
// propTypes

const pAnchorPositionType = PT.oneOf(tAnchorEdge);

const pAnchorCustomPositionType = PT.exact({
  position: pAnchorPositionType.isRequired,
  offset: PT.exact({
    rightness: PT.number,
    bottomness: PT.number,
  }),
  facingDir: PT.oneOfType([PT.oneOf(tFacingDir), PT.arrayOf(PT.oneOf(tFacingDir))]),
});

const _pAnchorType = PT.oneOfType([pAnchorPositionType, pAnchorCustomPositionType]);

const pAnchorType = PT.oneOfType([_pAnchorType, PT.arrayOf(_pAnchorType)]);

const pRefType = PT.oneOfType([PT.string, PT.exact({ current: PT.instanceOf(Element) })]);

const _pLabelType = PT.oneOfType([PT.element, PT.string]);

const pLabelsType = PT.shape({
  start: _pLabelType,
  middle: _pLabelType,
  end: _pLabelType,
});

const pSvgEdgeShapeType = PT.oneOf(Object.keys(arrowShapes) as Array<keyof typeof arrowShapes>);
const pSvgElemType = PT.oneOf(tSvgElems);
const pSvgEdgeType = PT.oneOfType([
  pSvgEdgeShapeType,
  PT.exact({
    svgElem: pSvgElemType,
    svgProps: PT.any,
    offsetForward: PT.number,
  }).isRequired,
]);

Xarrow.propTypes = {
  start: pRefType.isRequired,
  end: pRefType.isRequired,
  startAnchor: pAnchorType,
  endAnchor: pAnchorType,
  label: PT.oneOfType([_pLabelType, pLabelsType]),
  color: PT.string,
  lineColor: PT.string,
  showHead: PT.bool,
  headColor: PT.string,
  headSize: PT.number,
  tailSize: PT.number,
  tailColor: PT.string,
  strokeWidth: PT.number,
  showTail: PT.bool,
  path: PT.oneOf(tPaths),
  showXarrow: PT.bool,
  curveness: PT.number,
  gridBreak: PT.string,
  dashness: PT.oneOfType([PT.bool, PT.object]),
  headShape: pSvgEdgeType,
  tailShape: pSvgEdgeType,
  animateDrawing: PT.oneOfType([PT.bool, PT.number]),
  passProps: PT.object,
  arrowBodyProps: PT.object,
  arrowHeadProps: PT.object,
  arrowTailProps: PT.object,
  SVGcanvasProps: PT.object,
  divContainerProps: PT.object,
  _extendSVGcanvas: PT.number,
  _debug: PT.bool,
};

export default Xarrow;
