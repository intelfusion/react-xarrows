import React, { useState, useRef } from 'react';
import Xarrow, { arrowShapes, tFacingDir, tAnchorEdge } from 'react-xarrows';
import Draggable from 'react-draggable';
import NumericInput from 'react-numeric-input';
import Collapsible from 'react-collapsible';

const boxStyle = {
  position: 'absolute',
  background: 'white',
  border: '1px #999 solid',
  borderRadius: '10px',
  textAlign: 'center',
  width: '100px',
  height: '30px',
  color: 'black',
};

const canvasStyle = {
  width: '100%',
  height: '60vh',
  background: 'white',
  overflow: 'auto',
  display: 'flex',
  position: 'relative',
  color: 'black',
};

const colorOptions = ['red', 'BurlyWood', 'CadetBlue', 'Coral'];
const bodyColorOptions = [null, ...colorOptions];

// one row div with elements centered
const Div = ({ children, style = {}, ...props }) => {
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        ...style,
      }}
      {...props}>
      {children}
    </div>
  );
};

const MyCollapsible = ({ children, style = {}, title = 'title', ...props }) => {
  return (
    <Collapsible
      open={false}
      trigger={title}
      transitionTime={100}
      containerElementProps={{
        style: {
          border: '1px #999 solid',
        },
      }}
      triggerStyle={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      {...props}>
      {children}
    </Collapsible>
  );
};

// not in single line
const CollapsibleDiv = ({ children, style = {}, title = 'title', ...props }) => {
  return (
    <Collapsible
      open={false}
      trigger={title}
      transitionTime={100}
      containerElementProps={{
        style: {
          border: '1px #999 solid',
        },
      }}
      triggerStyle={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Div {...{ children, style, ...props }}>{children}</Div>
    </Collapsible>
  );
};

const Box = (props) => {
  return (
    <Draggable onDrag={props.forceRerender} onStop={props.forceRerender}>
      <div ref={props.box.ref} id={props.box.id} style={{ ...boxStyle, left: props.box.x, top: props.box.y }}>
        {props.box.id}
      </div>
    </Draggable>
  );
};

const CheckList = ({ titlesList, values, setValues }) => {
  return (
    <div>
      {titlesList.map((title, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 25,
          }}>
          <p>{title}</p>
          <input
            style={{ height: '15px', width: '15px' }}
            type="checkBox"
            checked={values.includes(title)}
            // value={}
            onChange={(e) => {
              if (e.target.checked) {
                setValues([...values, title]);
              } else {
                let a = [...values];
                a.splice(values.indexOf(title), 1);
                setValues(a);
              }
            }}
          />
        </div>
      ))}
    </div>
  );
};

const TitledCheckList = ({ title, titlesList, values, setValues }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginRight: 20, flexDirection: 'column' }}>
      <p>{title}: </p>
      <div>
        <CheckList titlesList={titlesList} values={values} setValues={setValues} />
      </div>
    </div>
  );
};

