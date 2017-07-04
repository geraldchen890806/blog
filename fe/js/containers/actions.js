import {
    commonType
} from "js/redux/constants";

export function fetchBlogs() {
    return function (dispatch) {
        dispatch({
            type: commonType.FETCHING_BLOGS
        });
        $.ajax({
            url: "/api/get",
            type: "GET",
            success: function (resp) {
                dispatch({
                    type: commonType.FETCHING_BLOGS_SUCCESS,
                    blogs: resp
                });
            }
        });
    };
}
