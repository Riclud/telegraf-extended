import { Context } from "telegraf";

export interface IAction<
  C extends Context = Context,
  P extends Record<string, string> = Record<string, string>
> {
  send(ctx: C, payLoad?: P): void | Promise<void>;
  filter?(ctx: C): boolean | Promise<boolean>;
  result?(ctx: C): void | Promise<void>;
}

export interface IActionMachine {
  enter: <P extends Record<string, string> = Record<string, string>>(
    name: string,
    payLoad?: P
  ) => { next: (fn: Function) => void };
  clearState: () => void;
  state: Record<string, string>;
}
