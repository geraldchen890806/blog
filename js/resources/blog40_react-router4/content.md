
最近在做react-router升级到4.x的工作 记录下具体步骤吧

### 项目中使用了redux，以下只对react+redux框架的使用者有点参考意义

#### 使用到的包 react-router可以删除了
```js
"query-string": "^4.3.4",
"react-router-dom": "4.1.1",
"react-router-redux": "5.0.0-alpha.6"
```

#### app.js(route)
```js
import { Route, Redirect } from 'react-router-dom';
import queryString from 'query-string';
import { ConnectedRouter } from 'react-router-redux';
import { store } from 'js/redux/store'; //创建store
import history from 'js/redux/middleware/history'; //因为多个地方使用history
export default class App extends Component {
  constructor(props) {
    super(props);
    this.checkAndrender = this.checkAndrender.bind(this);
  }
  componentDidMount() {
    let { actions } = this.props;
    actions.fetchBlogs();
  }
  // 重点
  // react-router4不再parse location.history 而且没有params|routerParams了
  // 所以想无缝切换 你需要这个方法
  // https://github.com/ReactTraining/react-router/issues/4410
  checkAndrender(Comp, props) {
    let { history: { location = {} }, match = {} } = props;
    props = {
      ...props,
      history: {
        ...location,
        query: queryString.parse(location.search)
      },
      params: {
        ...match.params
      },
      routeParams: {
        ...match.params
      },
      location: {
        ...props.location,
        query: queryString.parse(location.search)
      }
    };
    return <Comp {...props} />;
  }
  render() {
    return (
      <ConnectedRouter history={history}>
        <div>
          <Header />
          <div className="main">
            <div className="mainContent">
              <Route exact path="/" render={() => <Redirect to="/home" />} />
              <Route path="/home" render={props => this.checkAndrender(Home, props)} />
            </div>
            <Side {...this.props} />
          </div>
        </div>
      </ConnectedRouter>
    );
  }
}

```

### 因为多个地方使用到history

#### js/redux/middleware/history

```js

import createHistory from 'history/createBrowserHistory';
const history = createHistory();
history.listen((location, action) => {
  console.log(action, location.pathname, location.state);
});
export default history;
```

#### js/redux/store

```js
import { routerMiddleware } from 'react-router-redux';
const store = createStore(
  combineReducers({
    ...reducers,
    router: routerReducer
  }),
  applyMiddleware(routerMiddleware(history), ...)
)
```

### 业务代码跟以前一样 基本只需要替换history.push

```js
import history from 'js/redux/middleware/history'; //因为多个地方使用history
history.push('xxx')
```
//替换之前
```js
import {browserHistory} from 'react-router';
browserHistory.push('xxx')

```
