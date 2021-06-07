// @ts-ignore
import { number } from 'prop-types';
import pick from 'lodash.pick';
import { _faceDirType, anchorEdgeType, anchorNamedType } from '../types';

// type VectType = Vector|DVector
const operatorFunc = (p: Vector, p2: Vector | number, operator) => {
  let _p2;
  if (typeof p2 === 'number') _p2 = { x: p2, y: p2 };
  else _p2 = p2;
  return new Vector(operator(p.x, _p2.x), operator(p.y, _p2.y), p.faceDirs);
};

const operators = {
  add: (x, y) => x + y,
  sub: (x, y) => x - y,
  mul: (x, y) => x * y,
  dev: (x, y) => x / y,
};

// const pathMargin = 15;

export class Vector {
  x: number;
  y: number;
  faceDirs: Dir[];

  constructor(x: number | Vector, y?: number | Dir[], faceDir?: Dir[]) {
    if (x instanceof Vector) {
      this.x = x.x;
      this.y = x.y;
      this.faceDirs = x.faceDirs;
      if (Array.isArray(y)) this.faceDirs = y;
      else if (typeof y === 'number') throw Error('illegal');
    } else {
      this.x = x;
      this.y = y as number;
      this.faceDirs = faceDir;
    }
  }

  eq = (p: Vector) => p.x === this.x && p.y === this.y;

  add = (p: Vector | number) => operatorFunc(this, p, operators.add);
  sub = (p: Vector | number) => operatorFunc(this, p, operators.sub);
  mul = (p: Vector | number) => operatorFunc(this, p, operators.mul);
  dev = (p: Vector | number) => operatorFunc(this, p, operators.dev);

  absSize = () => Math.sqrt(this.x ** 2 + this.y ** 2);
  size = () => this.x + this.y;
  abs = () => new Vector(Math.abs(this.x), Math.abs(this.y));

  dir = () => new Dir(this.x, this.y);
  setDirs = (d: Dir[]) => new Vector(this, d);
}

/**
 * normalized direction
 */
class Dir extends Vector {
  // @ts-ignore
  constructor(xDiff: number | Vector, yDiff?: number) {
    if (xDiff instanceof Vector) [xDiff, yDiff] = [xDiff.x, xDiff.y];
    if (typeof xDiff === 'number' && typeof yDiff !== 'number') throw Error('second argument should be number');
    let m = Math.max(Math.abs(xDiff), Math.abs(yDiff));
    if (m == 0) m = 1;
    super(xDiff / m, yDiff / m);
    // this.x = xDiff / m;
    // this.y = yDiff / m;
  }

  reverse = () => new Dir(-this.x, -this.y);

  //replace direction of x and y
  mirror = () => new Dir(this.y, this.x);

  abs = () => new Dir(Math.abs(this.x), Math.abs(this.y));

  //mean that parallel
  absEq = (p: Vector) => Math.abs(p.x) === Math.abs(this.x) && Math.abs(p.y) === Math.abs(this.y);

  // eq = (p: Dir) => p.x === this.x && p.y === this.y;
}

/**
 * straight line
 */
class Line {
  root: Vector;
  end: Vector;

  constructor(start: Vector, end: Vector) {
    this.root = start;
    this.end = end;
  }

  xDiff = () => new Vector(this.end.x - this.root.x, 0);
  yDiff = () => new Vector(0, this.end.y - this.root.y);
  diff = () => new Vector(this.end.x - this.root.x, this.end.y - this.root.y);

  // note! this doesn't have to be direction on x or y exclusively
  dir = () => new Dir(this.end.x - this.root.x, this.end.y - this.root.y);
}

class VectorArr extends Array<Vector> {
  toList = () => this.map((v) => [v.x, v.y]);
  rev = () => new VectorArr(...this.reverse());

  print = () => `Vector ${this.map((v) => `[${[v.x, v.y]}]`)}`;
}

const filterDirs = (dirs: Dir[], allowedDirs: Dir[]) => {
  let pass: Dir[] = [],
    fail: Dir[] = [];
  let currentPass;
  for (let d of dirs) {
    currentPass = false;
    for (let allowedDir of allowedDirs) {
      if (allowedDir.eq(d)) {
        pass.push(d);
        currentPass = true;
      }
    }
    if (!currentPass) fail.push(d);
  }
  return [pass, fail] as const;
};

