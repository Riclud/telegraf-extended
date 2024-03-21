import { Context } from "telegraf";
import type { IAction, IActionMachine, R } from "./types";

export class ActionMachine<C extends Context & { action: IActionMachine }> {
  private actions = new Map<string, IAction<C>>();
  private chats = new Map<number, { actionID: string }>();
  private states = new Map<number, R>();

  middleware() {
    return async (ctx: C, next: Function) => {
      const chatID = ctx.chat?.id;
      if (!chatID) return;

      this.inject(ctx, chatID);
      this.handler(ctx, next, chatID);
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
      set: (value) => {
        this.states.set(chatID, value);
      },
    });

    ctx.action = actionContext;
  }

  private async handler(ctx: C, next: Function, chatID: number) {
    const chat = this.chats.get(chatID);

    if (!chat) {
      return await next();
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

    return await next();
  }

  createAction<S extends R = R, P extends R = R>(
    name: string,
    actionClass?: IAction
  ) {
    const action: IAction<C, S, P> = actionClass || {
      send: () => {},
    };

    this.actions.set(name, action);

    return action;
  }
}
