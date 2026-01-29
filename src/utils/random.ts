/**
 * Micropolis Random Number Generator
 * Based on the original Micropolis random implementation
 */

export class Random {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
  }

  /**
   * Set the random seed
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }

  /**
   * Get the current seed
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Generate a random 16-bit value (0-65535)
   */
  getRandom16(): number {
    // Linear congruential generator
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return (this.seed >> 16) & 0xffff;
  }

  /**
   * Generate a signed random 16-bit value (-32768 to 32767)
   */
  getRandom16Signed(): number {
    const val = this.getRandom16();
    return val > 32767 ? val - 65536 : val;
  }

  /**
   * Generate a random value in range [0, range]
   */
  getRandom(range: number): number {
    const maxMultiple = Math.floor(0xffff / (range + 1)) * (range + 1);
    let val: number;
    do {
      val = this.getRandom16();
    } while (val >= maxMultiple);
    return val % (range + 1);
  }

  /**
   * Generate an exponentially distributed random value
   * Values near 0 are more likely than values near limit
   */
  getERandom(limit: number): number {
    let x = this.getRandom(limit);
    let y = this.getRandom(limit);
    return Math.min(x, y);
  }

  /**
   * Randomly seed from current time
   */
  randomlySeed(): void {
    this.seed = Date.now() ^ (Math.random() * 0xffffffff);
  }

  /**
   * Get a random boolean with given probability of true
   */
  chance(probability: number): boolean {
    return Math.random() < probability;
  }

  /**
   * Pick a random element from an array
   */
  pick<T>(array: T[]): T {
    return array[this.getRandom(array.length - 1)];
  }

  /**
   * Shuffle an array in place
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.getRandom(i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

// Global random instance
export const random = new Random();