const handleMargin = (grid: SmartGrid, pathMargin: number) => {
  let [sv, ev] = grid.getEdges();
  if (sv.eq(ev)) return;
  let vse = ev.sub(sv);
  let xd = new Dir(new Vector(vse.x, 0));
  let yd = new Dir(new Vector(0, vse.y));

  if (xd.absSize() === 0) xd = yd.mirror();
  if (yd.absSize() === 0) yd = xd.mirror();

  // the dirs inwards the rectangle that connects the 2 points
  let [svDirsIn, svDirsOut] = filterDirs(sv.faceDirs, [xd, yd]);
  let [evDirsIn, evDirsOut] = filterDirs(ev.faceDirs, [xd, yd]);

  // chose(arbitrary) the first allowed dir
  let svDir = sv.faceDirs[0];
  let evDir = ev.faceDirs[0];

  // let vf = svDir.abs().mul(vse);
  // let vr = vse.sub(vf);
  //
  // //direction and vectors of rectangle
  // let svf = svDir.mul(vf.absSize());
  // let svr = vse.sub(svf);
  // let sdf = new Dir(svf);
  // let sdr = new Dir(svr);
  //
  // let evf = evDir.mul(vf.absSize());
  // let evr = vse.sub(evf);
  // let edf = new Dir(evf);
  // let edr = new Dir(evr);

  //direction and vectors of rectangle
  let svf = svDir.mul(vse.abs());
  let svr = vse.sub(svf);
  let sdf = new Dir(svf);
  let sdr = new Dir(svr);

  let evf = evDir.mul(vse.abs());
  let evr = vse.sub(evf); //todo: maybe vse.sub(evf.abs())
  let edf = new Dir(evf);
  let edr = new Dir(evr);

  if (svDirsIn.length === 0) {
    console.log('start because outside');
    // if(svDir.absSize()===0)svDir
    let dirs = [xd, yd].filter((d) => !d.reverse().eq(svDir));
    grid.pushSource(sv.add(svDir.mul(pathMargin)).setDirs(dirs));
    return handleMargin(grid, pathMargin);
  }

  if (evDirsIn.length === 0) {
    console.log('end because outside');
    let dirs = [xd, yd].filter((d) => !d.reverse().eq(evDir));
    grid.pushTarget(ev.sub(evDir.mul(pathMargin)).setDirs(dirs));
    return handleMargin(grid, pathMargin);
  }

  if (svDir.eq(evDir) || !(svf.absSize() < pathMargin && evf.absSize() < pathMargin)) {
    let factor = 1;
    if (svDir.eq(evDir)) factor = 2;
    if (svf.absSize() < pathMargin * factor) {
      console.log('start because small');
      grid.pushSource(sv.add(svDir.mul(pathMargin)).setDirs([sdr]));
    }
    if (evf.absSize() < pathMargin * factor) {
      console.log('end because small');
      grid.pushTarget(ev.sub(evDir.mul(pathMargin)).setDirs([edr]));
    }
  }
};

const drawToTarget = (grid: SmartGrid): void => {
  // s - start
  // e - end
  // p - parallel
  // o - orthogonal

  let [sv, ev] = grid.getEdges();
  if (sv.eq(ev)) return;
  let vse = ev.sub(sv);
  let xd = new Dir(new Vector(vse.x, 0));
  let yd = new Dir(new Vector(0, vse.y));

  if (xd.absSize() === 0) xd = yd.mirror();
  if (yd.absSize() === 0) yd = xd.mirror();

  // the dirs inwards the rectangle that connects the 2 points
  let svDirs = filterDirs(sv.faceDirs, [xd, yd]);
  let evDirs = filterDirs(ev.faceDirs, [xd, yd]);

  // chose(arbitrary) the first allowed dir
  let svDir = sv.faceDirs[0];
  let evDir = ev.faceDirs[0];

  //direction and vectors of rectangle
  let svf = svDir.mul(vse.abs());
  let svr = vse.sub(svf);
  let sdf = new Dir(svf);
  let sdr = new Dir(svr);

  //here the direction of svDir and evDir will always be inwards the rectangle

  if (svr.absSize() === 0 && svDir.eq(evDir) && svDir.eq(sdf)) {
    console.log('path connected');
    return;
  }
  if (svDir.eq(evDir)) {
    console.log('Z curve');
    let svNext = sv.add(svf.dev(2));
    grid.pushSource(svNext);
    grid.pushSource(svNext.add(svr).setDirs([sdf]));
    return drawToTarget(grid);
  }
  grid.pushSource(sv.add(svf).setDirs([sdr]));
  console.log('r curve');
  return drawToTarget(grid);
};

