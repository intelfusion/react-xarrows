/**
 * utility functions for preparing `startAnchor` and `endAnchor` to accept the diffrent types that can be passed.
 */

import {
  anchorCustomPositionType,
  anchorEdgeType,
  _anchorType,
  anchorType,
  _faceDirType,
  dimensionType,
  tAnchorEdge,
} from '../types';

const getAnchorsDefaultOffsets = (width: number, height: number) => {
  return {
    middle: { rightness: width * 0.5, bottomness: height * 0.5 },
    left: { rightness: 0, bottomness: height * 0.5 },
    right: { rightness: width, bottomness: height * 0.5 },
    top: { rightness: width * 0.5, bottomness: 0 },
    bottom: { rightness: width * 0.5, bottomness: height },
  };
};

// remove 'auto' as possible anchor from anchorCustomPositionType.position
interface anchorCustomPositionType2 extends Omit<Required<anchorCustomPositionType>, 'position'> {
  position: Exclude<typeof tAnchorEdge[number], 'auto'>;
}

export const prepareAnchor = (anchor: anchorType, anchorPos: dimensionType) => {
  // convert to array
  let anchorChoice = Array.isArray(anchor) ? anchor : [anchor];
  // if (anchorChoice.length == 0) anchorChoice = ['auto'];

  //convert to array of objects
  let anchorChoice2 = anchorChoice.map((anchorChoice) => {
    if (typeof anchorChoice === 'string') {
      return { position: anchorChoice };
    } else return anchorChoice;
  });

  //remove any invalid anchor names
  anchorChoice2 = anchorChoice2.filter((an) => tAnchorEdge.includes(an.position));

  //replace any 'auto' with ['left','right','bottom','top']
  let autosAncs = anchorChoice2.filter((an) => an.position === 'auto');
  if (autosAncs.length > 0) {
    anchorChoice2 = anchorChoice2.filter((an) => an.position !== 'auto');
    anchorChoice2.push(
      ...autosAncs.flatMap((anchorObj) => {
        return (['left', 'right', 'top', 'bottom'] as anchorEdgeType[]).map((anchorName) => {
          return { ...anchorObj, position: anchorName };
        });
      })
    );

    // );      anchorChoice2.push(
    //   ...(['left', 'right', 'top', 'bottom'] as anchorEdgeType[]).map((an) => {
    //     return { position: an };
    //   })
    // );
  }
  //
  // let i=1
  // while( i = items.indexOf(3452);)
  // let anchorChoice3 = anchorChoice2.map((an) => {
  //   let {
  //     position,
  //     offset: { rightness, bottomness },
  //   } = an;
  // });

  // //replace any 'auto' with ['left','right','bottom','top']
  // if (anchorChoice2.some((an) => an.position === 'auto')) {
  //   anchorChoice2 = anchorChoice2.filter((an) => an.position !== 'auto');
  //   anchorChoice2.push(
  //     ...(['left', 'right', 'top', 'bottom'] as anchorEdgeType[]).map((an) => {
  //       return { position: an };
  //     })
  //   );
  // }

  // default values
  let anchorChoice3 = anchorChoice2.map((anchorChoice) => {
    if (typeof anchorChoice === 'object') {
      // anchorChoice = anchorChoice as anchorCustomPositionType;
      if (!anchorChoice.position) anchorChoice.position = 'auto';
      if (!anchorChoice.offset) anchorChoice.offset = { rightness: 0, bottomness: 0 };
      if (!anchorChoice.offset.bottomness) anchorChoice.offset.bottomness = 0;
      if (!anchorChoice.offset.rightness) anchorChoice.offset.rightness = 0;

      if (!anchorChoice.facingDir) anchorChoice.facingDir = ['auto'];
      if (!Array.isArray(anchorChoice.facingDir)) anchorChoice.facingDir = [anchorChoice.facingDir];
      anchorChoice = anchorChoice as Required<anchorCustomPositionType>;
      anchorChoice.facingDir = anchorChoice.facingDir as _faceDirType[];
      return anchorChoice;
    } else return anchorChoice;
  }) as Required<anchorCustomPositionType>[];

  let anchorChoice4 = anchorChoice3 as anchorCustomPositionType2[];

  // let anchorPossibilities: Required<anchorCustomPositionType>[] = [];
  // if (anchorChoice.map((a) => a.position).includes('auto')) {
  //   let autoAnchor = anchorChoice.find((a) => a.position === 'auto');

  // now prepare this list of anchors to object expected by the `getShortestLine` function
  return anchorChoice4.map((anchor) => {
    let defsOffsets = getAnchorsDefaultOffsets(anchorPos.right - anchorPos.x, anchorPos.bottom - anchorPos.y);
    let { rightness, bottomness } = defsOffsets[anchor.position];
    return {
      // x: anchorPos.x + pos.offset.rightness,
      // y: anchorPos.y + pos.offset.bottomness,
      // anchorName: pos.position as anchorEdgeType,
      x: rightness + anchor.offset.rightness,
      y: bottomness + anchor.offset.bottomness,
      anchor: anchor,
    };
  });

  // //now map each item in the array to relevant object
  // let anchorChoiceMapped = anchorChoice.map((anchorChoice) => {
  //   if (typeOf(anchorChoice) === 'string') {
  //     if (!tAnchorEdge.includes(anchorChoice as any)) anchorChoice = 'auto';
  //     anchorChoice = anchorChoice as anchorNamedType;
  //     return {
  //       position: anchorChoice,
  //       offset: { rightness: 0, bottomness: 0 },
  //     };
  //   } else if (typeOf(anchorChoice) === 'object') {
  //     anchorChoice = anchorChoice as anchorCustomPositionType;
  //     if (!anchorChoice.position) anchorChoice.position = 'auto';
  //     if (!anchorChoice.offset) anchorChoice.offset = { rightness: 0, bottomness: 0 };
  //     if (!anchorChoice.offset.bottomness) anchorChoice.offset.bottomness = 0;
  //     if (!anchorChoice.offset.rightness) anchorChoice.offset.rightness = 0;
  //
  //     if (!anchorChoice.facingDir) anchorChoice.facingDir = ['auto'];
  //     if (!Array.isArray(anchorChoice.facingDir)) anchorChoice.facingDir = [anchorChoice.facingDir];
  //     anchorChoice = anchorChoice as Required<anchorCustomPositionType>;
  //     anchorChoice.facingDir = anchorChoice.facingDir as _faceDirType[];
  //     return anchorChoice;
  //   }
  // });

  //now build the object that represents location possibilities for different anchors
  // (convert any `position:<anchor>' to the relevant positions)

  // // todo: REWRITE! WRONG!
  // anchorChoice = anchorChoice as anchorCustomPositionType[];
  // anchorChoice;
  // let anchorPossibilities: Required<anchorCustomPositionType>[] = [];
  // if (anchorChoice.map((a) => a.position).includes('auto')) {
  //   let autoAnchor = anchorChoice.find((a) => a.position === 'auto');
  //   (['left', 'right', 'top', 'bottom'] as anchorEdgeType[]).forEach((anchor) => {
  //     let offset = defsOffsets[anchor];
  //     offset.rightness += autoAnchor.offset.rightness;
  //     offset.bottomness += autoAnchor.offset.bottomness;
  //     anchorPossibilities.push({ position: anchor, offset });
  //   });
  // } else {
  //   anchorChoice.forEach((customAnchor) => {
  //     let offset = defsOffsets[customAnchor.position] as {
  //       rightness: number;
  //       bottomness: number;
  //     };
  //     offset.rightness += customAnchor.offset.rightness;
  //     offset.bottomness += customAnchor.offset.bottomness;
  //     anchorPossibilities.push({ position: customAnchor.position, offset, facingDir: ['auto'] });
  //   });
  // }
};

const dist = (p1, p2) => {
  //length of line
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
};

type t1 = { x: number; y: number; anchor: anchorCustomPositionType };

export const getShortestLine = (sPoints: t1[], ePoints: t1[]) => {
  // closes tPair Of Points which feet to the specified anchors
  let minDist = Infinity,
    d = Infinity;
  let closestPair: { chosenStart: t1; chosenEnd: t1 };
  sPoints.forEach((sp) => {
    ePoints.forEach((ep) => {
      d = dist(sp, ep);
      if (d < minDist) {
        minDist = d;
        closestPair = { chosenStart: sp, chosenEnd: ep };
      }
    });
  });
  return closestPair;
};

if (require.main === module) {
  const res = prepareAnchor([{ position: 'auto', offset: { bottomness: 10 } }, 'left', 'auto'], {
    x: 0,
    y: 0,
    bottom: 10,
    right: 20,
  });
  console.log(res);
}
