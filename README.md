# fp-ts-routing-redux

This library presents three differrent integrations of fp-ts-routing into redux. Listed in order of increasing purity, they are `routeMiddleware`, `routeObservable`, and `routeStream`. `navigationMiddleware` is the only provided integration for navigation

# Philosophy

The goal of this library is to represent routes in state, in the purely functional spirit of fp-ts-routing

`Redux` is the purest state management system at the time of publication*

Additionally, `Redux` manages a single [global state](https://redux.js.org/api/store), and since the current route is a global value, this is a good fit

On top of that, `Redux` and `fp-ts-routing` use ADTs in a usefully composable way (`RouteAction`s and `NavigationAction`s can compose `Route`s), so it's a really good fit 

`Redux` manages a function from some arbitrary ADT to a state transformation

```
ADT => State => State
```

Except it's old so it's not curried so it looks like this instead

```ts
const myReducer: (s: State, a: ADT) => State = ...
```

This function is [called the `reducer`](https://redux.js.org/basics/reducers), and the ADT is [called an Action](https://redux.js.org/basics/actions). Your reducer, along with initial state, is given to a simple state manager [called the `store`](https://redux.js.org/api/store)

```ts
const store = createStore(myReducer, initialState);
```

Doing this:

```ts
store.dispatch(someActionADT)
```

Will invoke our `reducer` and trigger a global state transformation. This allows us to encapsulate our app's side effects into our `reducer`

## Our example application's ADTs

| ADT | Usage |
|-----|-------|
| `MyRoute` | Used by `fp-ts-routing` to represent a route the browser can point to |
| `MyState` | Used by `Redux` to represent your app's global state |
| `MyAction` | Used by `Redux` to represent a state transformation |
| `RouteAction` | Used by `fp-ts-routing-redux` to represent a route event that can transform state with `Redux` |
| `ResponseAction` | Will be used later by `redux-observable` to represent the response of a `fetch` that can transform state with `Redux` |
| `Navigation` | Will be used later by `fp-ts-routing-redux` to represent a change to the browser's current URL |

For the sake of sanity, we will implement these ADTs using [morphic-ts](https://github.com/sledorze/morphic-ts)

```ts
import { makeADT, ofType } from '@morphic-ts/batteries/lib/summoner-BASTJ'
import { Navigation } from 'fp-ts-routing-redux'

// define our app's ADTs

const _MyRoute = makeADT('type')({
  ...
  notFound: ofType<{}>(),
});
type MyRoute = typeof _MyRoute

const _RouteAction = makeADT('type')({
  ...
  route: ofType<MyRoute>(),
})
type RouteAction = typeof _RouteAction
const _ResponseAction = makeADT('type')({
  ...
  data: ofType<...>(),
})
type ResponseAction = typeof _ResponseAction
const _MyAction = makeADT('type')({
  ...
  routeAction: ofType<RouteAction>(),
  responseAction: ofType<ResponseAction>(),
  navigationAction: ofType<Navigation<MyRoute>>(),
});
type MyAction = typeof _MyAction

interface MyState {
  ...
  currentRoute: MyRoute;
}
```

## Handling route events with `Redux` middleware

Redux can accept middlewares. This is a good fit for our router

```ts
import { createStore, applyMiddleware } from 'redux'
import * as R from 'fp-ts-routing';
import { routeMiddleware } from 'fp-ts-routing-redux'

// handle our app's routing

const myParser = R.zero<MyRoute>().map(...);
const myDefaultRoute = _MyRoute.of.notFound({});
const initialState = {
  ...
  currentRoute: MyRoute.notFound({}),
}

const myReducer = (state: MyState, action: MyAction) => MyAction.match({
  ...,
  routeAction: (route: MyRoute) => {...state, currentRoute: route},
  responseAction: (newData) => {...state, data: newData},
})(action);

// will invoke the store's `dispatch` on each new route event
const myRouteMidleware = routeMiddleware<MyRoute, MyAction>(
  myParser,
  myDefaultRoute,
  (r: MyRoute): MyAction => _MyAction.of.responseAction(...),
);

const store = createStore(
  myReducer,
  initialState,
  applyMiddleware(myRouteMidleware),
);
```

However, we often want to trigger asynchronous code as a result of a route event, which we are unable to do in our reducer

We must consider `redux` asynchronous middlewares

## Triggering asynchronous side-effects from route events with `redux-observable`

`redux-observable` is the `redux` asynchronous middleware that best fits our usage**

`redux-observable` ties `redux` together with `rxjs` (the [best](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/mapping/highland/whyrx.md) streaming solution in typescript) with [`Epic`](https://redux-observable.js.org/docs/basics/Epics.html)s that return `Observable`s that are in turn subscribed to your `store`'s `dispatch` with middleware

In fact, since our `router` is naturally an `Observable`, we can replace our `routeMiddleware` with a `routeObservable`. We can return `routeObservable` from our `Epic` to subscribe our `RouteAction`s to our `dispatch`

(`RouteType` is just a wrapper for a [`history` `action`](https://github.com/ReactTraining/history/blob/master/docs/GettingStarted.md#listening) with a less confusing name in this context)

```ts
import * as Rx from 'rxjs'
import {
  Epic,
  createEpicMiddleware,
} from 'redux-observable'
import { routeObservable, RouteType } from 'fp-ts-routing-redux';

const myRouteObservable: Rx.Observable<ResponseAction> = routeObservable<MyRoute>(
  parser,
  notFoundRoute
).pipe(
  Rx.map(([route]: [MyRoute, RouteType]): MyAction => _RouteAction.of.route(route)),
  Rx.map(
    (action: RouteAction): Observable<Response> => fromFetch(
      'https://jsonplaceholder.typicode.com/posts/1',
    ),
  ),
  Rx.mergeAll(),
  Rx.map((resp: Response): ResponseAction => _ResponseAction.of....)
);

const myRouteEpic: Epic<
  MyAction, ResponseAction, MyState
> = (): Rx.Observable<ResponseAction> => myRouteObservable;

const myEpicMiddleware = createEpicMiddleware();

const store = createStore(
  myReducer,
  applyMiddleware(myEpicMiddleware)
);

epicMiddleware.run(myRouteEpic);
```

If we want to have other asynchonous side effects, `Epic`s represent your `redux` `state` and `action` as `Observable`s called `$state` and `$action`. We can merge `routeObservable` with whatever `Observable`s you need

```ts
const myRouteEpic: Epic<MyAction, MyAction, MyState> = (
  action$: Rx.Observable<MyAction>,
): Rx.Observable<MyAction> => Rx.merge(
  myRouteObservable,
  action$.pipe(
    // your other asynchronous code
    Rx.filter(...),
    ...
  ),
);
```

This is still impure. We are using side effects without safely demarcating them as IO. How would we mock this for testing?

## Triggering asynchronous side-effects from route events with `@matechs/epics`

`@matechs/effect` is part of the `fp-ts` ecosystem that borrows concepts from scala ZIO that allow us to invoke syncronous and asynchronous side effects with `Effect`s purely by separating them from their environments using `Provider`s

A `Stream` is an `Effect`ful `Observable` 

Our `routeStream` is a `Stream` that accepts a `NavigationProvider`

`@matechs-epics` allows us to represent our `redux-observable` `Epic` as a `Stream`

So our `routeStream` is a `Stream` that, alongside our `NavigationProvider`, goes inside an `Epic` that goes inside `redux-observable` middleware that goes inside `redux`

```ts
import { stream as S, effect as T } from '@matechs/effect';
import * as Ep from '@matechs/epics';

const fetchUser = Ep.epic<MyState, MyAction>()((_, action$) =>
// TODO - implement this
// https://arnaldimichael.gitbook.io/matechs-effect/core/the-effect-system
// https://arnaldimichael.gitbook.io/matechs-effect/core/play-with-streams
// https://github.com/Matechs-Garage/matechs-effect/blob/master/packages/epics/tests/Epics.test.ts
```

We are able to easily mock our `NavigationProvider` for testing

```ts
import * as assert from "assert";
// TODO - implement this
assert.deepStrictEqual(TBD)
```

## Rerouting with redux

Since rerouting is simply a `dispatch`ed side effect, we represent it as its own redux middleware

We can use an `NavigationProvider` to separate the middleware from its side effect. The default `NavigationProvider` is `HistoryNavigationProvider`, but lets roll our own for testing purposes

```ts
import * as O from 'fp-ts/lib/Option'
import * as assert from "assert";
import { compose } from 'redux'
import { createStore, applyMiddleware, compose } from 'redux'

const formatter: (r: MyRoute) => string = MyRoute.match({ ... });

const testNavigationProvider = TBD;

const myNavigationMiddlware = navigationMiddleware<MyRoute, MyAction>(
  formatter,
  (routeAction: MyAction): O.Option<Navigation<MyRoute>> => MyAction.is.RouteAction(routeAction)
    ? O.some(Navigation.push(routeAction.route))
    : O.none,
  testNavigationProvider,
);

const store = createStore(
  myReducer,
  compose(
    applyMiddleware(myEpicMiddleware),
    applyMiddleware(myNavigationMiddleware),
  ),
);

epicMiddleware.run(myRouteEpic);

// run some tests
assert.deepStrictEqual(TBD)
```

Note: we must use separate `RouteAction`s and `navgiationAction`s so that our `RouteAction`s don't dispatch `navigationAction`s. `RouteActions`s are for storing the current route in global state, `navigationAction`s are for modifying the brower's url. `navigationAction`s should dispatch `RouteAction`s, but not the other way around.

\* `Redux` uses function composition, while [`Flux` uses callback registration](https://stackoverflow.com/questions/32461229/why-use-redux-over-facebook-flux). `Redux` state is immutable, while [`Mobx` state is mutable](https://mobx-react.js.org/state-mutable).

\** `redux-thunk` accepts any function, while `redux-observable` enforces purity by requiring your impure asynchronous function to be demarcated as an `Observer`. `redux-saga` has a similar approach using [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*), but [`Observable`s are monadic](https://github.com/gcanti/fp-ts-rxjs). `redux-loop`, rather than being a middleware, allows the reducer itself to behave asynchronously, but `Cmd` has no way to compose with outside event streams, which is what our router must do.