const ArrowEdge = ({ edgeName, setEdge, edgeSize, setEdgeSize, showEdge, setShowEdge, edgeShape, setEdgeShape }) => {
  const shapes = Object.keys(arrowShapes);
  const [selectedShape, setSelectedShape] = useState(shapes[0]);
  const [adv, setAdv] = useState(false);

  const [edgeOffset, setEdgeOffset] = useState(arrowShapes[shapes[0]].offsetForward);
  const [svgElem, setSvgElem] = useState(arrowShapes[shapes[0]].svgElem);
  const handleMenuSelectShape = (e) => {
    const selectedShape = e.target.value;
    setSelectedShape(selectedShape);
    update({ shape: selectedShape });
  };
  const onAdvOpen = () => {
    setAdv(true);
    update({ _adv: true });
  };
  const onAdvClose = () => {
    setAdv(false);
    update({ _adv: false });
  };
  const update = ({ shape = selectedShape, offsetForward = edgeOffset, _adv = adv, _svgElem = svgElem }) => {
    if (_adv) setEdgeShape({ ...arrowShapes[shape], offsetForward: offsetForward, svgElem: _svgElem });
    else setEdgeShape(shape);
  };

  return (
    <Div title={'arrow ' + edgeName}>
      <b>{edgeName}: </b>
      <p>show: </p>
      <input
        style={{ height: '15px', width: '15px' }}
        type="checkBox"
        checked={showEdge}
        onChange={(e) => {
          setShowEdge(e.target.checked);
        }}
      />
      <p> color: </p>
      <select style={{ marginRight: 10 }} onChange={(e) => setEdge(e.target.value)}>
        {bodyColorOptions.map((o, i) => (
          <option key={i}>{o}</option>
        ))}
      </select>
      <p>size: </p>
      <NumericInput value={edgeSize} onChange={(val) => setEdgeSize(val)} style={{ input: { width: 60 } }} />
      <p>shape: </p>
      <select onChange={handleMenuSelectShape}>
        {shapes.map((o, i) => (
          <option key={i}>{o}</option>
        ))}
      </select>

      <MyCollapsible title={'advanced'} onOpen={onAdvOpen} onClose={onAdvClose}>
        {/*<Div>*/}
        <p>{edgeName}Offset: </p>
        <NumericInput
          value={edgeOffset}
          onChange={(val) => {
            setEdgeOffset(val);
            update({ offsetForward: val });
          }}
          style={{ input: { width: 70 } }}
          step={0.01}
        />
        <p>shape: </p>
        <select
          onChange={({ target: { value } }) => {
            setSvgElem(value);
            update({ _svgElem: value });
          }}>
          {['circle', 'ellipse', 'line', 'path', 'polygon', 'polyline', 'rect'].map((o, i) => (
            <option key={i}>{o}</option>
          ))}
        </select>
        {/*</Div>*/}
      </MyCollapsible>
    </Div>
  );
};

const ArrowLabel = ({ labelName, label, setLabel }) => {
  return (
    <Div>
      <p>{labelName} label:</p>
      <input style={{ width: '120px' }} type="text" value={label} onChange={(e) => setLabel(e.target.value)} />
    </Div>
  );
};

