const projections = new WeakMap();
const identity = y => y;
const unchanged = { boundary: Infinity, position: identity, front: identity };

// The leading edge of the main gate's ground footprint.
export const gateGroundEdge = gate => gate.y + 2;

export function retreatProjection(level) {
  const cached = projections.get(level);
  if (cached) return cached;
  const castle = level.objective?.castleFront;
  const boundary = Math.min(...(level.gates ?? []).map(gateGroundEdge));
  if (!Number.isFinite(castle) || !Number.isFinite(boundary) || castle <= boundary) return unchanged;

  const reduction = castle - boundary;
  const span = reduction * 2.4;
  const start = castle - span;
  const endSlope = 1 - 2 * reduction / span;
  function position(y) {
    if (y <= start) return y;
    if (y >= castle) return boundary + (y - castle) * endSlope;
    const progress = (y - start) / span;
    return y - reduction * progress * progress;
  }
  const projection = { boundary, position, front: y => Math.min(boundary, position(y)) };
  projections.set(level, projection);
  return projection;
}
