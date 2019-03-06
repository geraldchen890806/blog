import Blogs from 'resources/blogs';
const initialState = {
  blogs: Blogs,
  loading: false,
};

export default function reducer(state, action) {
  switch (action.type) {
    default:
      return initialState;
  }
}
