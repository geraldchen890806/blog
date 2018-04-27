
import Blogs from 'resources/blogs';
const initialState = {
  blogs: Blogs,
  loading: false,
};

export default function todos(state = initialState, action) {
  switch (action.type) {
    default:
      return state;
  }
}
