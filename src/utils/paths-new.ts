// @ts-ignore
class Point {
  x: number;
  y: number;

  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Line {
  start: Point;
  end: Point;

  constructor(start: Point, end: Point) {
    this.start = start;
    this.end = end;
  }
}

class Rectangle {
  left: Line;
  top: Line;
  right: Line;
  bottom: Line;

  constructor(leftTop: Point, rightBottom: Point) {
    this.left = new Line(leftTop, new Point(leftTop.x, rightBottom.y));
    this.top = new Line(leftTop, new Point(rightBottom.x, leftTop.y));
    this.right = new Line(new Point(rightBottom.x, leftTop.y), rightBottom);
    this.bottom = new Line(new Point(leftTop.x, rightBottom.y), rightBottom);
  }
}

const rect = new Rectangle(new Point(0, 5), new Point(30, 20));

const main = (sp: Point, ep = Point, rects: Rectangle[] = []) => {

};
