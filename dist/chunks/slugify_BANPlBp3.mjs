import kebabcase from 'lodash.kebabcase';
import slugify from 'slugify';

const hasNonLatin = (str) => /[^\x00-\x7F]/.test(str);
const slugifyStr = (str) => {
  if (hasNonLatin(str)) {
    return kebabcase(str);
  }
  return slugify(str, { lower: true });
};
const slugifyAll = (arr) => arr.map((str) => slugifyStr(str));

export { slugifyAll as a, slugifyStr as s };
