import {
    home as types,
    commonType
} from "js/redux/constants/index";

export function fetchBlogs() {
    return function (dispatch) {
        dispatch({
            type: types.FETCH
        });
        $.ajax({
            url: "/api/get",
            type: "GET",
            success: function (resp) {
                dispatch({
                    type: types.FETCH_SUCCESS,
                    blogs: resp
                });
            }
        });
    };
}
