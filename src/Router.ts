import * as History from 'history';
import * as r from 'rxjs';

export interface Router {
  route$: r.Observable<string>;
  navigator: Navigator;
}

export interface Navigator {
  push: (path: string) => void;
  replace: (path: string) => void;
  go: (n: number) => void;
  goBack: () => void;
  goForward: () => void;
}

export const createRouter = (): Router => {
  const history = History.createBrowserHistory();
  const route$ = new r.Subject<string>();
  history.listen(location => route$.next(location.pathname));
  route$.next(history.location.pathname)
  return {
    route$,
    navigator: history,
  }
}

export const createMockRouter = (initialRoute: string): Router => {
  const sessionHistory: string[] = [initialRoute];
  let sessionHistoryIndex = 0;
  const route$ = new r.Subject<string>();
  route$.subscribe((route) => {
    sessionHistory[sessionHistoryIndex + 1] = route;
    sessionHistoryIndex++;
  });
  route$.next(initialRoute);
  const go = (n: number): void => {
    if (
      sessionHistoryIndex + n >= 0
      && sessionHistoryIndex + n < sessionHistory.length
    ) {
      sessionHistoryIndex += n;
      route$.next(sessionHistory[sessionHistoryIndex]);
    }
  };
  const navigator: Navigator = {
    push: route$.next,
    replace: route$.next,
    go,
    goBack: () => go(-1),
    goForward: () => go(1),
  };
  return {
    route$: route$,
    navigator,
  }
}
