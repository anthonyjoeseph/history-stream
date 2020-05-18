# rxjs-first-router

A simpler, mockable take on [redux-first-router](https://github.com/faceyspacey/redux-first-router) using [reactive streams](https://rxjs-dev.firebaseapp.com/)

Supports the [window.history api](https://developer.mozilla.org/en-US/docs/Web/API/Window/history) with cross-browser support from [history](https://github.com/ReactTraining/history)

# Interfaces

| Interface | Usage |
|-----------|-------|
| `Router` | An Object containing a `Navigator`, an [`Observable<string>`](https://rxjs-dev.firebaseapp.com/guide/observable) that pushes out new routes as they occur, and a function to push the current route through the observable |
| `Navigator` | An object with different methods to change the current route. Based on [history's navigation interface](https://github.com/ReactTraining/history/blob/master/docs/Navigation.md) |

```tsx
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
```

# Functions

| Name | Usage |
|------|-------|
| `createRouter` | Creates a router connected to the browser through [`history.createBrowserHistory()`](https://github.com/ReactTraining/history/blob/master/docs/GettingStarted.md) |
| `createMockRouter` | Creates a mock router that directly pushes routes from its `Navigator` to its `route$` |

```tsx

export const createRouter: () => Router
export const createMockRouter: () => Router

```

# TODO

- add leading slashes to routes in mock navigate
- support [async iterables](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of)
- support [@most/core](https://github.com/cujojs/most)
- change name to 'history-async'
