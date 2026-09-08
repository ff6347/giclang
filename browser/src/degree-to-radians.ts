// ABOUTME: Converts GIC degree angles into radians required by browser Canvas.
// ABOUTME: Keeps angle conversion explicit at the Canvas rendering boundary.

export function degreeToRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}
