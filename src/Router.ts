import * as History from 'history';
import * as r from 'rxjs';

export interface Router {
  route$: r.Observable<string>;
  navigator: Navigator;
  pushCurrentRoute: () => void;
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
  return {
    route$,
    navigator: history,
    pushCurrentRoute: (): void => route$.next(history.location.pathname),
  }
}

export const createMockRouter = (): Router => {
  const sessionHistory: string[] = [];
  let sessionHistoryIndex = -1;
  const route$ = new r.Subject<string>();
  route$.subscribe((route) => {
    sessionHistory[sessionHistoryIndex + 1] = route;
    sessionHistoryIndex++;
  });
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
    push: r => route$.next(r),
    replace: r => route$.next(r),
    go,
    goBack: () => go(-1),
    goForward: () => go(1),
  };
  return {
    route$: route$,
    navigator,
    pushCurrentRoute: (): void => {
      if (sessionHistoryIndex < sessionHistory.length) {
        route$.next(sessionHistory[sessionHistoryIndex]);
      }
    }
  }
}
