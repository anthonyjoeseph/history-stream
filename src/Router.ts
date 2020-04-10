import {
  Middleware,
  MiddlewareAPI,
  Dispatch,
  Action,
} from 'redux';
import {
  Parser, parse, Route,
} from 'fp-ts-routing';
import * as History from 'history';
import { Navigation } from '.';
import { RouteType } from './RouteType';
import { flow } from 'fp-ts/lib/function';
import { Observable } from 'rxjs';
import { stream as S, effect as T } from '@matechs/effect';

const history = History.createBrowserHistory();

const navigate = <R>(
  formatter: ((r: R) => string),
) => (
  navigation: Navigation<R>,
): void => navigation.fold<void>({
  onpush: (route) => history.push(formatter(route).toString()),
  onreplace: (route) => history.replace(formatter(route).toString()),
  onpushExt: (route) => history.push(route),
  onreplaceExt: (route) => history.replace(route),
  ongo: (numSessions) => history.go(numSessions),
  ongoBack: () => history.goBack(),
  ongoForward: () => history.goForward(),
})

const historyActionToRouteType = (a: History.Action): RouteType => {
  if (a === 'PUSH') return RouteType.push;
  if (a === 'POP') return RouteType.pop;
  return RouteType.replace;
};

export const routeMiddleware = <R, A extends Action, S, D extends Dispatch>(
  parser: Parser<R>,
  notFoundRoute: R,
  toAction: (route: R, routeType: RouteType) => A,
): Middleware<{}, S, D> => (
  { dispatch }: MiddlewareAPI<D, S>,
): (next: (action: A) => A) => (action: A) => A => {
  history.listen(flow(
    (location, historyAction) => toAction(
      parse(parser, Route.parse(location.pathname), notFoundRoute),
      historyActionToRouteType(historyAction)
    ),
    dispatch,
  ));
  return next => (action: A): A => next(action);
}

export const routeObservable = <R>(
  parser: Parser<R>,
  notFoundRoute: R,
): Observable<[R, RouteType]> => {
  const c = new Observable<[R, RouteType]>(subscriber => {
    return history.listen((location, historyAction) => {
      subscriber.next([
        parse(parser, Route.parse(location.pathname), notFoundRoute),
        historyActionToRouteType(historyAction),
      ]);
    });
  });
  return c;
};

// TODO - implement routeStream
export const routeStream = <R>(): S.Stream<T.NoEnv, T.NoErr, number> => S.empty;

export const navigationMiddleware = <R, A extends Action, S, D extends Dispatch>(
  formatter: ((r: R) => string),
  fromAction: (action: A) => Navigation<R>,
): Middleware<{}, S, D> => () => {
  return (next: (action: A) => A) => (action: A): A => {
    flow(
      () => fromAction(action),
      navigate(formatter),
    );
    return next(action);
  };
}
