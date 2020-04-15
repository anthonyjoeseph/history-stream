import * as O from 'fp-ts/lib/Option';
import { flow } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
// import { stream as S, effect as T } from '@matechs/effect';
import {
  Middleware,
  MiddlewareAPI,
  Dispatch,
  Action,
  Store,
} from 'redux';
import * as History from 'history';
import { Navigation } from './Navigation';
import { RouteType } from './RouteType';

const history = History.createBrowserHistory();

const historyActionToRouteType = (a: History.Action): RouteType => {
  if (a === 'PUSH') return RouteType.push;
  if (a === 'POP') return RouteType.pop;
  return RouteType.replace;
};

export const router = <R, A extends Action, S, D extends Dispatch>(
  parser: (path: string) => R,
  formatter: ((r: R) => string),
  onRoute: (route: R, getState: () => S, routeType: RouteType) => A,
  navigate: (action: A, getState: () => S) => Navigation<R>,
): {
  middleware: Middleware<{}, S, D>;
  dispatchFirstRoute: (store: Store<S, A>) => A;
} => ({
  middleware: (
    { dispatch, getState }: MiddlewareAPI<D, S>,
  ): (next: (action: A) => A) => (action: A) => A => flow(
    () => history.listen(flow(
      (location: History.Location, historyAction: History.Action) => onRoute(
        parser(location.pathname),
        getState,
        historyActionToRouteType(historyAction),
      ),
      dispatch,
    )),
    () => (next: (action: A) => A) => (action: A): A => flow(
      () => pipe(
        O.fromNullable(navigate(action, getState)),
        O.map(navigation => navigation.fold<void>({
          onpush: (route) => history.push(formatter(route).toString()),
          onreplace: (route) => history.replace(formatter(route).toString()),
          onpushExt: (route) => history.push(route),
          onreplaceExt: (route) => history.replace(route),
          ongo: (numSessions) => history.go(numSessions),
          ongoBack: () => history.goBack(),
          ongoForward: () => history.goForward(),
        })),
      ),
      () => next(action)
    )()
  )(),
  dispatchFirstRoute: (store): A => flow(
    () => parser(history.location.pathname),
    (firstRoute) => onRoute(
      firstRoute,
      store.getState,
      historyActionToRouteType(history.action),
    ),
    store.dispatch,
  )(),
})
