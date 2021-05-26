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

class VectorList extends Array {
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
  rev = () => new VectorList(...this.reverse());

  print = () => `Vector ${this.map((v) => `[${[v.x, v.y]}]`)}`;
}

const getNextPoint = (sv: Vector, ev: Vector, margin = true): [Vector, Vector, boolean?] => {
  let l = new Line(sv, ev);
  // if ((l.dir().x == 0 || l.dir().y == 0) && sv.faceDir.eq(ev.faceDir)) return [ev, ev];
  let vse = l.diff(); // the vector from s to e
  let dfe = new Dir(sv.faceDir.abs().mul(vse));
  let vf = sv.faceDir.mul(vse.abs()); // the forward vector from the arrow point of view(takes into account everthing)
  let vr = vse.sub(sv.faceDir.abs().mul(vse));
  let vfe = sv.faceDir.abs().mul(vse); // forward parallel to start dir at the direction for target point
  let lf = new Line(sv, sv.add(vf));
  let lr = new Line(sv, sv.add(vr));
  let lfe = new Line(sv, sv.add(vfe));
  let lre = lr;
  let lfd = lf.dir(),
    lrd = lr.dir();
  if (lrd.absSize() === 0) lrd = lfd.mirror();
  let lfed = lfe.dir(),
    lred = lrd;
  if (vf.absSize() == 0) return [sv.add(ev.faceDir.reverse().mul(pathMargin)).setDir(lrd), ev];

  // if (vr.size() == 0) {
  //   console.log('vr=0', pick(lfd, ['x', 'y']), pick(dfe, ['x', 'y']));
  // }
  // the orthogonal direction for forward that taking closer to the target point
  if (Math.abs(vr.x) > 0 && Math.abs(vr.y) > 0) console.warn('??????'); //debug

  let absVf = vf.abs();
  let absVr = vr.abs();

  // if (sv.faceDir.eq(lfd.reverse()) || vf.size() < pathMargin)
  //   return [sv.add(sv.faceDir.mul(pathMargin)).setDir(lrd), ev];
  // if (vf.size() < pathMargin) return [sv.add(sv.faceDir.mul(pathMargin)).setDir(lrd), ev];

  // let dfe = sv.faceDir.abs().mul(vse)

  // stop condition - if the arrow facing the direction it should go and there is no orthogonal distance to travel
  // if (lr.diff().absSize() === 0 && sv.faceDir.eq(ev.faceDir) && vf.size() > 0) return [ev, ev];
  if (lr.diff().absSize() === 0 && sv.faceDir.eq(ev.faceDir)) {
    // if (vf.size() === 0) console.log(vf);
    // console.log(vf);
    // if (vf.absSize() < pathMargin) return [sv, ev.add(ev.faceDir.reverse().mul(pathMargin))];
    return [ev, ev];
  }
  // if (vr.size() === 0) console.log(vr);

  // if start point direction is the same as end point direction then it's a Z curve
  if (sv.faceDir.eq(ev.faceDir)) {
    console.log('Z curve');
    return [sv.add(vf.dev(2)).setDir(lred), ev, false];
  }

  if (margin) {
    // add margin after start if needed
    if (sv.faceDir.eq(dfe.reverse()) && sv.faceDir.mul(vse).size() < pathMargin) {
      // if (!sv.faceDir.eq(ld) || vf.size() < pathMargin)
      console.log('start margin');
      return [sv.add(sv.faceDir.mul(pathMargin)).setDir(lred), ev];
    }

    // add margin before end if needed
    let [lpd, lmd] = ev.faceDir.absEq(lred) ? [lred, lfed] : [lfed, lred]; //choose line parallel to end line direction
    if (lpd.abs().eq(ev.faceDir) && vr.size() < pathMargin) {
      console.log('end margin');
      return [sv, ev.sub(ev.faceDir.mul(pathMargin)).setDir(lmd)];
    }
    // //working
    // let [lpd, lmd] = ev.faceDir.absEq(lred) ? [lred, lfed] : [lfed, lred]; //choose line parallel to end line direction
    // if (lpd.eq(ev.faceDir.reverse())) {
    //   console.log('!!!');
    //   return [sv, ev.add(lpd.mul(pathMargin)).setDir(lmd)];
    // }

    // console.log(lpd);
    // let [lpd, lmd] = ev.faceDir.absEq(lred) ? [lred, lfed] : [lfed, lred]; //choose line parallel to end line direction
    // if (lpd.eq(ev.faceDir.reverse()) || vr.absSize() < pathMargin)
    //   return [sv, ev.add(ev.faceDir.mul(pathMargin)).setDir(lmd)];
    // if (lr.dir().eq(ev.faceDir.reverse())) return [sv, ev.add(lr.dir().mul(pathMargin)).setDir(lf.dir())];
  }

  //else its a normal 90 grid break at the end of current direction (r curve)
  {
    console.log('r curve');
    return [sv.add(sv.faceDir.mul(absVf)).setDir(lred), ev];
  }
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

const rect = new Rectangle(new Vector(0, 5), new Vector(30, 20));

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
  private starts: VectorList = new VectorList();
  private ends: VectorList = new VectorList();

  constructor(sv: Vector, ev: Vector, rects: Rectangle[] = []) {
    this.starts.push(sv);
    this.ends.push(ev);
    let lastCur = this.starts[this.starts.length - 1],
      lastTar = this.ends[this.ends.length - 1];
    let margin = true;
    while (!lastCur.eq(lastTar)) {
      let [cur, tar, doMargin] = getNextPoint(lastCur, lastTar, margin);
      margin = doMargin;
      if (cur.eq(tar)) return;
      if (!cur.eq(lastCur)) this.starts.push(cur);
      if (!tar.eq(lastTar)) this.ends.push(tar);
      lastCur = this.starts[this.starts.length - 1];
      lastTar = this.ends[this.ends.length - 1];
      // this.add(this.current);
    }
  }

  getPoints = () => [...this.starts.toList(), ...this.ends.rev().toList()];
}

