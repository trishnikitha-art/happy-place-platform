/**
 * Ranking Policy — Hero and Gallery Ranking Rules
 *
 * Constitutional decision-making for hero and gallery ranking.
 * Separated from projection logic to allow policy evolution without
 * projection code changes.
 */

class RankingPolicy {
  constructor() {
    this.name = "RankingPolicy";
  }

  /**
   * Calculate hero score for an image.
   * Higher score = better hero candidate.
   * @param {Object} image - Image node from graph
   * @returns {number} - Hero score (0-1)
   */
  calculateHeroScore(image) {
    const props = image.properties || image.data || {};

    // Policy: Composition weight (0.3)
    const compositionScore = props.composition_score || 0;
    const compositionWeight = 0.3;

    // Policy: Symmetry weight (0.2)
    const symmetryScore = props.symmetry_score || 0;
    const symmetryWeight = 0.2;

    // Policy: Subject clarity weight (0.3)
    const subjectScore = props.subject_score || 0;
    const subjectWeight = 0.3;

    // Policy: Lighting quality weight (0.2)
    const lightingScore = props.lighting_score || 0;
    const lightingWeight = 0.2;

    const totalScore =
      compositionScore * compositionWeight +
      symmetryScore * symmetryWeight +
      subjectScore * subjectWeight +
      lightingScore * lightingWeight;

    return totalScore;
  }

  /**
   * Rank images by hero score (descending).
   * @param {Array} images - Array of image nodes
   * @returns {Array} - Ranked images (highest score first)
   */
  rankByHeroScore(images) {
    return [...images].sort((a, b) => {
      const scoreA = this.calculateHeroScore(a);
      const scoreB = this.calculateHeroScore(b);
      return scoreB - scoreA; // Descending
    });
  }

  /**
   * Select top N images by hero score.
   * @param {Array} images - Array of image nodes
   * @param {number} limit - Maximum number to select
   * @returns {Array} - Top N images
   */
  selectTopHero(images, limit = 1) {
    const ranked = this.rankByHeroScore(images);
    return ranked.slice(0, limit);
  }
}

module.exports = { RankingPolicy };
