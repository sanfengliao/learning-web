// A random number between [min and max)
// With 1 argument it will be [0 to min)
// With no arguments it will be [0 to 1)
export const rand = (min = 0, max = 1) => {
  if (max === undefined) {
    // biome-ignore lint: reason
    max = min;
    // biome-ignore lint: reason
    min = 0;
  }
  return min + Math.random() * (max - min);
};
