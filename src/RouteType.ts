// NavigationRequest ADT
// Generated with fp-ts-codegen
// https://gcanti.github.io/fp-ts-codegen/

/**
 * data RouteType = push | pop | replace
 */

import { Eq, fromEquals } from "fp-ts/lib/Eq";

export class RouteType {
  public constructor(readonly type: "push" |  "pop" | "replace") {}

  public static push: RouteType = new RouteType("push");

  public static pop: RouteType = new RouteType("pop");
  
  public static replace: RouteType = new RouteType("replace");

  public fold<R>(handlers: {
    onpush: () => R;
    onpop: () => R;
    onreplace: () => R;
  }): R {
    switch (this.type) {
      case "push": return handlers.onpush();
      case "pop": return handlers.onpop();
      case "replace": return handlers.onreplace();
    }
  }

  public static getEq(): Eq<RouteType> {
    return fromEquals((x, y) => {
      if (x.type === "push" && y.type === "push") {
        return true;
      } if (x.type === "pop" && y.type === "pop") {
        return true;
      } if (x.type === "replace" && y.type === "replace") {
        return true;
      } return false;
    });
  }
}
