import * as assert from 'assert';
import * as r from 'rxjs';
import * as ro from 'rxjs/operators';
import { createMockRouter, Router, createRouter } from "../src/Router";

const testRouter = async (router: Router): Promise<void> => {
  const closeRouter = new r.Subject();
  const routeHistory = router.route$
    .pipe(
      ro.takeUntil(closeRouter),
      ro.toArray(),
    )
    .toPromise();
  
  router.navigator.push('/');
  router.navigator.push('/newRoute');
  router.pushCurrentRoute();

  closeRouter.next();
  await routeHistory.then(r => assert.deepStrictEqual(
    r,
    ['/', '/newRoute', '/newRoute'],
  ))
}

describe('Router', () => {
  const domRouter = createRouter();
  const mockRouter = createMockRouter();
  it('Has DOM Router', async () => testRouter(domRouter));
  it('Has Mock Router', async () => testRouter(mockRouter));
});