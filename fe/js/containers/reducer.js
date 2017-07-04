import {
    commonType
} from "js/redux/constants";
const initialState = {
    blogs: [],
    loading: false,
};

export default function todos(state = initialState, action) {
    switch (action.type) {
    case commonType.FETCHING_BLOGS:
        return {
            blogs: [],
            loading: true
        };
    case commonType.FETCHING_BLOGS_SUCCESS:
        return {
            blogs: action.blogs,
            loading: false
        };
    default:
        return state;
    }
}
