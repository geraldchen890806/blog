import { commonType } from 'js/redux/constants';
import Blogs from 'resources/config';

const initialState = {
  blogs: [],
  loading: false
};

export default function todos(state = initialState, action) {
  switch (action.type) {
  case commonType.FETCHING_BLOGS:
    return {
      ...state,
      blogs: [],
      loading: true
    };
  case commonType.FETCHING_BLOGS_SUCCESS:
    return {
      ...state,
      blogs: Blogs.concat(action.blogs),
      loading: false
    };
  default:
    return state;
  }
}
