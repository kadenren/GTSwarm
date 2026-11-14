'use client';
import ForceGraph2D from 'react-force-graph-2d';

/** Client-only wrapper so the explorer can hold a ref to the force graph through next/dynamic. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ForceGraphInner({ fgRef, ...props }: { fgRef: unknown } & Record<string, any>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ForceGraph2D ref={fgRef as any} {...(props as any)} />;
}
