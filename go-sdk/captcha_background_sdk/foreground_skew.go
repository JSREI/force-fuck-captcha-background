package captcha_background_sdk

import (
	"math"
)

// ForegroundSkewEstimator estimates the skew angle of foreground elements in captcha images.
// Uses PCA (Principal Component Analysis) on foreground pixels to determine the dominant angle.
// This can be used to detect rotated or tilted text in captchas.
type ForegroundSkewEstimator struct{}

// NewForegroundSkewEstimator creates a new skew angle estimator.
func NewForegroundSkewEstimator() *ForegroundSkewEstimator {
	return &ForegroundSkewEstimator{}
}

// EstimateSkew estimates the skew angle of foreground pixels using PCA.
// It analyzes the distribution of foreground pixels to determine the dominant orientation.
//
// Parameters:
//   - captchaPixels: The captcha image pixels
//   - backgroundPixels: The background image pixels (must match captcha size)
//   - diffMask: Boolean mask indicating foreground pixels
//   - minPixels: Minimum number of foreground pixels required for estimation
//   - maxAbsAngle: Maximum absolute angle to return (clamped to this range)
//
// Returns a ForegroundSkewEstimateResult containing the estimated angle and confidence.
func (e *ForegroundSkewEstimator) EstimateSkew(
	captchaPixels, backgroundPixels *RGBAPixels,
	diffMask []bool,
	minPixels int,
	maxAbsAngle float64,
) *ForegroundSkewEstimateResult {
	w, h := captchaPixels.Width, captchaPixels.Height

	// Collect foreground pixels
	var pixels []Pixel
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			idx := y*w + x
			if diffMask[idx] {
				pixels = append(pixels, Pixel{x, y})
			}
		}
	}

	pixelCount := len(pixels)
	if pixelCount < minPixels {
		return &ForegroundSkewEstimateResult{
			AngleDegrees: 0,
			Confidence:   0,
			PixelCount:   pixelCount,
			EigenRatio:   0,
		}
	}

	// Calculate centroid
	cx, cy := 0.0, 0.0
	for _, p := range pixels {
		cx += float64(p[0])
		cy += float64(p[1])
	}
	cx /= float64(pixelCount)
	cy /= float64(pixelCount)

	// Calculate covariance matrix
	var xx, xy, yy float64
	for _, p := range pixels {
		dx := float64(p[0]) - cx
		dy := float64(p[1]) - cy
		xx += dx * dx
		xy += dx * dy
		yy += dy * dy
	}

	// Normalize
	xx /= float64(pixelCount)
	xy /= float64(pixelCount)
	yy /= float64(pixelCount)

	// Calculate eigenvalues and eigenvector
	// For 2x2 matrix [[xx, xy], [xy, yy]]
	trace := xx + yy
	det := xx*yy - xy*xy

	discriminant := trace*trace - 4*det
	if discriminant < 0 {
		discriminant = 0
	}

	sqrtDisc := math.Sqrt(discriminant)
	eigen1 := (trace + sqrtDisc) / 2
	eigen2 := (trace - sqrtDisc) / 2

	// Ensure eigen1 >= eigen2
	if eigen1 < eigen2 {
		eigen1, eigen2 = eigen2, eigen1
	}

	// Calculate angle from principal component (eigenvector corresponding to eigen1)
	// For matrix [[xx, xy], [xy, yy]], eigenvector for eigen1 satisfies:
	// (xx - eigen1) * vx + xy * vy = 0
	// => vx/vy = xy / (eigen1 - xx)  OR  vy/vx = (eigen1 - xx) / xy
	var angle float64
	if math.Abs(xy) > 1e-10 {
		// eigenvector direction: (xy, eigen1 - xx)
		// Use atan2 to get angle of eigenvector from x-axis
		angle = math.Atan2(eigen1-xx, xy) * 180 / math.Pi
	} else if xx > yy {
		// xy ≈ 0 and xx > yy: principal axis is horizontal (x direction)
		angle = 0
	} else if yy > xx {
		// xy ≈ 0 and yy > xx: principal axis is vertical (y direction)
		angle = 90
	} else {
		// xx ≈ yy and xy ≈ 0: isotropic (circular), no dominant direction
		angle = 0
	}

	// Normalize angle to [-90, 90] range
	// Handle the ambiguity: eigenvector v and -v represent the same principal axis
	// For a line, angle θ and θ+180 represent the same line
	// We normalize to [-90, 90] where:
	// - 0 means horizontal
	// - ±90 means vertical (both are equivalent for line orientation)
	for angle > 90 {
		angle -= 180
	}
	for angle < -90 {
		angle += 180
	}

	// For angles very close to ±90, treat them as equivalent (vertical)
	// This handles the eigenvector direction ambiguity
	if angle > 85 {
		angle = 90
	} else if angle < -85 {
		angle = -90
	}

	// Limit angle
	if angle < -maxAbsAngle {
		angle = -maxAbsAngle
	}
	if angle > maxAbsAngle {
		angle = maxAbsAngle
	}

	// Calculate confidence based on eigenvalue ratio
	eigenRatio := 1.0
	if eigen2 > 1e-10 {
		eigenRatio = eigen1 / eigen2
	}

	// Confidence based on how elongated the distribution is
	confidence := 1.0 - math.Exp(-eigenRatio/10.0)
	if confidence < 0 {
		confidence = 0
	}
	if confidence > 1 {
		confidence = 1
	}

	return &ForegroundSkewEstimateResult{
		AngleDegrees: angle,
		Confidence:   confidence,
		PixelCount:   pixelCount,
		EigenRatio:   eigenRatio,
	}
}
