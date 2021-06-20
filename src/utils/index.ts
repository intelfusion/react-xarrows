import { refType } from '../types';

export const getElementByPropGiven = (ref: refType): HTMLElement => {
  let myRef;
  if (typeof ref === 'string') {
    // myRef = document.getElementById(ref);
    myRef = document.getElementById(ref);
  } else myRef = ref.current;
  return myRef;
};

// receives string representing a d path and factoring only the numbers
export const factorDpathStr = (d: string, factor) => {
  let l = d.split(/(\d+(?:\.\d+)?)/);
  l = l.map((s) => {
    if (Number(s)) return (Number(s) * factor).toString();
    else return s;
  });
  return l.join('');
};

// debug
export const measureFunc = (callbackFunc: Function, name = '') => {
  const t = performance.now();

  const returnVal = callbackFunc();
  console.log('time ', name, ':', performance.now() - t);
  return returnVal;
};

// return relative,abs
export const xStr2absRelative = (str): { abs: number; relative: number } => {
  if (typeof str !== 'string') return;
  let sp = str.split('%');
  let absLen = 0,
    percentLen = 0;
  if (sp.length == 1) {
    let p = parseFloat(sp[0]);
    if (!isNaN(p)) {
      absLen = p;
      return { abs: absLen, relative: 0 };
    }
  } else if (sp.length == 2) {
    let [p1, p2] = [parseFloat(sp[0]), parseFloat(sp[1])];
    if (!isNaN(p1)) percentLen = p1 / 100;
    if (!isNaN(p2)) absLen = p2;
    if (!isNaN(p1) || !isNaN(p2)) return { abs: absLen, relative: percentLen };
  }
};

export const getElemPos = (elem: HTMLElement) => {
  const pos = elem?.getBoundingClientRect() ?? { left: 0, top: 0, right: 0, bottom: 0 };
  return {
    x: pos.left,
    y: pos.top,
    right: pos.right,
    bottom: pos.bottom,
  };
};

// export const measureFunc = (func: Function, name = '') => (...args) => {
//   const t = performance.now();
//
//   console.log(this, func.name, ...args);
//   const returnVal = func(...args);
//   console.log('time ', func.name || name, ':', performance.now() - t);
//   return returnVal;
// };
//// example
// instead: myFunc(arg1,arg2)
// call: measureFunc(myFunc)(arg1,arg2)
