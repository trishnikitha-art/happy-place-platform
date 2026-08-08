/**
 * Selection Policy — Hero and Gallery Selection Rules
 *
 * Constitutional decision-making for hero and gallery selection.
 * Separated from projection logic to allow policy evolution without
 * projection code changes.
 */

class SelectionPolicy {
  constructor() {
    this.name = "SelectionPolicy";
  }

  /**
   * Determine if an image qualifies for gallery inclusion.
   * @param {Object} image - Image node from graph
   * @returns {boolean} - Whether image should be in gallery
   */
  qualifiesForGallery(image) {
    const props = image.properties || image.data || {};

    // Policy: Gallery requires explicit gallery role or high subject score
    if (props.role === "gallery" || props.category === "gallery") return true;

    // Policy: Gallery candidate flag
    if (props.gallery_candidate === true) return true;

    // Policy: Subject score threshold for gallery inclusion
    if (props.subject_score && props.subject_score > 0.5) return true;

    return false;
  }

  /**
   * Determine if an image qualifies for hero selection.
   * @param {Object} image - Image node from graph
   * @returns {boolean} - Whether image qualifies for hero
   */
  qualifiesForHero(image) {
    const props = image.properties || image.data || {};

    // Policy: Hero requires explicit hero role
    if (props.role === "hero" || props.category === "hero") return true;

    // Policy: Featured candidate flag
    if (props.featured_candidate === true) return true;

    return false;
  }

  /**
   * Filter images by gallery policy.
   * @param {Array} images - Array of image nodes
   * @returns {Array} - Gallery-qualified images
   */
  filterGallery(images) {
    return images.filter((img) => this.qualifiesForGallery(img));
  }

  /**
   * Filter images by hero policy.
   * @param {Array} images - Array of image nodes
   * @returns {Array} - Hero-qualified images
   */
  filterHero(images) {
    return images.filter((img) => this.qualifiesForHero(img));
  }
}

module.exports = { SelectionPolicy };