type sidesType = 'top' | 'right' | 'bottom' | 'left';

const dirs = {
  up: new Dir(0, -1),
  right: new Dir(1, 0),
  down: new Dir(0, 1),
  left: new Dir(-1, 0),
} as const;

export const SAD = {
  top: 'up',
  right: 'right',
  bottom: 'down',
  left: 'left',
} as const;
export const EAD = {
  top: 'down',
  right: 'left',
  bottom: 'up',
  left: 'right',
} as const;

const checkPath = (vse: Vector, svDirs: Dir[], evDirs: Dir[], conditionFunc: condFuncType) => {
  for (let svD of svDirs) {
    for (let evD of evDirs) {
      // the rectangle vectors and dirs
      let vf = svD.abs().mul(vse);
      let vr = vse.sub(vf);
      let df = new Dir(vf);
      let dr = new Dir(vr);
      if (conditionFunc(svD, evD, vf, vr, df, dr)) return [svD, evD] as const;
    }
  }
  return null;
};
const getVectors = (v, vse) => {
  let vf = v.mul(vse.abs());
  let vr = vse.sub(vf);
  let df = new Dir(vf);
  let dr = new Dir(vr);
  return [vf, vr, df, dr];
};

type condFuncType = (d1: Dir, d2: Dir, vf: Vector, vr: Vector, df: Dir, dr: Dir) => boolean;

const chooseSimplestPath = (sv: Vector, ev: Vector): [Dir[], Dir[]] => {
  let vse = ev.sub(sv);

  // the rectangle vectors and dirs
  let vf = sv.faceDirs[0].abs().mul(vse);
  let vr = vse.sub(vf);
  let df = new Dir(vf);
  let dr = new Dir(vr);

  // the dirs inwards the rectangle that connects the 2 points
  let [svDirsIn, svDirsOut] = filterDirs(sv.faceDirs, [df, dr]);
  let [evDirsIn, evDirsOut] = filterDirs(ev.faceDirs, [df, dr]);

  if (svDirsIn.length === 1 && evDirsIn.length === 1) return [svDirsIn, evDirsIn];

  let svDirs: Dir[];
  let evDirs: Dir[];

  // todo: choose connect to end from right if possible

  if (svDirsIn.length === 0) svDirs = svDirsOut;
  else svDirs = svDirsIn;
  if (evDirsIn.length === 0) evDirs = evDirsOut;
  else evDirs = evDirsIn;

  // prefer r curve if exists (over more complicated path like z or adding margin)
  for (let svDir of svDirs) {
    for (let evDir of evDirs) {
      if (svDir.abs().eq(evDir.mirror().abs())) {
        // console.log('r chosen!', svDir, evDir);
        return [[svDir], [evDir]];
      }
    }
  }
  return [svDirs, evDirs];

  // // chose simplest possible path
  // let svDir: Dir;
  // let evDir: Dir;
  //
  // let result: readonly [Dir, Dir];
  // const _checkPath = (conditionFunc: condFuncType) => checkPath(vse, svDirsIn, evDirsIn, conditionFunc);
  // // r curve
  // result = _checkPath((svD, evD, vf, vr, df, dr) => svD.eq(df) && evD.eq(dr) && vf.absSize() >= pathMargin);
  // // z curve
  // if (result === null) {
  //   result = _checkPath((svD, evD, vf, vr, df, dr) => svD.eq(evD) && svD.eq(df) && vf.absSize() >= pathMargin);
  // }
  // // small margin
  // if (result === null) {
  //   // result = _checkPath((svD, evD, vf, vr, df, dr) => vf.absSize() < pathMargin);
  //   // result = _checkPath((svD, evD, vf, vr, df, dr) => vf.absSize() < pathMargin);
  // }
  //
  // return result as [Dir, Dir];
};

class SmartGrid {
  private starts: VectorArr = new VectorArr();
  private ends: VectorArr = new VectorArr();