export const calcSmartPath = (sp: Vector, sd: sidesType, ep: Vector, ed: sidesType, rects: Rectangle[] = []) => {
  // start anchor direction
  let sdd = dirs[SAD[sd]];
  let edd = dirs[EAD[ed]];

  const smartGrid = new SmartGrid(new Vector(sp, sdd), new Vector(ep, edd));
  const points = smartGrid.getPoints();
  // console.log(sdd, 'sdd');
  // ll.add(sp.add(sp.add(pathMargin).mul(sdd)));
  // const points = ll.add(...new GridLine(sp, sdd, ep, edd).add(ep).vectors).toList();
  // console.log(JSON.stringify(points));
  return points;
};

const test = () => {
  const testZ = () => {
    // let sp = new Vector(0, 0),
    //   ep = new Vector(10, 100);
    // let sp = new Vector(150, 50),
    //   ep = new Vector(100, 150);
    let sp = new Vector(0, 0),
      ep = new Vector(-100, -10);

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

// export class Dir {
//   static refs: { ref?: Dir; reverse?: Dir; clockwise?: Dir } = {};
//   dir: Vector;
//   label: keyof typeof Dir.dirs;
//
//   constructor(dir: Vector, label, reverse, clockwise) {
//     this.dir = dir;
//     this.label = label;
//     Dir.refs[label] = { ref: this, reverse, clockwise };
//   }
//
//   add = (root, add) => {
//     return [root[0] + this.dir[0] * add, root[1] + this.dir[1] * add];
//   };
//
//   clockwise = () => Dir.refs[Dir.refs[this.label].clockwise].ref;
//
//   reverse = () => Dir.refs[Dir.refs[this.label].reverse].ref;
//
//   static get = (label) => Dir.refs[label].ref;
//   static dirs = {
//     U: new Dir(new Vector(0, -1), 'U', 'D', 'R'),
//     R: new Dir(new Vector(1, 0), 'R', 'L', 'D'),
//     D: new Dir(new Vector(0, 1), 'D', 'U', 'L'),
//     L: new Dir(new Vector(-1, 0), 'L', 'R', 'U'),
//   } as const;
// }

// /**
//  * up to 2 straight lines which moves only on x or y.
//  */
// class GridLine extends VectorList {
//   constructor(sp: Vector, sd: Dir, ep: Vector, ed: Dir, startMargin = true, endMargin = false) {
//     super();
//     let l = new Line(sp, ep);
//     let vx = sp.add(l.xDiff());
//     let vy = sp.add(l.yDiff());
//     let lx = new Line(sp, vx);
//     let ly = new Line(sp, vy);
//     let vf, df; //forward
//     if (sd.eq(lx.dir()) && ed.eq(ly.dir())) {
//       vf = vx;
//       df = sd;
//     } else if (sd.eq(ly.dir()) && ed.eq(lx.dir())) {
//       vf = vy;
//       df = ed;
//     } else if (!sd.eq(lx.dir())) {
//       vf = sp.add(sd.mul(pathMargin));
//       df = sd;
//     } else {
//       // its z path
//       let nextP = sp.add(l.diff().dev(2));
//       let nextL = new Line(sp, nextP);
//       let nextEd;
//       // console.log(sd, ed, nextL.xDiff().dir(), nextL.yDiff().dir());
//       if (sd.eq(lx.dir()) && ed.eq(lx.dir())) {
//         nextEd = nextL.yDiff().dir();
//       } else if (sd.eq(ly.dir()) && ed.eq(ly.dir())) {
//         nextEd = nextL.xDiff().dir();
//       } else {
//         // console.log(sd, ed, l.dir());
//         console.warn('??? THIS SHOULD NOT BE PRINTED ???');
//         return;
//       }
//       let nextControlP = new GridLine(sp, sd, nextP, nextEd).vectors[0];
//       this.add(nextControlP, ...new GridLine(nextControlP, nextEd, ep, ed, false, true).vectors);
//       return;
//     }
//
//     let sPathSize = new Line(sp, vf).diff().size();
//     let ePathSize = new Line(vf, ep).diff().size();
//     if (startMargin && sPathSize < pathMargin) {
//       // console.log(vf, df.dir());
//       let pNext = sp.add(df.mul(pathMargin));
//       this.add(pNext);
//       // console.log(...new GridLine(pNext, new Line(pNext, ep).dir(), ep, ed).vectors);
//       let nextL = new Line(pNext, ep);
//       let _nextDir = nextL.dir();
//       let nextDir = nextL.xDiff().dir();
//       if (Math.abs(_nextDir.y) > Math.abs(_nextDir.x)) nextDir = nextL.yDiff().dir();
//       this.add(...new GridLine(pNext, nextDir, ep, ed).vectors);
//       return;
//     }
//     // if (startMargin && sPathSize < pathMargin) {
//     //   let pNext = sp.add(df.mul(pathMargin));
//     //
//     //   this.add(pNext);
//     //   return;
//     // }
//     this.add(vf);
//   }
// }
