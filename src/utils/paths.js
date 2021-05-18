// type pointType = {x:number,y:number}
//
// class Dir {
//   constructor(dir:pointType, label:string,reverse:boolean,clockwise:string) {
//
//   }
// }
// type pointType = {x:number,y:number}

const shortAnchor = (an) => {
  const d = {
    top: 'U',
    bottom: 'D',
    right: 'R',
    left: 'L',
  };
  return d[an];
};

export class Dir {
  static refs = {};

  constructor(dir, label, reverse, clockwise) {
    this.dir = dir;
    this.label = label;
    Dir.refs[label] = { ref: this, reverse, clockwise };
  }

  add = (root, add) => {
    return [root[0] + this.dir[0] * add, root[1] + this.dir[1] * add];
  };

  mul = (dir) => {
    return [this.dir[0] * dir[0], this.clockwise().dir[1] * dir[1]];
  };

  clockwise = () => Dir.refs[Dir.refs[this.label].clockwise].ref;

  reverse = () => Dir.refs[Dir.refs[this.label].reverse].ref;

  static get = (label) => Dir.refs[label].ref;
  static dirs = {
    U: new Dir([0, -1], 'U', 'D', 'R'),
    R: new Dir([1, 0], 'R', 'L', 'D'),
    D: new Dir([0, 1], 'D', 'U', 'L'),
    L: new Dir([-1, 0], 'L', 'R', 'U'),
  };
}

// console.log(Dir.dirs.top.reverse());

// start anchor direction
export const SAD = {
  top: 'U',
  right: 'R',
  bottom: 'D',
  left: 'L',
};
export const EAD = {
  top: 'D',
  right: 'L',
  bottom: 'U',
  left: 'R',
};

// console.log(Dir.dirs[SAD['top']]);

// const dirU = new Dir([0, -1], 'U', 'D', 'R');
// const dirR = new Dir([1, 0], 'R', 'L', 'D');
// const dirD = new Dir([0, 1], 'D', 'U', 'L');
// const dirL = new Dir([-1, 0], 'L', 'R', 'U');

// console.log(Dir.get('L').add([0, 0], 10));
