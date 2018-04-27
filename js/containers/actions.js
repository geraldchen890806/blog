import { commonType } from 'js/redux/constants';

export function fetchBlogs() {
  return function (dispatch) {
    dispatch({
      type: commonType.FETCHING_BLOGS,
    });
    // if (!navigator.onLine) {
    //   dispatch({
    //     type: commonType.FETCHING_BLOGS_SUCCESS,
    //     blogs: [],
    //   });
    // }
    $.ajax({
      url: '/api/get',
      type: 'GET',
      success(resp) {
        dispatch({
          type: commonType.FETCHING_BLOGS_SUCCESS,
          blogs: resp,
        });
      },
      error: () => {
        dispatch({
          type: commonType.FETCHING_BLOGS_SUCCESS,
          blogs: [],
        });
      },
    });
  };
}
