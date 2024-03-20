import { Context } from "telegraf";
import type { IAction, IActionMachine } from "./types";

export class ActionMachine<C extends Context & { action: IActionMachine }> {
  private actions = new Map<string, IAction<C>>();
  private chats = new Map<number, { actionID: string }>();
  private states = new Map<number, Record<string, string>>();

  middleware() {
    return (ctx: C, next: Function) => {
      const chatID = ctx.chat?.id;
      if (!chatID) return;

      this.inject(ctx, chatID);
      this.hander(ctx, next, chatID);
    };
  }

  private inject(ctx: C, chatID: number) {
    const actionContext: IActionMachine = {
      enter: (name, payLoad) => {
        const action = this.actions.get(name);

        if (action) {
          this.chats.set(chatID, { actionID: name });

          action.send(ctx, payLoad);
        }

        return { next: (fn: Function) => fn() };
      },

      clearState: () => this.states.set(chatID, {}),

      state: {},
    };

    Object.defineProperty(actionContext, "state", {
      get: () => {
        const state = this.states.get(chatID);

        if (state) {
          return state;
        }

        return this.states.set(chatID, {}).get(chatID);
      },
    });

    ctx.action = actionContext;
  }

  private async hander(ctx: C, next: Function, chatID: number) {
    const chat = this.chats.get(chatID);

    if (!chat) {
      return next();
    }

    const action = this.actions.get(chat.actionID)!;

    if (action.filter) {
      const filterVerdict = await action.filter(ctx);

      if (!filterVerdict) {
        return;
      }
    }

    action.result && (await action.result(ctx));
    this.chats.delete(chatID);

    next();
  }

  createAction<P extends Record<string, string>>(
    name: string,
    actionClass?: IAction
  ) {
    const action: IAction<C, P> = actionClass || {
      send: () => {},
    };

    this.actions.set(name, action);

    return action;
  }
}
