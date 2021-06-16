import { number } from 'prop-types';
import { _faceDirType, anchorNamedType } from '../types';
import pick from 'lodash.pick';

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

const deg2Rad = (deg: number) => (deg / 180) * Math.PI;
const roundTo = (num: number, level = 4) => parseFloat(num.toFixed(level));

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

  rotate = (deg) => {
    let rad = deg2Rad(deg);
    return new Vector(
      roundTo(this.x * Math.cos(rad) - this.y * Math.sin(rad)),
      roundTo(this.x * Math.sin(rad) + this.y * Math.cos(rad))
    );
  };
  // eq = (p: Dir) => p.x === this.x && p.y === this.y;
}

// receives a vector and returns direction unit
const fQ2 = (x, y) => {
  let ySign = y >= 0 ? 1 : -1;
  let xSqrt = Math.sqrt(x ** 2 + y ** 2);
  if (xSqrt == 0) return [0, 0];
  let xDir = x / xSqrt;
  let yDir = Math.sqrt(1 - xDir ** 2) * ySign;
  return [xDir, yDir];
};

/**
 * normalized direction
 */
class Dir extends Vector {
  // @ts-ignore
  constructor(xDiff: number | Vector, yDiff?: number) {
    if (xDiff instanceof Vector) [xDiff, yDiff] = [xDiff.x, xDiff.y];
    if (typeof xDiff === 'number' && typeof yDiff !== 'number') throw Error('second argument should be number');
    let [x, y] = fQ2(xDiff, yDiff);
    super(x, y);
  }

  reverse = () => new Dir(-this.x, -this.y);

  //replace direction of x and y
  mirror = () => new Dir(this.y, this.x);

  abs = () => new Dir(Math.abs(this.x), Math.abs(this.y));

  //mean that parallel directions
  absEq = (p: Vector) => Math.abs(p.x) === Math.abs(this.x) && Math.abs(p.y) === Math.abs(this.y);

  toDegree = () => (Math.atan2(this.y, this.x) * 180) / Math.PI;

