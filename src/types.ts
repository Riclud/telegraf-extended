import { Context } from "telegraf";

export type R = Record<string, any>;

type ContextUtil<C extends Context, S extends R> = C & {
  action: { state: S };
};

export interface IAction<
  C extends Context = Context,
  S extends R = R,
  P extends R = R
> {
  send(ctx: ContextUtil<C, S>, payLoad?: P): void | Promise<void>;
  filter?(ctx: ContextUtil<C, S>): boolean | Promise<boolean>;
  result?(ctx: ContextUtil<C, S>): void | Promise<void>;
}

export interface IActionMachine {
  enter: <P extends R = R>(name: string, payLoad?: P) => void;
  clearState: () => void;
  state: R;
}
