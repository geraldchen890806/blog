import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Route } from 'react-router-dom';
import queryString from 'query-string';
import { ConnectedRouter } from 'react-router-redux';

import history from 'js/redux/middleware/history';

const navs = [{
  url: '/',
  component: () =>
    import(/* webpackChunkName: "home" */ 'js/apps/home')
},{
  url: '/home',
  component: () =>
    import(/* webpackChunkName: "home" */ 'js/apps/home')
}, {
  url: '/recommend',
  component: () =>
    import(/* webpackChunkName: "Recommend" */ 'js/apps/recommend')
}, {
  url: '/blog/:id',
  component: () =>
    import(/* webpackChunkName: "Blog" */ 'js/apps/blog/view')
}, {
  url: '/tag/:tag',
  component: () =>
    import(/* webpackChunkName: "Tag" */ 'js/apps/tag')
}]

import Header from './header';
import Side from './side';

let globalComponents = {};

@connect(
  (state) => ({
    ...state.common,
  })
)
export default class App extends Component {
  checkAndRender = (Comp, props) => {
    const { history: { location = {} }, match = {} } = props;
    const nProps = {
      ...props,
      history: {
        ...location,
        query: queryString.parse(location.search),
      },
      params: {
        ...match.params,
      },
      routeParams: {
        ...match.params,
      },
      location: {
        ...props.location,
        query: queryString.parse(location.search),
      },
    };
    if (_.isFunction(Comp) && !Comp.propTypes) {
      return (
        <Bundle load={Comp()} pathname={location.pathname}>
          {() => {
            const CUR = globalComponents[location.pathname];
            return <CUR {...props} />;
          }}
        </Bundle>
      );
    }

    return <Comp {...nProps} />;
  }
  
  state = {}

  loadRjm(){
    import(/* webpackChunkName: "Rjm" */ 'js/apps/rjm').then(mod => {
      this.setState({
        RjmComp: mod.default ? mod.default : mod
      })
    })
  }

  componentDidMount(){
    if (['xn--boqs2g85v.xn--6qq986b3xl','任加敏.我爱你', 'jiamin.ren'].includes(location.host)) { // 任加敏.我爱你
      this.loadRjm();
    }
  }

  render() {
    const { RjmComp } = this.state;
    if (['xn--boqs2g85v.xn--6qq986b3xl','任加敏.我爱你', 'jiamin.ren'].includes(location.host)) { // 任加敏.我爱你
      return RjmComp ? <RjmComp /> : null;
    }
    return (
      <ConnectedRouter history={history}>
        <div>
          <Header />
          <div className="main">
            <div className="mainContent">
              {navs.map(nav => {
                return <Route
                  exact
                  key={nav.url}
                  path={nav.url}
                  render={props =>
                    this.checkAndRender(nav.component, props)
                  }
                />
              })}
              {/* <Route exact path="/" render={(props) => this.checkAndrender(Home, props)} />
              <Route path="/home" render={(props) => this.checkAndrender(Home, props)} />
              <Route path="/recommend" render={(props) => this.checkAndrender(Recommend, props)} />
              <Route path="/about" render={(props) => this.checkAndrender(About, props)} />
              <Route path="/blog/new" render={(props) => this.checkAndrender(BlogNew, props)} />
              <Route path="/blog/:id" render={(props) => this.checkAndrender(Blog, props)} />
              <Route path="/blog/:id/edit" render={(props) => this.checkAndrender(BlogNew, props)} />
              <Route path="/tag/:tag" render={(props) => this.checkAndrender(Tag, props)} /> */}
            </div>
            <Side {...this.props} />
          </div>
        </div>
      </ConnectedRouter>
    );
  }
}



class Bundle extends Component {
  state = {
    mod: null
  };

  componentWillMount() {
    this.load(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.load !== this.props.load) {
      this.load(nextProps);
    }
  }

  load(props) {
    if (globalComponents[props.pathname]) {
      this.setState({
        mod: globalComponents[props.pathname]
      });
      return;
    }
    this.setState({
      mod: null
    });

    // import
    if (props.load.then) {
      props.load.then(mod => {
        globalComponents[props.pathname] = mod.default ? mod.default : mod;
        this.setState({
          mod: mod.default ? mod.default : mod
        });
      });
      return;
    }

    // bundle loader
    props.load(mod => {
      globalComponents[props.pathname] = mod.default ? mod.default : mod;
      this.setState({
        // handle both es imports and cjs
        mod: mod.default ? mod.default : mod
      });
    });
  }

  render() {
    return this.state.mod ? this.props.children(this.state.mod) : null;
  }
}
