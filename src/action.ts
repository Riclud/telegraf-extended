import { Context } from "telegraf";
import type { R, ActionContext } from "./types";

export class Action<C extends Context, S extends R = R, P extends R = R> {
  private fns: ActionContext<C, S, P> = {
    send: () => {},
  };

  send(fn: ActionContext<C, S, P>["send"]) {
    this.fns.send = fn;
    return this;
  }

  filter(fn: ActionContext<C, S, P>["filter"]) {
    this.fns.filter = fn;
    return this;
  }

  result(fn: ActionContext<C, S, P>["result"]) {
    this.fns.result = fn;
    return this;
  }
}
