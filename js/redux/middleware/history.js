import createHistory from 'history/createBrowserHistory';
const history = createHistory();
history.listen(() => {
  // location is an object like window.location
  // console.log(action, location.pathname, location.state);
});
export default history;
