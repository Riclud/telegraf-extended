import { Context } from "telegraf";

export type R = Record<string, any>;

export type ContextUtil<C extends Context, S extends R> = C & {
  action: { state: S };
};

export type ActionContext<
  C extends Context = Context,
  S extends R = R,
  P extends R = R
> = {
  send(ctx: ContextUtil<C, S>, payLoad?: P): unknown | Promise<unknown>;
  filter?(ctx: ContextUtil<C, S>): boolean | Promise<boolean>;
  result?(ctx: ContextUtil<C, S>): unknown | Promise<unknown>;
};

export type ActionMachineContext<N extends string = string> = {
  enter<P extends R = R>(name: N, payLoad?: P): void;
  clearState(): void;
  state: R;
};