const CustomizeArrow = () => {
  const [, setRender] = useState({});
  const forceRerender = () => setRender({});

  const [showMe, setShowMe] = useState(true);

  const box = {
    id: 'box1',
    x: 20,
    y: 20,
    ref: useRef(null),
  };

  const box2 = {
    id: 'box2',
    x: 70,
    y: 120,
    ref: useRef(null),
  };

  const [color, setColor] = useState('red');
  const [lineColor, setLineColor] = useState(null);
  const [showArrow, setShowArrow] = useState(true);
  const [showHead, setShowHead] = useState(true);
  const [headColor, setHeadColor] = useState(null);
  const [headSize, setHeadSize] = useState(6);
  const [showTail, setShowTail] = useState(false);
  const [tailColor, setTailColor] = useState(null);
  const [tailSize, setTailSize] = useState(6);
  const [curveness, setCurveness] = useState(0.8);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [startAnchor, setStartAnchor] = useState(['right']);
  const [endAnchor, setEndAnchor] = useState(['left']);
  const [dashed, setDashed] = useState(false);
  const [animation, setAnimation] = useState(1);
  const [path, setPath] = useState('smooth');
  const [startLabel, setStartLabel] = useState('');
  const [middleLabel, setMiddleLabel] = useState('');
  const [endLabel, setEndLabel] = useState('');
  const [_extendSVGcanvas, setExtendSVGcanvas] = useState(200);
  const [_debug, set_Debug] = useState(true);
  const [animateDrawing, setAnimateDrawing] = useState(1);
  const [_pathMargin, set_pathMargin] = useState(20);
  const [enableAnimateDrawing, setEnableAnimateDrawing] = useState(false);
  const _animateDrawing = enableAnimateDrawing ? animateDrawing : false;
  const [headShape, setHeadShape] = useState(Object.keys(arrowShapes)[0]);
  const [tailShape, setTailShape] = useState(Object.keys(arrowShapes)[1]);

  const [startFacingDir, setStartFacingDir] = useState(['auto']);
  const [endFacingDir, setEndFacingDir] = useState(['auto']);
  // const [headOffset, setHeadOffset] = useState(0.25);
  // const [tailOffset, setTailOffset] = useState(0.25);

  /////////////////////////////////////////////////
  //  IMPORTANT
  // this is the important part of this example. make sure to understand the props passed to xarrow
  // play with the props directly to understand better the API options
  const props = {
    start: 'box1', //  can be string
    end: box2.ref, //  or reference
    startAnchor: startAnchor.map((an) => ({ position: an, facingDir: startFacingDir })),
    endAnchor: endAnchor.map((an) => ({ position: an, facingDir: endFacingDir })),
    curveness: Number(curveness),
    color: color,
    lineColor: lineColor,
    strokeWidth: Number(strokeWidth),
    dashness: dashed ? { animation: Number(animation) } : false,
    path: path,
    showHead: showHead,
    headColor: headColor,
    headSize: Number(headSize),
    headShape: headShape,
    tailShape: tailShape,
    showTail,
    tailColor,
    tailSize: Number(tailSize),
    label: {
      start: startLabel,
      middle: middleLabel,
      end: (
        <div
          style={{
            fontSize: '1.3em',
            fontFamily: 'fantasy',
            fontStyle: 'italic',
            color: 'purple',
          }}>
          {endLabel}
        </div>
      ),
    },
    _extendSVGcanvas,
    _debug,
    _pathMargin,
    animateDrawing: _animateDrawing,
    gridBreak: '50%',
  };
  /////////////////////////////////////////////////

  return (
    <div>
      <h3>
        <u>Example2:</u>
      </h3>
      <p>
        {' '}
        This example shows some of the main API options. give the arrow diffrent properties to customize his look. note
        that some options are cannot be changed though this GUI(like custom lables or advande dashness and more) play
        with them directly at this codesandbox!.
      </p>

      {/*<button onClick={() => setShowMe(!showMe)}>toggle</button>*/}
      {showMe ? (
        <div>
          <CollapsibleDiv title={'anchors'}>
            <TitledCheckList
              title={'startAnchor'}
              values={startAnchor}
              setValues={setStartAnchor}
              titlesList={tAnchorEdge}
            />
            <TitledCheckList title={'endAnchor'} values={endAnchor} setValues={setEndAnchor} titlesList={tAnchorEdge} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex' }}>
                <TitledCheckList
                  title={'startFaceDirs'}
                  values={startFacingDir}
                  setValues={setStartFacingDir}
                  titlesList={tFacingDir}
                />
                <TitledCheckList
                  title={'endFaceDirs'}
                  values={endFacingDir}
                  setValues={setEndFacingDir}
                  titlesList={tFacingDir}
                />
              </div>
              <div>
                <p>_pathMargin: </p>
                <NumericInput
                  value={_pathMargin}
                  onChange={(val) => set_pathMargin(val)}
                  style={{ input: { width: 60 } }}
                />
              </div>
            </div>
          </CollapsibleDiv>
          <MyCollapsible title={'arrow appearance'} open={true}>
            <Div>
              <p>arrow color(all): </p>
              <select style={{ height: '20px', marginRight: 10 }} onChange={(e) => setColor(e.target.value)}>
                {colorOptions.map((o, i) => (
                  <option key={i}>{o}</option>
                ))}
              </select>
              <p>line color: </p>
              <select onChange={(e) => setLineColor(e.target.value)}>
                {bodyColorOptions.map((o, i) => (
                  <option key={i}>{o}</option>
                ))}
              </select>
              <p>strokeWidth: </p>
              <NumericInput
                value={strokeWidth}
                onChange={(val) => setStrokeWidth(val)}
                style={{ input: { width: 60 } }}
              />
            </Div>
            <Div>
              <p>curveness: </p>
              <NumericInput
                value={curveness}
                onChange={(val) => setCurveness(val)}
                step={0.1}
                style={{ input: { width: 60 } }}
              />
              <p>animation: </p>
              <NumericInput value={animation} onChange={(val) => setAnimation(val)} style={{ input: { width: 60 } }} />
              <p>dashed: </p>
              <input
                style={{ height: '15px', width: '15px' }}
                type="checkBox"
                checked={dashed}
                onChange={(e) => setDashed(e.target.checked)}
              />
              <p>path: </p>
              <select onChange={(e) => setPath(e.target.value)}>
                {['smooth', 'grid', 'straight'].map((o, i) => (
                  <option key={i}>{o}</option>
                ))}
              </select>
            </Div>
            <ArrowEdge
              edgeName={'head'}
              setEdge={setHeadColor}
              edgeSize={headSize}
              setEdgeSize={setHeadSize}
              showEdge={showHead}
              setShowEdge={setShowHead}
              // edgeOffset={headOffset}
              // setEdgeOffset={setHeadOffset}
              edgeShape={headShape}
              setEdgeShape={setHeadShape}
            />
            <ArrowEdge
              edgeName={'tail'}
              setEdge={setTailColor}
              edgeSize={tailSize}
              setEdgeSize={setTailSize}
              showEdge={showTail}
              setShowEdge={setShowTail}
              // edgeOffset={tailOffset}
              // setEdgeOffset={setTailOffset}
              edgeShape={tailShape}
              setEdgeShape={setTailShape}
            />
            <Div>
              <p>show arrow: </p>
              <input
                style={{ height: '15px', width: '15px' }}
                type="checkBox"
                checked={showArrow}
                onChange={(e) => {
                  setShowArrow(e.target.checked);
                }}
              />
              <p>animateDrawing(secs): </p>
              <input
                style={{ height: '15px', width: '15px' }}
                type="checkBox"
                checked={enableAnimateDrawing}
                onChange={(e) => {
                  setEnableAnimateDrawing(e.target.checked);
                }}
              />
              <NumericInput
                value={animateDrawing}
                onChange={(val) => setAnimateDrawing(val)}
                style={{ input: { width: 60 } }}
                step={0.2}
              />
            </Div>
          </MyCollapsible>

          <CollapsibleDiv title={'labels'}>
            <ArrowLabel labelName={'start'} label={startLabel} setLabel={setStartLabel} />
            <ArrowLabel labelName={'middle'} label={middleLabel} setLabel={setMiddleLabel} />
            <ArrowLabel labelName={'end'} label={endLabel} setLabel={setEndLabel} />
          </CollapsibleDiv>

          <MyCollapsible title={'advanced'}>
            <Div>
              <p>_extendSVGcanvas: </p>
              <NumericInput
                value={_extendSVGcanvas}
                onChange={(val) => setExtendSVGcanvas(val)}
                style={{ input: { width: 70 } }}
              />
              <p>_debug</p>
              <input
                style={{ height: '15px', width: '15px' }}
                type="checkBox"
                checked={_debug}
                // value={}
                onChange={(e) => {
                  set_Debug(e.target.checked);
                }}
              />
            </Div>
          </MyCollapsible>
          <br />
          <div style={canvasStyle} id="canvas">
            <Box box={box} forceRerender={forceRerender} />
            <Box box={box2} forceRerender={forceRerender} />
            {showArrow ? <Xarrow {...props} /> : null}
          </div>
          {/*/!* todo: add generated code preview *!/ */}
          {/*<pre>*/}
          {/*  <code className="jsx">&lt;Xarrow {}/&gt;</code>*/}
          {/*</pre>*/}
        </div>
      ) : null}
    </div>
  );
};

export default CustomizeArrow;
