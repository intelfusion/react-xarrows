// @ts-ignore
import { number } from 'prop-types';

export class Vector {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  eq = (p: Vector) => p.x === this.x && p.y === this.y;

  add = (p: Vector) => new Vector(this.x + p.x, this.y + p.y);
  sub = (p: Vector) => new Vector(this.x - p.x, this.y - p.y);
  dev = (p: Vector | number) => {
    let _p;
    if (typeof p === 'number') _p = { x: p, y: p };
    else _p = p;
    return new Vector(this.x / _p.x, this.y / _p.y);
  };
  mul = (p: Vector) => new Vector(this.x * p.x, this.y * p.y);
  dir = () => new Dir(this.x, this.y);
}

/**
 * normalized direction
 */
class Dir {
  private readonly x: number;
  private readonly y: number;

  constructor(xDiff, yDiff) {
    let m = Math.max(Math.abs(xDiff), Math.abs(yDiff));
    if (m == 0) m = 1;
    this.x = xDiff / m;
    this.y = yDiff / m;
  }

  eq = (p: Dir) => p.x === this.x && p.y === this.y;
}

// // diff between points
// class Vector extends Point {
//   dir: Dir;
//
//   constructor(arg1: Point | number, arg2?: number) {
//     super(arg1, arg2);
//     this.dir = new Dir(this.x, this.y);
//   }
// }

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

class LinesList {
  vectors: Vector[] = [];
  add = (...vs: Vector[]) => {
    this.vectors.push(...vs);
    return this;
  };
  root: Vector;

  constructor(...vectors: Vector[]) {
    this.add(...vectors);
    // this.lines.push(...vectors);
  }
  toList = () => this.vectors.map((v) => [v.x, v.y]);
}

/**
 * up to 2 straight lines which moves only on x or y.
 */
class GridLine extends LinesList {
  constructor(sp: Vector, sd: Dir, ep: Vector, ed: Dir) {
    super();
    let l = new Line(sp, ep);
    // let v1 = new Vector(sp.add(l.xDiff()));
    // let v2 = new Vector(sp.add(l.yDiff()));
    let vx = sp.add(l.xDiff());
    let vy = sp.add(l.yDiff());
    // let l1 = new LinesList(sp,vx,vy)
    // let l2 = new LinesList(sp,vx,vy)
    let lx = new Line(sp, vx);
    let ly = new Line(sp, vy);
    if (sd.eq(lx.dir()) && ed.eq(ly.dir())) {
      this.add(vx);
    } else if (sd.eq(ly.dir()) && ed.eq(lx.dir())) {
      this.add(vy);
    } else {
      let nextP = sp.add(l.diff().dev(2));
      let nextL = new Line(sp, nextP);
      let nextEd;
      // console.log(sd, ed, nextL.xDiff().dir(), nextL.yDiff().dir());
      if (sd.eq(lx.dir()) && ed.eq(lx.dir())) {
        nextEd = nextL.yDiff().dir();
      } else if (sd.eq(ly.dir()) && ed.eq(ly.dir())) {
        nextEd = nextL.xDiff().dir();
      } else {
        // console.log(sd, ed, l.dir());
        console.warn('???????????????? THIS SHOULD NOT BE PRINTED ?????????????????');
        return;
      }
      let nextControlP = new GridLine(sp, sd, nextP, nextEd).vectors[0];
      this.vectors.push(nextControlP, ...new GridLine(nextControlP, nextEd, ep, ed).vectors);

      // this.vectors.push(...new GridLine(nextP, nextEd, ep, ed).vectors);

      // console.log(new GridLine(sp, sd, nextP, nextEd).toList());
      // notice: possibly wrong section.
      // if (sd.eq(lx.dir()) && ed.eq(lx.dir())) {
      //   let next = vx.dev(new Vector(2, 1));
      //   this.add(next, next.add(vy));
      // } else if (sd.eq(ly.dir()) && ed.eq(ly.dir())) {
      //   let next = vy.dev(new Vector(1, 2));
      //   this.add(next, next.add(vx));
      // } else console.warn('???????????????? THIS SHOULD NOT BE PRINTED ?????????????????');
    }
    // this.add(ep);
  }
}

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

export const calcSmartPath = (sp: Vector, sd: sidesType, ep: Vector, ed: sidesType, rects: Rectangle[] = []) => {
  // start anchor direction
  let sdd = dirs[SAD[sd]];
  let edd = dirs[EAD[ed]];

  return new LinesList(sp).add(...new GridLine(sp, sdd, ep, edd).add(ep).vectors).toList();
};

const test = () => {
  const testZ = () => {
    let sp = new Vector(0, 100),
      ep = new Vector(100, 120);

    let g = calcSmartPath(sp, 'top', ep, 'bottom');
    // console.log(g);
  };
  // testZ();
};
test();

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