  //rotate a point around the root (0,0) point
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
    // console.log('start because outside');
    let dirs = [xd, yd].filter((d) => !d.reverse().eq(svDir));
    grid.pushSource(sv.add(svDir.mul(pathMargin)).setDirs(dirs));
    return handleMargin(grid, pathMargin);
  }

  if (evDirsIn.length === 0) {
    // console.log('end because outside');
    let dirs = [xd, yd].filter((d) => !d.reverse().eq(evDir));
    grid.pushTarget(ev.sub(evDir.mul(pathMargin)).setDirs(dirs));
    return handleMargin(grid, pathMargin);
  }

  if (svDir.eq(evDir) || !(svf.absSize() < pathMargin && evf.absSize() < pathMargin)) {
    let factor = 1;
    if (svDir.eq(evDir)) factor = 2;
    if (svf.absSize() < pathMargin * factor) {
      // console.log('start because small');
      grid.pushSource(sv.add(svDir.mul(pathMargin)).setDirs([sdr]));
    }
    if (evf.absSize() < pathMargin * factor) {
      // console.log('end because small');
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

  // let xd = new Dir(new Vector(vse.x, 0));
  // let yd = new Dir(new Vector(0, vse.y));

  // if (xd.absSize() === 0) {
  //   xd = yd.mirror();
  //   console.log('coshilrabak');
  // }
  // if (yd.absSize() === 0) yd = xd.mirror();

  // chose(arbitrary) the first allowed dir
  let svDir = sv.faceDirs[0];
  let evDir = ev.faceDirs[0];

  //direction and vectors of rectangle
  let svf = svDir.mul(vse.abs());
  // let svr = vse.sub(svf);
  let svr = svDir.rotate(90).abs().mul(vse);
  let sdf = new Dir(svf);
  let sdr = new Dir(svr);

  //here the direction of svDir and evDir will always be inwards the rectangle

  if (svr.absSize() === 0 && svDir.eq(evDir) && svDir.eq(sdf)) {
    // console.log('path connected');
    return;
  }
  if (svDir.eq(evDir)) {
    // console.log('Z curve');
    let svNext = sv.add(svf.dev(2));
    grid.pushSource(svNext);
    grid.pushSource(svNext.add(svr).setDirs([sdf]));
    return drawToTarget(grid);
  }
  grid.pushSource(sv.add(svf).setDirs([sdr]));
  // console.log('r curve', svDir, evDir);
  return drawToTarget(grid);
};

type sidesType = 'top' | 'right' | 'bottom' | 'left';

const dirs = {
  up: new Dir(0, -1), //270
  right: new Dir(1, 0), //0
  down: new Dir(0, 1), //90
  left: new Dir(-1, 0), //180
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

export const chooseSimplestPath = (sv: Vector, ev: Vector, pathMargin: number): [Dir[], Dir[]] => {
  if (ev.faceDirs.length === 1 && sv.faceDirs.length === 1) return [sv.faceDirs, ev.faceDirs];

  let vse = ev.sub(sv);

  // the rectangle vectors and dirs
  let vf = sv.faceDirs[0].abs().mul(vse);
  let vr = vse.sub(vf);
  let df = new Dir(vf);
  let dr = new Dir(vr);

  // the dirs inwards the rectangle that connects the 2 points
  let [evDirsIn, evDirsOut] = filterDirs(ev.faceDirs, [df, dr]);
  let [svDirsIn, svDirsOut] = filterDirs(sv.faceDirs, [df, dr]);

  if (svDirsIn.length === 1 && evDirsIn.length === 1) return [svDirsIn, evDirsIn];

  let svDirs: Dir[];
  let evDirs: Dir[];

  if (svDirsIn.length === 0) svDirs = svDirsOut;
  else svDirs = svDirsIn;
  if (evDirsIn.length === 0) evDirs = evDirsOut;
  else evDirs = evDirsIn;

  // prefer r curve if exists (over more complicated path like z or adding margin)
  for (let svDir of svDirsIn) {
    for (let evDir of evDirsIn) {
      if (svDir.abs().eq(evDir.mirror().abs()) && vr.absSize() > pathMargin) {
        // console.log('r chosen!', svDir, evDir);
        return [[svDir], [evDir]];
      }
    }
  }
  // prefer z curve over margins
  for (let svDir of svDirsIn) {
    for (let evDir of evDirsIn) {
      if (svDir.eq(evDir)) {
        // console.log('z chosen!', svDir, evDir);
        return [[svDir], [evDir]];
      }
    }
  }

  return [svDirs, evDirs];
};

export class SmartGrid {
  sources: VectorArr = new VectorArr();
  targets: VectorArr = new VectorArr();

  length: number = 0;

  // targetDir: Dir;

  constructor(sv: Vector, ev: Vector, rects: Rectangle[], pathMargin) {
    // let [sd, ed] = chooseSimplestPath(sv, ev, pathMargin);
    // this.sources.push(sv.setDirs(sd));
    // this.targets.push(ev.setDirs(ed));
    this.sources.push(sv);
    this.targets.push(ev);
    handleMargin(this, pathMargin);
    drawToTarget(this);
  }

  getSource = () => this.sources[this.sources.length - 1];
  getTarget = () => this.targets[this.targets.length - 1];
  getEdges = () => [this.getSource(), this.getTarget()];

  getSources = () => this.sources;
  getTargets = () => this.targets;

  pushSource = (v: Vector) => {
    this.sources.push(v);
    return v;
  };
  pushTarget = (v: Vector) => {
    this.targets.push(v);
    return v;
  };

  getPoints = () => [...this.sources.toList(), ...this.targets.rev().toList()] as const;
  getVectors = () => [...this.sources, ...this.targets.rev()] as const;

  getLength = (): number => {
    let len = 0;
    const vectors = this.getVectors();
    for (let i = 0; i < vectors.length - 1; i++) {
      len += vectors[i + 1].sub(vectors[i]).absSize();
    }
    return len;
  };

  getPointOnGrid = (len: number) => {
    let lenCount = 0;
    const vectors = this.getVectors();
    for (let i = 0; i < vectors.length - 1; i++) {
      let l = new Line(vectors[i], vectors[i + 1]);
      let lineLen = l.diff().absSize();
      if (lenCount + lineLen > len) {
        return vectors[i].add(new Dir(l.diff()).mul(len - lenCount));
      }
      lenCount += lineLen;
    }
    return vectors[vectors.length - 1];
  };
}

export const calcSmartPath = (sp: Vector, ep: Vector, rects: Rectangle[], pathMargin) => {
  return new SmartGrid(sp, ep, rects, pathMargin);
  // const smartGrid = new SmartGrid(sp, ep, rects, pathMargin);
  // return smartGrid.getPoints();
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
};

export const pointsToLines = (points) => {
  const p1 = points.splice(0, 1)[0];
  const first = `M ${p1[0]} ${p1[1]}`;
  return points.reduce((ac, cr) => ac + ` L ${cr[0]} ${cr[1]} `, first);
};

if (require.main === module) {
  // console.log(pick(new Dir(10, 0).rotate(180), ['x', 'y']));
  // console.log(new Dir(1, -1).toDegree());

  // testPoints2Vector();
  const test = () => {
    const testZ = () => {
      let sv = new Vector(1000, 1000),
        ev = new Vector(1100, 1100);
      let sd = [dirs['right'], dirs['left']],
        ed = [dirs['right']];
      // let points = calcSmartPath(sp, 'right', ep, 'top');
      let [sdd, edd] = chooseSimplestPath(sv.setDirs(sd), ev.setDirs(ed), 30);
      // const smartGrid = new SmartGrid(new Vector(sp, sd), new Vector(ep, ed), [], 15);
      const smartGrid = calcSmartPath(sv.setDirs(sd), ev.setDirs(ed), [], 30);
      const points = smartGrid.getPoints();
      console.log(pick(smartGrid.getPointOnGrid(120), ['x', 'y']));
    };
    testZ();
  };
  test();

  let arr = [
    [169, 50],
    [169, 120],
    [270.1830003261566, 120],
  ];
  // console.log(pointsToLines(arr));

  // console.log(points2Vector(1000, 1000, 'top', []));

  // console.log(dir2Deg(new Dir(1, 0)));
  // console.log(console.log(new Dir(100, 200)));
  // console.log(Math.sin(deg2Rad(270)));
} else {
}
// test();
