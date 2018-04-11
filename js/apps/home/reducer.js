import {
    home as types,
    commonType
} from "js/redux/constants";
const initialState = {
    items: [],
    isFetching: false,
};

export default function todos(state = initialState, action) {
    switch (action.type) {
    default:
        return state;
    }
}
