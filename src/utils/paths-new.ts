// @ts-ignore
import { number } from 'prop-types';
import pick from 'lodash.pick';

// type VectType = Vector|DVector
const operatorFunc = (p: Vector, p2: Vector | number, operator) => {
  let _p2;
  if (typeof p2 === 'number') _p2 = { x: p2, y: p2 };
  else _p2 = p2;
  return new Vector(operator(p.x, _p2.x), operator(p.y, _p2.y), p.faceDir);
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
  faceDir: Dir;

  constructor(x: number | Vector, y?: number | Dir, faceDir?: Dir) {
    if (x instanceof Vector) {
      this.x = x.x;
      this.y = x.y;
      this.faceDir = x.faceDir;
      if (y instanceof Dir) this.faceDir = y;
      else if (typeof y === 'number') throw Error('illegal');
    } else {
      this.x = x;
      this.y = y as number;
      this.faceDir = faceDir;
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
  setDir = (d: Dir) => new Vector(this, d);

  // adding a constant or a vector in self direction
  addInDir = (num: number | Vector) => this.add(this.faceDir.mul(num));

  parallel = (v: Vector) => this.faceDir.abs().eq(v.faceDir.abs());
  orthogonal = (v: Vector) => this.faceDir.mul(v.faceDir).absSize() === 0;
}

/**
 * normalized direction
 */
class Dir extends Vector {
  // @ts-ignore
  constructor(xDiff: number | Vector, yDiff?: number) {
    if (xDiff instanceof Vector) [xDiff, yDiff] = [xDiff.x, xDiff.y];
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
  // vectors: Vector[] = [];
  // add = (...vs: Vector[]) => {
  //   this.vectors.push(...vs);
  //   return this;
  // };
  // root: Vector;
  //
  // constructor(...vectors: Vector[]) {
  //   super();
  //   this.add(...vectors);
  //   // this.lines.push(...vectors);
  // }
  toList = () => this.map((v) => [v.x, v.y]);
  rev = () => new VectorArr(...this.reverse());

  print = () => `Vector ${this.map((v) => `[${[v.x, v.y]}]`)}`;
}

const getVectors = (sv: Vector, ev: Vector) => {
  // v - vector
  // f - forward - in the parallel direction to start towards the end point
  // r - right(or left,relative) - the orthogonal direction to f towards the end point
  // d - direction

  let vse = ev.sub(sv);
  let fd = new Dir(sv.faceDir.mul(vse.abs()));
  let fv = fd.mul(vse);
  let rv = vse.sub(fv);
  let rd = new Dir(rv);
  return [fv, fd, rv, rd] as const;
};

const handleMargin = (grid: SmartGrid) => {
  let _pathMargin = pathMargin;
  let [sv, ev] = grid.getEdges();
  let [fv, fd, rv, rd] = getVectors(sv, ev);

  // if the target point is exactly behind the source point
  if (rv.absSize() === 0 && sv.faceDir.eq(ev.faceDir.reverse())) {
    // console.log('exactly behind!');

    rd = sv.faceDir.mirror();

    // grid.pushSource(sv.add(sv.addInDir(_pathMargin)).setDir(sv.faceDir.mirror()));
    // sv = grid.getSource();
    // [fv, fd, rv, rd] = getVectors(sv, ev);

    // return [sv.add(sv.addInDir(_pathMargin)).setDir(sv.faceDir.mirror()), ev];
  }

  // add start margin
  if (sv.faceDir.reverse().eq(fd)) {
    console.log('start margin because reverse');
    grid.pushSource(sv.add(sv.faceDir.mul(_pathMargin)).setDir(rd));
    sv = grid.getSource();
    [fv, fd, rv, rd] = getVectors(sv, ev);
  }
  if (fv.absSize() < _pathMargin) {
    console.log('start margin because small');
    // grid.pushSource(sv.add(sv.faceDir.mul(_pathMargin - fv.absSize())).setDir(rd));
    let svNext = sv.addInDir(_pathMargin).setDir(rd);
    // [fv, fd, rv, rd] = getVectors(svNext, ev);
    // // if the target point is closer then _pathMargin from vNext add more margin so the line would become r curve instead of z on next run
    // let NextNextDiff = ev.sub(svNext).mul(lped).absSize();
    // if (NextNextDiff < _pathMargin) {
    //   svNext = svNext.add(sv.faceDir.mul(_pathMargin - NextNextDiff));
    // }

    grid.pushSource(svNext);
    sv = grid.getSource();
    [fv, fd, rv, rd] = getVectors(sv, ev);
    // return [sv.add(sv.faceDir.mul(_pathMargin - fv.absSize())).setDir(rd), ev, false];
  }

  // add end margin
  let [epd, eod] = fd.abs().eq(ev.abs()) ? [fd, rd] : [rd, fd];
  if (ev.faceDir.eq(fd.reverse()) || ev.faceDir.eq(rd.reverse())) {
    console.log('end margin because reverse');
    grid.pushTarget(ev.add(ev.faceDir.reverse().mul(_pathMargin)).setDir(eod));
    sv = grid.getTarget();
    [fv, fd, rv, rd] = getVectors(sv, ev);

    // return [sv, ev.add(epd.mul(_pathMargin)).setDir(eod)];
  }
  if (rv.absSize() < _pathMargin) {
    console.log('end margin because small');
    grid.pushTarget(ev.add(ev.faceDir.reverse().mul(_pathMargin)).setDir(eod));
    // return [sv, ev.add(ev.faceDir.reverse().mul(_pathMargin)).setDir(eod), false];
  }
};

const drawToTarget = (grid: SmartGrid): void => {
  // s - start
  // e - end
  // p - parallel
  // o - orthogonal

  let [sv, ev] = grid.getEdges();
  let [fv, fd, rv, rd] = getVectors(sv, ev);

  if (sv.faceDir.x != 0 && sv.faceDir.y != 0)
    console.warn('sv.faceDir.x=', sv.faceDir.x, 'sv.faceDir.y=', sv.faceDir.y);

  // if the target point is directly in front of the source target then connect
  if (rv.absSize() === 0 && sv.faceDir.eq(ev.faceDir) && sv.faceDir.eq(fd)) {
    console.log('path connected');
    // grid.pushSource(ev);
    return;
    // return [ev, ev];
  }
  // let [lped, loed] = ev.faceDir.absEq(lred) ? [lred, lfed] : [lfed, lred];
  // let [epd, eod] = fd.abs().eq(ev.abs()) ? [fd, rd] : [rd, fd];

  if (sv.faceDir.eq(ev.faceDir)) {
    console.log('Z curve');
    grid.pushSource(sv.add(fv.dev(2)).setDir(rd));
    return drawToTarget(grid);
    // return [sv.add(vf.dev(2)).setDir(lred), ev, false];
  }

  // its r curve
  console.log('r curve');
  grid.pushSource(sv.addInDir(fv.abs()).setDir(rd));

  return drawToTarget(grid);
  // return [sv.addInDir(fv).setDir(rd), ev];

  // let _pathMargin = pathMargin;
  // let l = new Line(sv, ev);
  // // if ((l.dir().x == 0 || l.dir().y == 0) && sv.faceDir.eq(ev.faceDir)) return [ev, ev];
  // let vse = l.diff(); // the vector from s to e
  // let dfe = new Dir(sv.faceDir.abs().mul(vse));
  // let vf = sv.faceDir.mul(vse.abs()); // the forward vector from the arrow point of view(takes into account everthing)
  // let vr = vse.sub(sv.faceDir.abs().mul(vse));
  // let vfe = sv.faceDir.abs().mul(vse); // forward parallel to start dir at the direction for target point
  // let lf = new Line(sv, sv.add(vf));
  // let lr = new Line(sv, sv.add(vr));
  // let lfe = new Line(sv, sv.add(vfe));
  // let lre = lr;
  // let lfd = lf.dir(),
  //   lrd = lr.dir();
  // if (lrd.absSize() === 0) lrd = lfd.mirror();
  // let lfed = lfe.dir(),
  //   lred = lrd;
  //
  // let absVf = vf.abs();
  // let absVr = vr.abs();
  //
  // if (vf.absSize() == 0) {
  //   //for the case there is no orthogonal distance to travel which means the target point is exactly ahead of beyond the source point
  //   console.log('sideways margin');
  //   // return [sv.add(ev.faceDir.reverse().mul(_pathMargin)).setDir(lrd), ev];
  //   return [sv.add(vse.dir().mirror().abs().mul(_pathMargin)).setDir(lrd), ev];
  // }
  //
  // // stop condition - if the arrow facing the direction it should go and there is no orthogonal distance to travel
  // if (lr.diff().absSize() === 0 && sv.faceDir.eq(ev.faceDir) && sv.faceDir.eq(l.dir())) {
  //   console.log('path connected');
  //   return [ev, ev];
  // }
  //
  // if (margin) {
  //   //choose line parallel to end line direction for later
  //   let [lped, loed] = ev.faceDir.absEq(lred) ? [lred, lfed] : [lfed, lred];
  //   if (sv.faceDir.eq(dfe.reverse())) {
  //     if (sv.faceDir.mul(vse).size() < _pathMargin) {
  //       // start margin because reverse direction
  //       console.log('start margin because reverse');
  //       return [sv.add(sv.faceDir.mul(_pathMargin)).setDir(lred), ev];
  //     }
  //     // } else if (sv.faceDir.mul(vf.size()).size() < _pathMargin) {
  //   } else if (dfe.mul(vf).absSize() < _pathMargin) {
  //     // start margin because a forward direction to small
  //     console.log('start margin because small');
  //     let svNext = sv.add(sv.faceDir.mul(_pathMargin)).setDir(lred);
  //     // if the target point is closer then _pathMargin from vNext add more margin so the line would become r curve instead of z on next run
  //     let NextNextDiff = ev.sub(svNext).mul(lped).absSize();
  //     if (NextNextDiff < _pathMargin) {
  //       svNext = svNext.add(sv.faceDir.mul(_pathMargin - NextNextDiff));
  //     }
  //     // ev.sub(vNext).mul(lped).absSize();
  //     return [svNext, ev];
  //   }
  //
  //   // point the next point to be margin on target
  //   // if (ev.faceDir.eq(lped.reverse()) && vr.size() < _pathMargin) {
  //   if (ev.faceDir.eq(lped.reverse()) || lr.diff().absSize() < _pathMargin) {
  //     console.log('end margin');
  //     return [ev.add(ev.faceDir.mul(_pathMargin)).setDir(loed), ev];
  //   }
  //   // else if (lr.diff().absSize() < _pathMargin) {
  //   //   console.log('end margin because small');
  //   //   let evNext = ev.add(ev.faceDir.reverse().mul(_pathMargin)).setDir(loed);
  //   //   return [sv, evNext, false];
  //   // }
  // }
  //
  // // if start point direction is the same as end point direction then it's a Z curve
  // if (sv.faceDir.eq(ev.faceDir)) {
  //   console.log('Z curve');
  //   return [sv.add(vf.dev(2)).setDir(lred), ev, false];
  // }
  //
  // //else its a normal 90 grid break at the end of current direction (r curve)
  // console.log('r curve');
  // return [sv.add(sv.faceDir.mul(absVf)).setDir(lred), ev];
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

  const smartGrid = new SmartGrid(new Vector(sp, sdd), new Vector(ep, edd));
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
    // let sp = new Vector(0, 0),
    //   ep = new Vector(10, 100);
    // let sp = new Vector(150, 50),
    //   ep = new Vector(100, 150);
    let sp = new Vector(980, 1100),
      ep = new Vector(1000, 1000);

    let points = calcSmartPath(sp, 'right', ep, 'top');
    console.log(points);
  };
  testZ();
};
if (require.main === module) {
  test();
} else {
}
// test();
