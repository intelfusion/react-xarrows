import { pointsToLines } from './buzierSmooth';

const points1 = [
  [5, 10],
  [10, 40],
  [40, 30],
  [60, 5],
  [90, 45],
  [120, 10],
  [150, 45],
  [200, 10],
];

const testPoints = () => {
  const points = [
    [0, 0],
    [10, 50],
  ];
  console.log(pointsToLines(points));
};

testPoints();

// console.log(svgPath(points,bezierCommand))
