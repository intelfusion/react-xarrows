// @ts-ignore
import { number } from 'prop-types';
import pick from 'lodash.pick';

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

const pathMargin = 15;

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

// const getVectors = (sv: Vector, ev: Vector) => {
//   // v - vector
//   // f - forward - in the parallel direction to start towards the end point
//   // r - right(or left,relative) - the orthogonal direction to f towards the end point
//   // d - direction
//
//   let vse = ev.sub(sv);
//   let fd = new Dir(sv.faceDirs.mul(vse.abs()));
//   let fv = fd.mul(vse);
//   let rv = vse.sub(fv);
//   let rd = new Dir(rv);
//   return [fv, fd, rv, rd] as const;
// };

// const handleMargin = (grid: SmartGrid) => {
//   let _pathMargin = pathMargin;
//   let [sv, ev] = grid.getEdges();
//   let [fv, fd, rv, rd] = getVectors(sv, ev);
//
//   // if the target point is exactly behind the source point
//   if (rv.absSize() === 0 && sv.faceDirs.eq(ev.faceDirs.reverse())) {
//     // console.log('exactly behind!');
//
//     rd = sv.faceDirs.mirror();
//
//     // grid.pushSource(sv.add(sv.addInDir(_pathMargin)).setDir(sv.faceDir.mirror()));
//     // sv = grid.getSource();
//     // [fv, fd, rv, rd] = getVectors(sv, ev);
//
//     // return [sv.add(sv.addInDir(_pathMargin)).setDir(sv.faceDir.mirror()), ev];
//   }
//
//   // add start margin
//   if (sv.faceDirs.reverse().eq(fd)) {
//     console.log('start margin because reverse');
//     grid.pushSource(sv.add(sv.faceDirs.mul(_pathMargin)).setDir(rd));
//     sv = grid.getSource();
//     [fv, fd, rv, rd] = getVectors(sv, ev);
//   }
//   if (fv.absSize() < _pathMargin) {
//     console.log('start margin because small');
//     // grid.pushSource(sv.add(sv.faceDir.mul(_pathMargin - fv.absSize())).setDir(rd));
//     let svNext = sv.addInDir(_pathMargin).setDir(rd);
//     // [fv, fd, rv, rd] = getVectors(svNext, ev);
//     // // if the target point is closer then _pathMargin from vNext add more margin so the line would become r curve instead of z on next run
//     // let NextNextDiff = ev.sub(svNext).mul(lped).absSize();
//     // if (NextNextDiff < _pathMargin) {
//     //   svNext = svNext.add(sv.faceDir.mul(_pathMargin - NextNextDiff));
//     // }
//
//     grid.pushSource(svNext);
//     sv = grid.getSource();
//     [fv, fd, rv, rd] = getVectors(sv, ev);
//     // return [sv.add(sv.faceDir.mul(_pathMargin - fv.absSize())).setDir(rd), ev, false];
//   }
//
//   // add end margin
//   let [epd, eod] = fd.abs().eq(ev.abs()) ? [fd, rd] : [rd, fd];
//   if (ev.faceDirs.eq(fd.reverse()) || ev.faceDirs.eq(rd.reverse())) {
//     console.log('end margin because reverse');
//     grid.pushTarget(ev.add(ev.faceDirs.reverse().mul(_pathMargin)).setDir(eod));
//     sv = grid.getTarget();
//     [fv, fd, rv, rd] = getVectors(sv, ev);
//
//     // return [sv, ev.add(epd.mul(_pathMargin)).setDir(eod)];
//   }
//   if (rv.absSize() < _pathMargin) {
//     console.log('end margin because small');
//     grid.pushTarget(ev.add(ev.faceDirs.reverse().mul(_pathMargin)).setDir(eod));
//     // return [sv, ev.add(ev.faceDir.reverse().mul(_pathMargin)).setDir(eod), false];
//   }
// };
const _filterDirs = (dirs: Dir[], allowedDirs: Dir[], func: CallableFunction) => {
  return dirs.filter((d) => {
    for (let allowedDir of allowedDirs) {
      if (func(d)) return true;
    }
    return false;
  });
};

const filterDirs = (dirs: Dir[], allowedDirs: Dir[]) => {
  return dirs.filter((d) => {
    for (let allowedDir of allowedDirs) {
      if (allowedDir.eq(d)) return true;
    }
    return false;
  });
};

