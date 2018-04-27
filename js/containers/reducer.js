import { commonType } from 'js/redux/constants';
import Blogs from 'resources/blogs';
console.log(Blogs);
const initialState = {
  blogs: Blogs,
  loading: false,
};

export default function todos(state = initialState, action) {
  switch (action.type) {
    // case commonType.FETCHING_BLOGS:
    //   return {
    //     ...state,
    //     blogs: [],
    //     loading: true,
    //   };
    // case commonType.FETCHING_BLOGS_SUCCESS:
    //   return {
    //     ...state,
    //     blogs: Blogs,
    //     loading: false,
    //   };
    default:
      return state;
  }
}
