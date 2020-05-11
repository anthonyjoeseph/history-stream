import { createMockRouter } from "../src/Router";

describe('Router', () => {
  it('Has Mock Router', () => {
    const router = createMockRouter();
    router.navigator.push('/');
    const routeHistory: string[] = [];
    router.route$.subscribe(r => {
      routeHistory.push(r)
    })
    router.pushCurrentRoute();
    expect(routeHistory[0] === '/').toBeTruthy();
    router.navigator.push('newRoute');
    expect(routeHistory[1] === 'newRoute').toBeTruthy();
  });
});