const handleMargin = (grid: SmartGrid) => {
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

  if (svDirs.length === 0) {
    console.log('start because outside');
    // if(svDir.absSize()===0)svDir
    let dirs = [xd, yd].filter((d) => !d.reverse().eq(svDir));
    grid.pushSource(sv.add(svDir.mul(pathMargin)).setDirs(dirs));
    return handleMargin(grid);
  }

  let evf = evDir.mul(vse.abs());
  let evr = vse.sub(evf);
  let edf = new Dir(evf);
  let edr = new Dir(evr);
  if (evDirs.length === 0) {
    console.log('end because outside');
    let dirs = [xd, yd].filter((d) => !d.reverse().eq(evDir));
    grid.pushTarget(ev.sub(evDir.mul(pathMargin)).setDirs(dirs));
    return handleMargin(grid);
  }

  if (svDir.eq(evDir) || !(svf.absSize() < pathMargin && evf.absSize() < pathMargin)) {
    // if (!(svf.absSize() < pathMargin && evf.absSize() < pathMargin)) {
    let factor = 1;
    if (svDir.eq(evDir)) factor = 2;
    if (svf.absSize() < pathMargin * factor) {
      console.log('start because small');
      grid.pushSource(sv.add(svDir.mul(pathMargin)).setDirs([sdr]));
      return handleMargin(grid);
    }
    if (evf.absSize() < pathMargin * factor) {
      console.log('end because small');
      grid.pushTarget(ev.sub(evDir.mul(pathMargin)).setDirs([edr]));
      return handleMargin(grid);
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

  // for (let svDir of svDirs) {
  //   for (let evDir of evDirs) {
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
  console.log('r curve');
  // if (svf.absSize() < pathMargin) {
  //   svf = svf.add(sdf.mul(pathMargin - svf.absSize()));
  // }
  grid.pushSource(sv.add(svf).setDirs([sdr]));
  return drawToTarget(grid);

  //   }
  // }

  // let [fv, fd, rv, rd] = getVectors(sv, ev);
  //
  // if (sv.faceDirs.x != 0 && sv.faceDirs.y != 0)
  //   console.warn('sv.faceDir.x=', sv.faceDirs.x, 'sv.faceDir.y=', sv.faceDirs.y);
  //
  // // if the target point is directly in front of the source target then connect
  // if (rv.absSize() === 0 && sv.faceDirs.eq(ev.faceDirs) && sv.faceDirs.eq(fd)) {
  //   console.log('path connected');
  //   // grid.pushSource(ev);
  //   return;
  //   // return [ev, ev];
  // }
  // // let [lped, loed] = ev.faceDir.absEq(lred) ? [lred, lfed] : [lfed, lred];
  // // let [epd, eod] = fd.abs().eq(ev.abs()) ? [fd, rd] : [rd, fd];
  //
  // if (sv.faceDirs.eq(ev.faceDirs)) {
  //   console.log('Z curve');
  //   grid.pushSource(sv.add(fv.dev(2)).setDir(rd));
  //   return drawToTarget(grid);
  //   // return [sv.add(vf.dev(2)).setDir(lred), ev, false];
  // }
  //
  // // its r curve
  // console.log('r curve');
  // grid.pushSource(sv.addInDir(fv.abs()).setDir(rd));
  //
  // return drawToTarget(grid);
};

type sidesType = 'top' | 'right' | 'bottom' | 'left';

const dirs = {
  U: new Dir(0, -1),
  R: new Dir(1, 0),
  D: new Dir(0, 1),
  L: new Dir(-1, 0),
} as const;

const SAD = {
  top: 'U',
  right: 'R',
  bottom: 'D',
  left: 'L',
} as const;
const EAD = {
  top: 'D',
  right: 'L',
  bottom: 'U',
  left: 'R',
} as const;

class SmartGrid {
  private starts: VectorArr = new VectorArr();
  private ends: VectorArr = new VectorArr();

  constructor(sv: Vector, ev: Vector, rects: Rectangle[] = []) {
    this.starts.push(sv);
    this.ends.push(ev);
    handleMargin(this);
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

export const calcSmartPath = (sp: Vector, sd: sidesType, ep: Vector, ed: sidesType, rects: Rectangle[] = []) => {
  // start anchor direction
  let sdd = dirs[SAD[sd]];
  let edd = dirs[EAD[ed]];

  const smartGrid = new SmartGrid(new Vector(sp, [sdd]), new Vector(ep, [edd]));
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
    let sp = new Vector(1000, 980),
      ep = new Vector(1100, 1000);

    let points = calcSmartPath(sp, 'left', ep, 'right');
    console.log(points);
  };
  testZ();
};
if (require.main === module) {
  test();
} else {
}
// test();