  constructor(sv: Vector, ev: Vector, rects: Rectangle[], pathMargin) {
    let [sd, ed] = chooseSimplestPath(sv, ev);
    this.starts.push(sv.setDirs(sd));
    this.ends.push(ev.setDirs(ed));
    handleMargin(this, pathMargin);
    drawToTarget(this);

    // while (!lastCur.eq(lastTar)) {
    //   let [cur, tar, doMargin] = drawToTarget(this);
    //   margin = doMargin;
    //   if (cur.eq(tar)) return;
    //   if (!cur.eq(lastCur)) this.pushSource(cur);
    //   if (!tar.eq(lastTar)) this.pushTarget(tar);
    //   [lastCur, lastTar] = this.getEdges();
    // }
  }

  getSource = () => this.starts[this.starts.length - 1];
  getTarget = () => this.ends[this.ends.length - 1];
  getEdges = () => [this.getSource(), this.getTarget()];

  pushSource = (v: Vector) => {
    this.starts.push(v);
    return v;
  };
  pushTarget = (v: Vector) => {
    this.ends.push(v);
    return v;
  };

  getPoints = () => [...this.starts.toList(), ...this.ends.rev().toList()];
}

let side2dict = { outwards: SAD, inwards: EAD };
export const points2Vector = (
  x1: number,
  y1: number,
  anchorName: anchorNamedType,
  dirNames: Exclude<_faceDirType, 'auto'>[]
): Vector => {
  let sd: Dir[];
  //if middle all dirs allowed
  let _dirNames: Exclude<_faceDirType, 'auto'>[];
  if (anchorName === 'middle') _dirNames = Object.keys(dirs) as Array<keyof typeof dirs>;
  else
    _dirNames = dirNames.map((dirName) => {
      if (dirName === 'inwards') return EAD[anchorName];
      else if (dirName === 'outwards') return SAD[anchorName];
      else return dirName;
    });
  sd = _dirNames.map((dirName) => dirs[dirName]);
  return new Vector(x1, y1, sd);
  // return [new Vector(x1, y1, sd), new Vector(x2, y2, ed)];
};
// export const points2Vectors = (
//   x1: number,
//   y1: number,
//   x2: number,
//   y2: number,
//   startAnchor: anchorNamedType,
//   endAnchor: anchorNamedType
// ): [Vector, Vector] => {
//   let sd: Dir[], ed: Dir[];
//   //if middle all dirs allowed
//   if (startAnchor === 'middle') sd = Object.values(dirs);
//   else sd = dirs[SAD[startAnchor]];
//   if (endAnchor === 'middle') sd = Object.values(dirs);
//   else ed = dirs[EAD[startAnchor]];
//   return [new Vector(x1, y1, sd), new Vector(x2, y2, ed)];
// };

export const calcSmartPath = (sp: Vector, ep: Vector, rects: Rectangle[], pathMargin) => {
  const smartGrid = new SmartGrid(sp, ep, rects, pathMargin);
  const points = smartGrid.getPoints();
  // console.log(points);
  return points;
};

class Rectangle {
  left: Line;
  top: Line;
  right: Line;
  bottom: Line;

  constructor(leftTop: Vector, rightBottom: Vector) {
    this.left = new Line(leftTop, new Vector(leftTop.x, rightBottom.y));
    this.top = new Line(leftTop, new Vector(rightBottom.x, leftTop.y));
    this.right = new Line(new Vector(rightBottom.x, leftTop.y), rightBottom);
    this.bottom = new Line(new Vector(leftTop.x, rightBottom.y), rightBottom);
  }
}

const test = () => {
  const testZ = () => {
    // let sp = new Vector(980, 1100),
    //   ep = new Vector(1000, 1000);
    let sp = new Vector(1000, 1000),
      ep = new Vector(1100, 990);
    let sd = [dirs['right']],
      ed = [dirs['up'], dirs['down'], dirs['right']];
    // let points = calcSmartPath(sp, 'right', ep, 'top');
    const points = new SmartGrid(new Vector(sp, sd), new Vector(ep, ed), [], 15).getPoints();
    console.log(points);
  };
  testZ();
};

const testPoints2Vector = () => {
  console.log(points2Vector(1000, 1000, 'top', ['inwards', 'left']));
};

if (require.main === module) {
  // test();
  testPoints2Vector();
} else {
}
// test();
