import createHistory from 'history/createBrowserHistory';
const history = createHistory();
history.listen((location, action) => {
  // location is an object like window.location
  console.log(action, location.pathname, location.state);
});
export default history;
