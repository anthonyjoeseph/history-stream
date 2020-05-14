import * as assert from 'assert';
import * as r from 'rxjs';
import * as ro from 'rxjs/operators';
import { createMockRouter } from "../src/Router";

describe('Router', () => {
  it('Has Mock Router', async () => {
    const router = createMockRouter();

    const closeRouter = new r.Subject();
    const routeHistory = router.route$
      .pipe(
        ro.takeUntil(closeRouter),
        ro.toArray(),
      )
      .toPromise();
    
    router.navigator.push('/');
    router.navigator.push('newRoute');
    router.pushCurrentRoute();

    closeRouter.next();
    await routeHistory.then(r => assert.deepStrictEqual(
      r,
      ['/', 'newRoute', 'newRoute'],
    ))
  });
});